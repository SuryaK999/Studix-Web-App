import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/firebase/config';
import { storageService } from '@/lib/storage/storageService';
import { getServerUrl } from '@/lib/utils';

const VOICE_PATH = 'voiceMessages';

/**
 * Converts a Blob to a Base64 data URL fallback.
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Saves a voice audio blob with multi-tier resilience:
 * 1. StorageService (Supabase / R2)
 * 2. Firebase Storage
 * 3. Express backend server (/api/messages/upload-voice)
 * 4. Data URL inline fallback
 */
export async function saveVoice(blob, options = {}) {
  if (!blob || blob.size === 0) {
    throw new Error('Empty voice recording');
  }

  const id = uuidv4();
  const mime = blob.type || 'audio/webm';
  const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
  const filename = `voice_${Date.now()}_${id.slice(0, 8)}.${ext}`;
  const roomId = options.roomId || 'general';

  // --- Tier 1: Supabase / Cloudflare R2 Storage ---
  try {
    const audioFile = new File([blob], filename, { type: mime });
    const result = await storageService.uploadFile(audioFile, {
      roomId,
      folder: 'voice',
      compress: false,
    });
    if (result && result.url) {
      console.log('[VoiceStorage] Saved successfully via StorageService (Supabase/R2)');
      return { id, url: result.url };
    }
  } catch (err) {
    console.warn('[VoiceStorage] StorageService upload failed, trying Firebase Storage:', err.message);
  }

  // --- Tier 2: Firebase Storage ---
  try {
    const fileRef = ref(storage, `${VOICE_PATH}/${roomId}/${id}.${ext}`);
    await uploadBytes(fileRef, blob, {
      contentType: mime,
      customMetadata: {
        roomId: String(roomId),
        createdAt: new Date().toISOString(),
      },
    });
    const url = await getDownloadURL(fileRef);
    if (url) {
      console.log('[VoiceStorage] Saved successfully via Firebase Storage');
      return { id, url };
    }
  } catch (err) {
    console.warn('[VoiceStorage] Firebase Storage failed, trying server endpoint:', err.message);
  }

  // --- Tier 3: Express Backend Server Upload ---
  try {
    const baseUrl = getServerUrl();
    const formData = new FormData();
    const audioFile = new File([blob], filename, { type: mime });
    formData.append('audio', audioFile);
    formData.append('roomId', roomId);

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/messages/upload-voice`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        console.log('[VoiceStorage] Saved successfully via Server endpoint');
        return { id, url: data.url };
      }
    }
  } catch (err) {
    console.warn('[VoiceStorage] Server endpoint failed, falling back to data URL:', err.message);
  }

  // --- Tier 4: Base64 Data URL (Guaranteed zero loss fallback) ---
  try {
    const dataUrl = await blobToDataUrl(blob);
    console.log('[VoiceStorage] Encoded voice recording as resilient data URL fallback');
    return { id, url: dataUrl };
  } catch (err) {
    console.error('[VoiceStorage] All voice upload strategies failed:', err);
    throw new Error('Failed to save voice recording: ' + err.message);
  }
}

/**
 * Extracts the appropriate playback audio URL from message data
 */
export function getVoiceUrl(message) {
  if (!message) return null;
  if (message.voiceUrl && typeof message.voiceUrl === 'string') return message.voiceUrl;
  if (message.voice?.url && typeof message.voice.url === 'string') return message.voice.url;
  if (message.type === 'voice' && message.fileUrl && typeof message.fileUrl === 'string') {
    return message.fileUrl;
  }
  return null;
}

/**
 * Deletes voice recording if it matches storage path
 */
export async function deleteVoiceByUrl(url) {
  if (!url || typeof url !== 'string') return;
  if (url.startsWith('data:') || url.startsWith('blob:')) return;

  try {
    if (url.includes('firebasestorage.googleapis.com')) {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    }
  } catch (err) {
    console.warn('[VoiceStorage] Voice delete skipped:', err.message);
  }
}

/**
 * Uploads voice message with progress reporting
 */
export const uploadVoiceMessage = async (audioBlob, roomId, userId, onProgress) => {
  if (!audioBlob) throw new Error('No audio blob provided');
  if (onProgress) onProgress(30);

  const { url } = await saveVoice(audioBlob, { roomId, userId });
  if (onProgress) onProgress(100);
  return url;
};
