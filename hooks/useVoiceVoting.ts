import { useEffect, useRef, useState } from 'react';

// ─── Native module stub ───────────────────────────────────────────────────────
// When VOICE_ENABLED is ready to go live, replace this block with:
//   import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
// Then run: npx expo run:ios (or EAS build) — Expo Go won't work with native Voice.
type SpeechResultsEvent = { value?: string[] };
const Voice = {
  onSpeechResults: null as ((e: SpeechResultsEvent) => void) | null,
  onSpeechEnd: null as (() => void) | null,
  onSpeechError: null as (() => void) | null,
  start: async (_locale: string) => {},
  stop: async () => {},
  destroy: async () => {},
  removeAllListeners: () => {},
};
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceVotingState = {
  listening: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
};

// Listens for "yes" or "no" (and common variants) and calls onVote.
// Push-to-talk: call startListening() on press-in, stopListening() on press-out.
export function useVoiceVoting(onVote: (vote: 'yes' | 'no') => void): VoiceVotingState {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const onVoteRef = useRef(onVote);
  onVoteRef.current = onVote;

  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = (e.value?.[0] ?? '').toLowerCase().trim();
      setTranscript(text);

      const YES_WORDS = ['yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'definitely'];
      const NO_WORDS  = ['no', 'nope', 'nah', 'pass', 'skip', 'next'];

      if (YES_WORDS.some(w => text.includes(w))) {
        onVoteRef.current('yes');
      } else if (NO_WORDS.some(w => text.includes(w))) {
        onVoteRef.current('no');
      }
    };

    Voice.onSpeechEnd = () => setListening(false);
    Voice.onSpeechError = () => setListening(false);

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  async function startListening() {
    try {
      setTranscript('');
      setListening(true);
      await Voice.start('en-US');
    } catch {
      setListening(false);
    }
  }

  async function stopListening() {
    try {
      await Voice.stop();
    } catch {}
    setListening(false);
  }

  return { listening, transcript, startListening, stopListening };
}
