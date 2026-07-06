export const VOICE_UNAVAILABLE_MESSAGE = 'Voice nie je dostupné na tomto zariadení';

/**
 * @param {typeof globalThis} [scope]
 * @returns {boolean}
 */
export function detectVoiceSupport(scope = globalThis) {
  if (!scope || typeof scope !== 'object') return false;
  const win = scope.window ?? scope;
  if (!win || typeof win !== 'object') return false;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

/**
 * @param {typeof globalThis} [scope]
 * @returns {typeof SpeechRecognition | null}
 */
export function getSpeechRecognitionConstructor(scope = globalThis) {
  if (!detectVoiceSupport(scope)) return null;
  const win = scope.window ?? scope;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

/**
 * @param {string} [navigatorLanguage]
 * @returns {'sk-SK' | 'en-US'}
 */
export function resolveSpeechLanguage(navigatorLanguage = '') {
  const lang = String(navigatorLanguage || '').trim().toLowerCase();
  if (lang.startsWith('sk')) return 'sk-SK';
  return 'en-US';
}

/**
 * @param {{
 *   language?: string;
 *   onTranscript?: (text: string, isFinal: boolean) => void;
 *   onError?: (event: Event) => void;
 *   onEnd?: (finalText: string) => void;
 *   global?: typeof globalThis;
 * }} [options]
 * @returns {{ start: () => void; stop: () => void; abort: () => void; getTranscript: () => string } | null}
 */
export function createVoiceSession(options = {}) {
  const scope = options.global ?? globalThis;
  const Ctor = getSpeechRecognitionConstructor(scope);
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang =
    options.language ??
    resolveSpeechLanguage(scope.navigator?.language ?? scope.window?.navigator?.language ?? '');

  let transcript = '';

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const chunk = result[0]?.transcript ?? '';
      if (result.isFinal) {
        transcript += chunk;
      } else {
        interim += chunk;
      }
    }
    const combined = (transcript + interim).trim();
    options.onTranscript?.(combined, !interim);
  };

  recognition.onerror = (event) => {
    options.onError?.(event);
  };

  recognition.onend = () => {
    options.onEnd?.(transcript.trim());
  };

  return {
    start() {
      transcript = '';
      recognition.start();
    },
    stop() {
      recognition.stop();
    },
    abort() {
      recognition.abort();
    },
    getTranscript() {
      return transcript.trim();
    },
  };
}