// Hook to handle room codes from URL
import { useState, useEffect, useCallback } from 'react';
import webrtcService from '@/lib/webrtcService';

interface UseRoomFromUrlResult {
    roomFromUrl: string | null;
    isCheckingRoom: boolean;
    roomExists: boolean | null;
    clearRoomFromUrl: () => void;
}

export function useRoomFromUrl(): UseRoomFromUrlResult {
    const [roomFromUrl, setRoomFromUrl] = useState<string | null>(null);
    const [isCheckingRoom, setIsCheckingRoom] = useState(true);
    const [roomExists, setRoomExists] = useState<boolean | null>(null);

    useEffect(() => {
        const checkRoom = async () => {
            const room = webrtcService.constructor.prototype.constructor.name === 'WebRTCService'
                ? new URL(window.location.href).searchParams.get('room')
                : null;

            // Direct URL parsing for room parameter
            const urlRoom = new URL(window.location.href).searchParams.get('room');

            if (urlRoom) {
                setRoomFromUrl(urlRoom);
                try {
                    const exists = await webrtcService.checkRoomExists(urlRoom);
                    setRoomExists(exists);
                } catch (error) {
                    console.error('Error checking room:', error);
                    setRoomExists(false);
                }
            }
            setIsCheckingRoom(false);
        };

        checkRoom();
    }, []);

    const clearRoomFromUrl = useCallback(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.pushState({}, '', url.toString());
        setRoomFromUrl(null);
        setRoomExists(null);
    }, []);

    return { roomFromUrl, isCheckingRoom, roomExists, clearRoomFromUrl };
}

export default useRoomFromUrl;
