import { useState, useCallback } from 'react';
import { storageService } from '@/lib/storage/storageService';
import { saveVoice } from '@/services/voiceStorageService';
import { storage, db } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function useChatUploads(roomId, user, socket, setMessages) {
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const handleFileUpload = useCallback(async (file, type) => {
    if (!user || !socket) return;

    if (!file || file.size === 0) {
      toast.error('Selected file is empty.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File too large. Max size: ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
      return;
    }

    if (type === 'image' && !file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const placeholder = {
      id: tempId,
      tempId,
      type,
      text: type === 'image' ? 'Uploading image...' : `Uploading ${file.name}...`,
      senderId: user.uid,
      senderName: user.displayName || 'Anonymous',
      senderPhotoURL: user.photoURL,
      reactions: {},
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, placeholder]);
    setIsUploading(true);
    setShowAttachmentMenu(false);

    const attemptUpload = async (retryCount) => {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Upload timed out after 30 seconds'));
        }, 30_000);
      });

      try {
        const uploadPromise = storageService.uploadFile(file, {
          roomId,
          folder: type === 'image' ? 'images' : 'files',
          compress: type === 'image',
        });
        const result = await Promise.race([uploadPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
      } catch (err) {
        clearTimeout(timeoutId);
        if (retryCount > 0) {
          logger.error(`File upload attempt failed, retrying (${retryCount} left)`, 'useChatUploads', err);
          return attemptUpload(retryCount - 1);
        }
        throw err;
      }
    };

    try {
      const result = await attemptUpload(1);

      const payload = {
        tempId,
        type,
        text: type === 'image' ? '' : `Shared ${file.type.split('/')[1] || 'file'}`,
        fileUrl: result.url,
        fileName: result.fileName,
        fileSize: result.fileSize,
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderPhotoURL: user.photoURL,
        reactions: {},
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, ...payload, id: tempId } : m)));
      socket.emit('chat:send', { roomId, message: payload });
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      logger.error('File upload error', 'useChatUploads', error);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [user, roomId, socket, setMessages]);

  const sendVoiceMessage = useCallback(async (audioBlob, recordingDuration, clearRecording) => {
    if (!audioBlob || !user || !socket) return;

    if (audioBlob.size === 0) {
      toast.error('Voice recording is empty. Please try again.');
      clearRecording?.();
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Sending voice message...');

    try {
      const { id, url } = await saveVoice(audioBlob);

      const payload = {
        tempId:         `temp-${Date.now()}`,
        type:           'voice',
        text:           'Voice message',
        voice: {
          id,
          url,
          duration: recordingDuration,
        },
        fileUrl:        url,
        voiceUrl:       url,
        fileName:       `voice-${id}.webm`,
        fileSize:       audioBlob.size,
        fileDuration:   recordingDuration,
        voiceDuration:  recordingDuration,
        senderId:       user.uid,
        senderName:     user.displayName || 'Anonymous',
        senderPhotoURL: user.photoURL,
        reactions:      {},
        createdAt:      new Date().toISOString(),
      };

      setMessages(prev => [...prev, { id: payload.tempId, ...payload }]);
      socket.emit('chat:send', { roomId, message: payload });
      toast.dismiss(toastId);
      clearRecording?.();
    } catch (error) {
      logger.error('Voice upload failed', 'useChatUploads', error);
      toast.dismiss(toastId);
      toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }, [user, roomId, socket, setMessages]);

  const uploadRoomAvatar = useCallback(async (e, isAdmin) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin || !user || !roomId) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error('Image must be under 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const refPath = ref(storage, `rooms/${roomId}/room_avatar_${Date.now()}.jpg`);
      await uploadBytes(refPath, file);
      const url = await getDownloadURL(refPath);

      await updateDoc(doc(db, 'rooms', roomId), {
        avatarUrl: url,
      });
      toast.success('Room profile updated');
    } catch (err) {
      logger.error('Avatar upload failed', 'useChatUploads', err);
      toast.error('Failed to update room profile');
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [user, roomId]);

  return {
    isUploading,
    isUploadingAvatar,
    showAttachmentMenu,
    setShowAttachmentMenu,
    handleFileUpload,
    sendVoiceMessage,
    uploadRoomAvatar,
  };
}
