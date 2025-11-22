
export class AudioService {
  private audio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;

  constructor() {
    // We don't initialize audio immediately to avoid auto-play restrictions
    // It will be initialized on first play()
  }

  play() {
    if (!this.audio) {
      // The file must be in the 'public' folder in your project root
      this.audio = new Audio('./bgm.mp3');
      this.audio.loop = true;
      this.audio.volume = 0.5; // Adjust volume as needed (0.0 to 1.0)
    }

    if (!this.isPlaying) {
      this.audio.play().catch(e => {
        console.warn("Audio play blocked by browser policy:", e);
      });
      this.isPlaying = true;
    }
  }

  stop() {
    if (this.audio && this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
    return this.isPlaying;
  }
}

export const audioService = new AudioService();
