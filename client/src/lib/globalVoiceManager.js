import { useVoiceSession } from '@/store/voiceSessionStore';
import { socketService } from '@/lib/socket';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// ─── Config ───────────────────────────────────────────────────────────────────
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // TURN
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

const PC_CONFIG = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 15,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

const MAX_VOICE_PEERS = 19;
const VAD_INTERVAL_MS = 200;
const VAD_THRESHOLD = 18;
const ICE_THROTTLE_MS = 50;
const SPEAKING_THROTTLE_MS = 200;
const OPUS_BITRATE_MIN = 32_000;
const OPUS_BITRATE_DEFAULT = 64_000;
const OPUS_BITRATE_HIGH = 96_000;
const BITRATE_CHECK_MS = 5_000;

// ─── SDP Opus Munging ─────────────────────────────────────────
function preferOpusCodec(sdp) {
  const lines = sdp.split('\r\n');
  const mLineIdx = lines.findIndex(l => l.startsWith('m=audio'));
  if (mLineIdx === -1) return sdp;

  let opusPT = null;
  for (const line of lines) {
    const m = line.match(/^a=rtpmap:(\d+)\s+opus\//i);
    if (m) { opusPT = m[1]; break; }
  }
  if (!opusPT) return sdp;

  const mParts = lines[mLineIdx].split(' ');
  const pts = mParts.slice(3);
  const filtered = pts.filter(pt => pt !== opusPT);
  mParts.splice(3, pts.length, opusPT, ...filtered);
  lines[mLineIdx] = mParts.join(' ');

  return lines.join('\r\n');
}

function setOpusParams(sdp) {
  const lines = sdp.split('\r\n');
  let opusPT = null;
  for (const line of lines) {
    const m = line.match(/^a=rtpmap:(\d+)\s+opus\//i);
    if (m) { opusPT = m[1]; break; }
  }
  if (!opusPT) return sdp;

  const opusParams = 'maxaveragebitrate=64000;useinbandfec=1;usedtx=1;stereo=0;sprop-stereo=0;maxplaybackrate=48000;cbr=0';
  const fmtpIdx = lines.findIndex(l => l.startsWith(`a=fmtp:${opusPT}`));
  if (fmtpIdx !== -1) {
    lines[fmtpIdx] = lines[fmtpIdx] + `;${opusParams}`;
  } else {
    const rtpmapIdx = lines.findIndex(l => l.startsWith(`a=rtpmap:${opusPT}`));
    if (rtpmapIdx !== -1) {
      lines.splice(rtpmapIdx + 1, 0, `a=fmtp:${opusPT} ${opusParams}`);
    }
  }
  return lines.join('\r\n');
}

function optimizeSDP(sdp) {
  return setOpusParams(preferOpusCodec(sdp));
}

function checkDeviceQuality(stream) {
  const track = stream.getAudioTracks()[0];
  if (!track) return;
  const settings = track.getSettings();
  const label = track.label.toLowerCase();

  if (label.includes('bluetooth') || label.includes('airpod') || label.includes('buds')) {
    toast.warning('Bluetooth mic detected. Wired mic recommended for best clarity.');
  }
  if (settings.sampleRate && settings.sampleRate < 16000) {
    toast.warning(`Mic sample rate is ${settings.sampleRate}Hz (low quality).`);
  }
  if (settings.echoCancellation === false) {
    toast.info('Echo cancellation not available on this device.');
  }
  logger.info(`Mic: "${track.label}" | ${settings.sampleRate}Hz | echo=${settings.echoCancellation}`, 'DeviceGuard');
}

function attachAudio(socketId, stream) {
  const id = `studix-audio-${socketId}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('audio');
    el.id = id;
    el.autoplay = true;
    el.playsInline = true;
    el.controls = false;
    el.muted = false;
    document.body.appendChild(el);
  }
  if (el.srcObject !== stream) {
    el.srcObject = stream;
    el.play().catch(() => {});
  }
}

function detachAudio(socketId) {
  const el = document.getElementById(`studix-audio-${socketId}`);
  if (el) { el.srcObject = null; el.remove(); }
}

function detachAllAudio() {
  document.querySelectorAll('[id^="studix-audio-"]').forEach(el => {
    el.srcObject = null;
    el.remove();
  });
}

class VAD {
  ctx = null;
  analyser = null;
  source = null;
  timer = null;

  start(stream, onSpeaking, emitFn) {
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.source = this.ctx.createMediaStreamSource(stream);
    this.source.connect(this.analyser);

    const buf = new Uint8Array(this.analyser.frequencyBinCount);
    let wasSpeaking = false;
    let lastEmit = 0;

    this.timer = setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(buf);
      const vol = buf.reduce((a, b) => a + b, 0) / buf.length;
      const speaking = vol > VAD_THRESHOLD;

      if (speaking !== wasSpeaking) {
        wasSpeaking = speaking;
        onSpeaking(speaking);
        const now = Date.now();
        if (emitFn && now - lastEmit >= SPEAKING_THROTTLE_MS) {
          lastEmit = now;
          emitFn(speaking);
        }
      }
    }, VAD_INTERVAL_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.source) this.source.disconnect();
    if (this.ctx) this.ctx.close().catch(() => {});
    this.timer = null;
    this.source = null;
    this.analyser = null;
    this.ctx = null;
  }
}

// ─── Global State Manager ──────────────────────────────────────────────────
class VoiceManager {
  constructor() {
    this.peers = {}; // socketId -> { pc, iceBuf, remoteDescSet, lastIceEmit }
    this.stream = null;
    this.vad = null;
    this.bitrateTimers = {};
    this.socket = null;
    this.user = null;
    this.roomId = null;
    this.isConnecting = false;
    this.error = null;
    this.listenersBound = false;
    this.onConnectingChange = null;
    this.onErrorChange = null;
    this.onSpeakingChange = null;
  }

  init(user, roomId, onConnectingChange, onErrorChange, onSpeakingChange) {
    this.user = user;
    this.roomId = roomId;
    this.onConnectingChange = onConnectingChange;
    this.onErrorChange = onErrorChange;
    this.onSpeakingChange = onSpeakingChange;

    socketService.connect().then(socket => {
      this.socket = socket;
      this.bindListeners();
    });
  }

  bindListeners() {
    if (this.listenersBound || !this.socket) return;
    this.listenersBound = true;
    const socket = this.socket;

    socket.on('voice:participants:update', ({ participants }) => {
      const store = useVoiceSession.getState();
      const prev = store.participants;
      const next = {};
      for (const meta of participants) {
        if (meta.socketId === socket.id) continue;
        next[meta.socketId] = {
          socketId: meta.socketId,
          userId: meta.userId,
          name: meta.name,
          avatar: meta.avatar,
          isMuted: meta.isMuted || false,
          isConnected: prev[meta.socketId]?.isConnected || false,
          isSpeaking: prev[meta.socketId]?.isSpeaking || false,
        };
      }
      store.setParticipants(next);
    });

    socket.on('voice:user-joined', ({ socketId }) => {
      if (socketId === socket.id) return;
      this.createOffer(socketId);
    });

    socket.on('voice:offer', async ({ offer, from }) => {
      if (!this.peers[from]) {
        this.peers[from] = { pc: this.createPC(from), iceBuf: [], remoteDescSet: false, lastIceEmit: 0 };
        useVoiceSession.getState().setPeerConnections(this.peers);
      }
      const entry = this.peers[from];
      await entry.pc.setRemoteDescription(new RTCSessionDescription(offer));
      entry.remoteDescSet = true;
      await this.flushIceBuf(from);
      const answer = await entry.pc.createAnswer();
      const mungedSDP = optimizeSDP(answer.sdp || '');
      await entry.pc.setLocalDescription({ type: 'answer', sdp: mungedSDP });
      socket.emit('voice:answer', { targetSocketId: from, answer: { type: 'answer', sdp: mungedSDP } });
    });

    socket.on('voice:answer', async ({ answer, from }) => {
      const entry = this.peers[from];
      if (!entry || entry.pc.signalingState === 'stable') return;
      await entry.pc.setRemoteDescription(new RTCSessionDescription(answer));
      entry.remoteDescSet = true;
      await this.flushIceBuf(from);
    });

    socket.on('voice:ice-candidate', async ({ candidate, from }) => {
      const entry = this.peers[from];
      if (!entry) return;
      if (!entry.remoteDescSet) entry.iceBuf.push(candidate);
      else await entry.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    });

    socket.on('voice:user-left', ({ socketId }) => this.cleanupPeer(socketId));

    socket.on('voice:mute', ({ socketId, muted }) => {
      const participants = { ...useVoiceSession.getState().participants };
      if (participants[socketId]) {
        participants[socketId].isMuted = muted;
        useVoiceSession.getState().setParticipants(participants);
      }
    });

    socket.on('voice:user-speaking', ({ socketId, speaking }) => {
      const participants = { ...useVoiceSession.getState().participants };
      if (participants[socketId]) {
        participants[socketId].isSpeaking = speaking;
        useVoiceSession.getState().setParticipants(participants);
      }
    });

    socket.on('voice:error', ({ message }) => {
      if (this.onErrorChange) this.onErrorChange(message);
      this.stopStream();
    });

    socket.on('connect', () => {
      if (useVoiceSession.getState().connected && this.user) {
        socket.emit('voice:join', { roomId: this.roomId, userId: this.user.uid, name: this.user.displayName, avatar: this.user.photoURL });
      }
    });
  }

  // Adaptive bitrate control
  startBitrateControl(socketId, pc) {
    let isChecking = false;
    const timer = setInterval(async () => {
      if (isChecking || pc.connectionState !== 'connected') return;
      isChecking = true;
      try {
        const stats = await pc.getStats();
        let packetLoss = 0;
        let availableBw = OPUS_BITRATE_HIGH;

        stats.forEach((report) => {
          if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            const lost = report.packetsLost || 0;
            const sent = report.packetsSent || 1;
            packetLoss = lost / sent;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.availableOutgoingBitrate) {
            availableBw = report.availableOutgoingBitrate;
          }
        });

        let targetBitrate = OPUS_BITRATE_DEFAULT;
        if (packetLoss > 0.1 || availableBw < 50_000) targetBitrate = OPUS_BITRATE_MIN;
        else if (packetLoss < 0.02 && availableBw > 150_000) targetBitrate = OPUS_BITRATE_HIGH;

        const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
        if (sender) {
           const params = sender.getParameters();
           if (params.encodings && params.encodings.length > 0) {
              if (params.encodings[0].maxBitrate !== targetBitrate) {
                params.encodings[0].maxBitrate = targetBitrate;
                await sender.setParameters(params);
              }
           }
        }
      } catch {} finally {
        isChecking = false;
      }
    }, BITRATE_CHECK_MS);
    return timer;
  }

  createPC(socketId) {
    const pc = new RTCPeerConnection(PC_CONFIG);
    this.stream?.getTracks().forEach(t => pc.addTrack(t, this.stream));

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !this.socket) return;
      const entry = this.peers[socketId];
      const now = Date.now();
      if (entry && now - entry.lastIceEmit < ICE_THROTTLE_MS) return;
      if (entry) entry.lastIceEmit = now;
      this.socket.emit('voice:ice-candidate', { targetSocketId: socketId, candidate });
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        this.updateParticipant(socketId, { isConnected: true });
        this.bitrateTimers[socketId] = this.startBitrateControl(socketId, pc);
      } else if (state === 'failed') {
        pc.restartIce();
      } else if (state === 'disconnected') {
        if (this.bitrateTimers[socketId]) {
          clearInterval(this.bitrateTimers[socketId]);
          delete this.bitrateTimers[socketId];
        }
        setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            this.cleanupPeer(socketId);
          }
        }, 4000);
      }
    };

    pc.ontrack = ({ streams }) => {
      if (streams[0]) attachAudio(socketId, streams[0]);
      this.updateParticipant(socketId, { isConnected: true });
    };

    return pc;
  }

  updateParticipant(socketId, updates) {
    const participants = { ...useVoiceSession.getState().participants };
    if (participants[socketId]) {
      participants[socketId] = { ...participants[socketId], ...updates };
      useVoiceSession.getState().setParticipants(participants);
    }
  }

  cleanupPeer(socketId) {
    const entry = this.peers[socketId];
    if (entry) {
      entry.pc.onicecandidate = null;
      entry.pc.ontrack = null;
      entry.pc.onconnectionstatechange = null;
      entry.pc.close();
      delete this.peers[socketId];
      useVoiceSession.getState().setPeerConnections(this.peers);
    }
    if (this.bitrateTimers[socketId]) {
      clearInterval(this.bitrateTimers[socketId]);
      delete this.bitrateTimers[socketId];
    }
    detachAudio(socketId);
  }

  async flushIceBuf(sid) {
    const entry = this.peers[sid];
    if (!entry) return;
    for (const c of entry.iceBuf) {
      await entry.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    entry.iceBuf = [];
  }

  async createOffer(socketId) {
    if (!this.socket || Object.keys(this.peers).length >= MAX_VOICE_PEERS || this.peers[socketId]) return;
    const pc = this.createPC(socketId);
    this.peers[socketId] = { pc, iceBuf: [], remoteDescSet: false, lastIceEmit: 0 };
    useVoiceSession.getState().setPeerConnections(this.peers);
    const offer = await pc.createOffer();
    const mungedSDP = optimizeSDP(offer.sdp || '');
    await pc.setLocalDescription({ type: 'offer', sdp: mungedSDP });
    this.socket.emit('voice:offer', { targetSocketId: socketId, offer: { type: 'offer', sdp: mungedSDP } });
  }

  async startStream() {
    if (useVoiceSession.getState().connected || this.isConnecting) return;
    this.isConnecting = true;
    if (this.onConnectingChange) this.onConnectingChange(true);
    if (this.onErrorChange) this.onErrorChange(null);

    // Wait for socket to connect if it hasn't yet
    if (!this.socket) {
      this.socket = await socketService.connect();
      this.bindListeners();
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      if (this.onErrorChange) this.onErrorChange('Browser does not support microphone.');
      this.isConnecting = false;
      if (this.onConnectingChange) this.onConnectingChange(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true, noiseSuppression: true, autoGainControl: true,
          channelCount: 1, sampleRate: 48000, sampleSize: 16,
        },
        video: false,
      });

      this.stream = stream;
      checkDeviceQuality(stream);

      const store = useVoiceSession.getState();
      store.setLocalStream(stream);
      store.setConnected(true);
      store.setRoomId(this.roomId);
      store.setMuted(false);
      store.setParticipants({});

      this.vad = new VAD();
      this.vad.start(
        stream,
        (speaking) => {
          if (this.onSpeakingChange) this.onSpeakingChange(speaking);
        },
        (speaking) => this.socket?.emit('voice:speaking', { roomId: this.roomId, speaking })
      );

      if (this.socket && this.user) {
        this.socket.emit('voice:join', { roomId: this.roomId, userId: this.user.uid, name: this.user.displayName, avatar: this.user.photoURL });
      }

      this.isConnecting = false;
      if (this.onConnectingChange) this.onConnectingChange(false);
    } catch (err) {
      if (this.onErrorChange) this.onErrorChange('Microphone access denied.');
      this.isConnecting = false;
      if (this.onConnectingChange) this.onConnectingChange(false);
    }
  }

  stopStream() {
    this.vad?.stop();
    this.vad = null;

    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    
    if (this.onSpeakingChange) this.onSpeakingChange(false);

    Object.values(this.bitrateTimers).forEach(t => clearInterval(t));
    this.bitrateTimers = {};

    Object.keys(this.peers).forEach(id => this.cleanupPeer(id));
    detachAllAudio();

    if (this.socket && useVoiceSession.getState().connected) {
      this.socket.emit('voice:leave', { roomId: this.roomId });
    }

    const store = useVoiceSession.getState();
    store.setConnected(false);
    store.setLocalStream(null);
    store.setParticipants({});
    store.setPeerConnections({});
    store.setRoomId(null);
  }

  toggleMute() {
    const track = this.stream?.getAudioTracks()[0];
    if (!track) return;
    
    const store = useVoiceSession.getState();
    const willMute = track.enabled;
    if (willMute) {
      setTimeout(() => {
        track.enabled = false;
        store.setMuted(true);
        if (this.socket) this.socket.emit('voice:mute', { roomId: this.roomId, muted: true });
      }, 50);
    } else {
      track.enabled = true;
      store.setMuted(false);
      if (this.socket) this.socket.emit('voice:mute', { roomId: this.roomId, muted: false });
    }
  }
}

export const globalVoiceManager = new VoiceManager();
