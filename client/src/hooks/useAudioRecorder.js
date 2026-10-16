import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Enforce webm with opus codec for highest stability across browsers.
      // Fallback to standard webm if explicit codec is unsupported.
      let options;
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else {
        console.warn('[AudioRecorder] webm unsupported. Using browser default.');
        options = undefined;
      }
        
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        // Strict guard against empty chunks
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (chunksRef.current.length === 0) {
           console.warn('[AudioRecorder] Recording stopped but ZERO audio data was captured.');
           setAudioBlob(null);
        } else {
           // Guarantee a valid blob is emitted
           const blob = new Blob(chunksRef.current, { type: options?.mimeType || 'audio/webm' });
           if (blob.size > 0) {
             console.log(`[AudioRecorder] Captured valid blob: ${blob.size} bytes`);
             setAudioBlob(blob);
           } else {
             console.warn('[AudioRecorder] Blob generated but size was 0.');
             setAudioBlob(null);
           }
        }
        
        // Fully release microphone hardware to clear the red tab indicator
        stream.getTracks().forEach(track => {
           track.stop();
           stream.removeTrack(track);
        });
      };

      mediaRecorder.start(200); // 200ms timeslices for rapid flush safety
      setIsRecording(true);
      setRecordingDuration(0);

      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('[AudioRecorder] Microphone permission or system error:', error);
      // Ensure state reverts on failure
      setIsRecording(false);
      setAudioBlob(null);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('[AudioRecorder] Error stopping media recorder:', e);
      }
    }
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
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
