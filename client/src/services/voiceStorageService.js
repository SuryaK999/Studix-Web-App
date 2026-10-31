import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/firebase/config';

const VOICE_PATH = 'voiceMessages';

export async function saveVoice(blob) {
  try {
    const id = uuidv4();
    const fileRef = ref(storage, `${VOICE_PATH}/${id}.webm`);

    await uploadBytes(fileRef, blob, {
      contentType: 'audio/webm',
    });

    const url = await getDownloadURL(fileRef);

    return {
      id,
      url,
    };
  } catch (err) {
    console.error('Voice upload failed:', err);
    throw err;
  }
}

export function getVoiceUrl(message) {
  // Backward compatibility
  if (message?.voiceUrl) return message.voiceUrl;
  if (message?.voice?.url) return message.voice.url;
  return null;
}

export async function deleteVoiceByUrl(url) {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('Voice delete skipped:', err);
  }
}

export const uploadVoiceMessage = (audioBlob, roomId, userId, onProgress) => {
  return new Promise((resolve, reject) => {
    if (!audioBlob) {
      return reject(new Error('No audio blob provided'));
    }

    const filename = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.webm`;
    const storagePath = `voice-messages/${roomId}/${userId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: audioBlob.type || 'audio/webm',
      customMetadata: {
        roomId: String(roomId),
        userId: String(userId),
        createdAt: new Date().toISOString(),
      },
    };

    const uploadTask = uploadBytesResumable(storageRef, audioBlob, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(Math.round(progress));
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
};
