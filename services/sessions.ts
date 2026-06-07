import { supabase } from '../lib/supabase';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export async function createSession(playerId: string): Promise<string | null> {
  try {
    const r = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/sessions`, {
      method: 'HEAD',
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! },
    });
    console.log('Raw fetch status:', r.status);
  } catch (e: any) {
    console.error('Raw fetch error:', e.message);
  }

  const code = generateCode();
  const { error } = await supabase.from('sessions').insert({
    code,
    player1_id: playerId,
    status: 'waiting',
  });
  if (error) {
    console.error('createSession error:', error.message);
    return null;
  }
  return code;
}

export async function joinSession(
  code: string,
  playerId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, status, player2_id')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) return false;
  if (data.status !== 'waiting' || data.player2_id) return false;

  const { error: updateError } = await supabase
    .from('sessions')
    .update({ player2_id: playerId, status: 'voting' })
    .eq('code', code.toUpperCase());

  return !updateError;
}

export async function submitVote(
  code: string,
  playerId: string,
  isPlayer1: boolean,
  vote: 'yes' | 'no'
): Promise<void> {
  const field = isPlayer1 ? 'player1_voted' : 'player2_voted';
  await supabase
    .from('sessions')
    .update({ [field]: vote })
    .eq('code', code.toUpperCase());
}

export async function advanceMovie(code: string, nextIndex: number): Promise<void> {
  await supabase
    .from('sessions')
    .update({
      current_movie_index: nextIndex,
      player1_voted: null,
      player2_voted: null,
    })
    .eq('code', code.toUpperCase());
}

export async function setMatched(code: string, movieTitle: string): Promise<void> {
  await supabase
    .from('sessions')
    .update({ status: 'matched', matched_movie_title: movieTitle })
    .eq('code', code.toUpperCase());
}

export async function setTiebreaker(code: string): Promise<void> {
  await supabase
    .from('sessions')
    .update({
      status: 'tiebreaker',
      player1_voted: null,
      player2_voted: null,
    })
    .eq('code', code.toUpperCase());
}

export function subscribeToSession(
  code: string,
  onChange: (session: any) => void
) {
  return supabase
    .channel(`session-${code}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `code=eq.${code.toUpperCase()}`,
      },
      (payload) => onChange(payload.new)
    )
    .subscribe();
}
