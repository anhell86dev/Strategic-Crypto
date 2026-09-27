class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private alertedSymbols: Set<string> = new Set();
  private lastAlertTime: number = 0;

  constructor() {
    const saved = localStorage.getItem('crypto_radar_audio_alerts');
    if (saved !== null) {
      this.soundEnabled = saved === 'true';
    }
  }

  public toggleSound(enabled?: boolean): boolean {
    if (enabled !== undefined) {
      this.soundEnabled = enabled;
    } else {
      this.soundEnabled = !this.soundEnabled;
    }
    localStorage.setItem('crypto_radar_audio_alerts', String(this.soundEnabled));
    if (this.soundEnabled) {
      this.playRadarPing(880, 0.1); // subtle confirmation ping
    }
    return this.soundEnabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  private initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public playRadarPing(frequency: number = 784, duration: number = 0.25) {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context might need user interaction first
    }
  }

  public checkAlert(symbol: string, distancePercent: number) {
    if (!this.soundEnabled) return;

    if (distancePercent <= 1.5) {
      const now = Date.now();
      // Only alert once every 30 seconds per symbol to prevent spam
      if (!this.alertedSymbols.has(symbol) || now - this.lastAlertTime > 25000) {
        this.alertedSymbols.add(symbol);
        this.lastAlertTime = now;
        this.playRadarPing(920, 0.35);
      }
    } else if (distancePercent > 2.0) {
      // Clear alerted status when it moves out of zone
      this.alertedSymbols.delete(symbol);
    }
  }
}

export const audioAlert = new AudioAlertService();
