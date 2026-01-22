import { useState, useCallback } from 'react';

export type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied';

interface PermissionsState {
  camera: PermissionStatus;
  microphone: PermissionStatus;
}

export const useMediaPermissions = () => {
  const [permissions, setPermissions] = useState<PermissionsState>({
    camera: 'idle',
    microphone: 'idle',
  });

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    setPermissions(prev => ({ ...prev, microphone: 'requesting' }));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, microphone: 'granted' }));
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setPermissions(prev => ({ ...prev, microphone: 'denied' }));
      return false;
    }
  }, []);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    setPermissions(prev => ({ ...prev, camera: 'requesting' }));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, camera: 'granted' }));
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      setPermissions(prev => ({ ...prev, camera: 'denied' }));
      return false;
    }
  }, []);

  const requestVideoCallPermissions = useCallback(async (): Promise<boolean> => {
    setPermissions({ camera: 'requesting', microphone: 'requesting' });
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setPermissions({ camera: 'granted', microphone: 'granted' });
      return true;
    } catch (error) {
      console.error('Camera/Microphone permission denied:', error);
      setPermissions({ camera: 'denied', microphone: 'denied' });
      return false;
    }
  }, []);

  const requestAudioCallPermissions = useCallback(async (): Promise<boolean> => {
    return requestMicrophonePermission();
  }, [requestMicrophonePermission]);

  return {
    permissions,
    requestMicrophonePermission,
    requestCameraPermission,
    requestVideoCallPermissions,
    requestAudioCallPermissions,
  };
};
