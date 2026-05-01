'use client';

interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
  onBoundary?: (charIndex: number) => void;
}

class PodwalkTTS {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isReady: boolean = false;
  private preferredVoices: Record<string, SpeechSynthesisVoice | null> = {};

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isReady = true;
      this.initVoices();
    }
  }

  private initVoices() {
    const loadVoices = () => {
      const voices = this.synth!.getVoices();
      const langMap: Record<string, string[]> = {
        'fr': ['fr-FR', 'fr-BE', 'fr-CA', 'fr'],
        'en': ['en-GB', 'en-US', 'en-AU', 'en'],
        'es': ['es-ES', 'es-MX', 'es'],
        'de': ['de-DE', 'de-AT', 'de'],
        'it': ['it-IT', 'it'],
        'nl': ['nl-NL', 'nl-BE', 'nl'],
      };

      for (const [lang, codes] of Object.entries(langMap)) {
        let found: SpeechSynthesisVoice | null = null;
        for (const code of codes) {
          found = voices.find(v => v.lang === code) || null;
          if (found) break;
        }
        this.preferredVoices[lang] = found;
      }
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  speak(text: string, options: TTSOptions = {}): void {
    if (!this.synth || !this.isReady) {
      console.warn('[TTS] Speech synthesis not available');
      options.onError?.(new SpeechSynthesisErrorEvent('error', { error: 'not-allowed', utterance: null as unknown as SpeechSynthesisUtterance }));
      return;
    }

    this.stop();

    // Chunk text for better reliability (some browsers have limits)
    const chunks = this.chunkText(text, 200);
    this.speakChunks(chunks, options, 0);
  }

  private chunkText(text: string, maxWords: number): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      const wordCount = (current + sentence).split(' ').length;
      if (wordCount > maxWords && current) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current) chunks.push(current.trim());
    return chunks;
  }

  private speakChunks(chunks: string[], options: TTSOptions, index: number): void {
    if (index >= chunks.length) {
      options.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    this.currentUtterance = utterance;

    const lang = options.lang || 'fr';
    const voice = this.preferredVoices[lang];
    if (voice) utterance.voice = voice;
    utterance.lang = lang === 'fr' ? 'fr-FR' : lang;
    utterance.rate = options.rate ?? 0.95;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    if (index === 0) {
      utterance.onstart = () => options.onStart?.();
    }

    utterance.onboundary = (event) => {
      options.onBoundary?.(event.charIndex);
    };

    utterance.onend = () => {
      this.speakChunks(chunks, options, index + 1);
    };

    utterance.onerror = (event) => {
      if (event.error !== 'interrupted') {
        options.onError?.(event);
      }
    };

    this.synth!.speak(utterance);
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  pause(): void {
    this.synth?.pause();
  }

  resume(): void {
    this.synth?.resume();
  }

  get speaking(): boolean {
    return this.synth?.speaking ?? false;
  }

  get paused(): boolean {
    return this.synth?.paused ?? false;
  }

  get supported(): boolean {
    return this.isReady;
  }

  getAvailableVoices(lang: string): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices().filter(v => v.lang.startsWith(lang));
  }
}

// Singleton
let ttsInstance: PodwalkTTS | null = null;

export function getTTS(): PodwalkTTS {
  if (!ttsInstance) {
    ttsInstance = new PodwalkTTS();
  }
  return ttsInstance;
}

export { PodwalkTTS };
