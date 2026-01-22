// Sound effects service for VeoCall
// Uses Web Audio API for generating call sounds + Vibration API

class SoundService {
    private audioContext: AudioContext | null = null;
    private ringtoneInterval: NodeJS.Timeout | null = null;
    private dialingInterval: NodeJS.Timeout | null = null;
    private vibrationInterval: NodeJS.Timeout | null = null;

    private getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        // Resume if suspended (needed for autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }

    // Initialize AudioContext on user interaction
    public initialize(): void {
        this.getAudioContext();
    }

    // Play a beep tone
    private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void {
        try {
            const ctx = this.getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (error) {
            console.error('Error playing tone:', error);
        }
    }

    // Vibrate device (if supported)
    private vibrate(pattern: number | number[]): void {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                // Ignore vibration errors
            }
        }
    }

    // Stop vibration
    private stopVibration(): void {
        if ('vibrate' in navigator) {
            navigator.vibrate(0);
        }
        if (this.vibrationInterval) {
            clearInterval(this.vibrationInterval);
            this.vibrationInterval = null;
        }
    }

    // Incoming call ringtone (realistic phone ring pattern + vibration)
    playRingtone(): void {
        this.stopRingtone();

        const playRing = () => {
            // Classic phone ring: Two-tone pattern (like a real phone)
            // Ring 1
            this.playTone(480, 0.4, 'sine', 0.4);
            this.playTone(620, 0.4, 'sine', 0.3); // Harmonics
            setTimeout(() => {
                // Ring 2
                this.playTone(480, 0.4, 'sine', 0.4);
                this.playTone(620, 0.4, 'sine', 0.3);
            }, 500);

            // Vibrate: 500ms on, 200ms off, 500ms on
            this.vibrate([500, 200, 500]);
        };

        playRing();
        this.ringtoneInterval = setInterval(playRing, 3000); // Ring every 3 seconds

        // Continuous vibration pattern
        this.vibrationInterval = setInterval(() => {
            this.vibrate([500, 200, 500]);
        }, 3000);
    }

    stopRingtone(): void {
        if (this.ringtoneInterval) {
            clearInterval(this.ringtoneInterval);
            this.ringtoneInterval = null;
        }
        this.stopVibration();
    }

    // Dialing/ringback tone (what caller hears while waiting)
    // Classic ringback: Long tone, pause, repeat
    playDialing(): void {
        this.stopDialing();

        const playRingback = () => {
            // US ringback tone: 440Hz + 480Hz for 2 seconds
            this.playTone(440, 2, 'sine', 0.15);
            this.playTone(480, 2, 'sine', 0.15);
        };

        playRingback();
        // Ringback: 2 seconds on, 4 seconds off
        this.dialingInterval = setInterval(playRingback, 6000);
    }

    stopDialing(): void {
        if (this.dialingInterval) {
            clearInterval(this.dialingInterval);
            this.dialingInterval = null;
        }
    }

    // Call connected sound (success + short vibration)
    playConnected(): void {
        this.stopRingtone();
        this.stopDialing();

        // Two ascending tones (success sound)
        this.playTone(523, 0.12, 'sine', 0.35);
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.35), 120);
        setTimeout(() => this.playTone(784, 0.2, 'sine', 0.3), 270);

        // Short vibration feedback (100ms)
        this.vibrate(100);
    }

    // Call ended sound (descending tones)
    playCallEnded(): void {
        this.stopRingtone();
        this.stopDialing();

        // Three descending tones
        this.playTone(523, 0.15, 'sine', 0.3);
        setTimeout(() => this.playTone(440, 0.15, 'sine', 0.3), 150);
        setTimeout(() => this.playTone(349, 0.25, 'sine', 0.25), 300);
    }

    // Notification sound
    playNotification(): void {
        this.playTone(880, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(1047, 0.15, 'sine', 0.2), 100);
    }

    // Stop all sounds
    stopAll(): void {
        this.stopRingtone();
        this.stopDialing();
        this.stopVibration();
    }

    // Cleanup
    dispose(): void {
        this.stopAll();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

export const soundService = new SoundService();
export default soundService;
