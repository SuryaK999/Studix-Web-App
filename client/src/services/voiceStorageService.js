import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./firebase";

const VOICE_PATH = "voiceMessages";

export async function saveVoice(blob) {
  try {
    const id = uuidv4();
    const fileRef = ref(storage, `${VOICE_PATH}/${id}.webm`);

    await uploadBytes(fileRef, blob, {
      contentType: "audio/webm",
    });

    const url = await getDownloadURL(fileRef);

    return {
      id,
      url,
    };
  } catch (err) {
    console.error("Voice upload failed:", err);
    throw err;
  }
}

export function getVoiceUrl(message) {
  // backward compatibility
  if (message?.voiceUrl) return message.voiceUrl;
  if (message?.voice?.url) return message.voice.url;
  return null;
}

export async function deleteVoiceByUrl(url) {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn("Voice delete skipped:", err);
  }
}
