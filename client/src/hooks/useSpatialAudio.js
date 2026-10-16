/**
 * useSpatialAudio — Web Audio API spatial positioning for remote WebRTC streams.
 *
 * Architecture:
 *   Remote MediaStream → MediaStreamSourceNode → StereoPannerNode → GainNode → AudioContext.destination
 *   Local stream is NEVER spatialized (would cause echo).
 *
 * Usage:
 *   const spatial = useSpatialAudio();
 *   spatial.attachStream(socketId, remoteStream);
 *   spatial.updatePosition(socketId, x, y, myX, myY);  // 0–1 coords
 *   spatial.removeUser(socketId);
 *   spatial.cleanup();  // on unmount / leave
 */
import { useRef, useCallback } from 'react';

const POSITION_THROTTLE_MS = 100;



export function useSpatialAudio() {
  const ctxRef   = useRef(null);
  const nodesRef = useRef(new Map());

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  /**
   * Attach a remote WebRTC stream to the spatial audio graph.
   * Chain: source → panner → gain → compressor (volume normalizer) → destination
   */
  const attachStream = useCallback((socketId, stream) => {
    if (nodesRef.current.has(socketId)) return;

    const ctx        = getCtx();
    const source     = ctx.createMediaStreamSource(stream);
    const panner     = ctx.createStereoPanner();
    const gain       = ctx.createGain();

    // Step 7: DynamicsCompressor acts as a loudness normalizer
    // Prevents whisper users from being silent and loud users from blasting
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, ctx.currentTime);  // start compressing at -24dB
    compressor.knee.setValueAtTime(12, ctx.currentTime);        // soft knee for natural sound
    compressor.ratio.setValueAtTime(4, ctx.currentTime);        // 4:1 compression ratio
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);   // 3ms attack — fast enough for speech
    compressor.release.setValueAtTime(0.15, ctx.currentTime);   // 150ms release — smooth recovery

    source.connect(panner);
    panner.connect(gain);
    gain.connect(compressor);
    compressor.connect(ctx.destination);

    nodesRef.current.set(socketId, { source, panner, gain, compressor });
  }, [getCtx]);

  /**
   * Update spatial position for a remote user.
   * @param socketId  peer's socket ID
   * @param x, y     peer's position (0–1)
   * @param myX, myY listener's position (0–1), defaults to centre
   */
  const updatePosition = useCallback((
    socketId,
    x,
    y,
    myX = 0.5,
    myY = 0.5,
  ) => {
    const node = nodesRef.current.get(socketId);
    if (!node) return;

    // Stereo pan: -1 (full left) → +1 (full right)
    const pan = (x - myX) * 2;
    node.panner.pan.setTargetAtTime(
      Math.max(-1, Math.min(1, pan)),
      node.panner.context.currentTime,
      0.05, // 50ms smooth ramp
    );

    // Distance attenuation: further = quieter (min 0.08, max 1.0)
    const dx   = x - myX;
    const dy   = y - myY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const vol  = Math.max(0.08, 1 - dist * 1.4);
    node.gain.gain.setTargetAtTime(vol, node.gain.context.currentTime, 0.05);
  }, []);

  /**
   * Disconnect and remove audio graph for one peer.
   */
  const removeUser = useCallback((socketId) => {
    const node = nodesRef.current.get(socketId);
    if (!node) return;
    try {
      node.source.disconnect();
      node.panner.disconnect();
      node.gain.disconnect();
      node.compressor.disconnect();
    } catch (_) {}
    nodesRef.current.delete(socketId);
  }, []);

  /**
   * Full teardown — call on leave or unmount.
   */
  const cleanup = useCallback(() => {
    nodesRef.current.forEach((_, id) => removeUser(id));
    nodesRef.current.clear();
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  }, [removeUser]);

  return { attachStream, updatePosition, removeUser, cleanup, POSITION_THROTTLE_MS };
}
