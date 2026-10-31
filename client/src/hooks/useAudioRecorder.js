import { useState, useRef, useCallback } from 'react';

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/wav',
];

function getBestMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return null;
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return null;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(0);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = getBestMimeType();
      const options = mimeType ? { mimeType } : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordedMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
        if (chunksRef.current.length === 0) {
          console.warn('[AudioRecorder] Recording stopped but zero audio data was captured.');
          setAudioBlob(null);
        } else {
          const blob = new Blob(chunksRef.current, { type: recordedMime });
          if (blob.size > 0) {
            setAudioBlob(blob);
          } else {
            setAudioBlob(null);
          }
        }

        // Release microphone hardware
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      // 150ms timeslices for rapid flush and robust data gathering
      mediaRecorder.start(150);
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const elapsed = Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000));
        setRecordingDuration(elapsed);
      }, 500);
    } catch (error) {
      console.error('[AudioRecorder] Microphone permission or system error:', error);
      setIsRecording(false);
      setAudioBlob(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      throw error;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (startTimeRef.current > 0) {
      const finalSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      setRecordingDuration(finalSec);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('[AudioRecorder] Error stopping media recorder:', e);
      }
    }
    setIsRecording(false);
  }, []);

  const clearRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingDuration(0);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    recordingDuration,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
