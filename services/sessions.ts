import { supabase } from '../lib/supabase';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export async function createSession(playerId: string, genreId?: number | null, maxCert?: string | null): Promise<string | null> {
  const code = generateCode();
  const { error } = await supabase.from('sessions').insert({
    code,
    player1_id: playerId,
    status: 'waiting',
    ...(genreId ? { genre_id: genreId } : {}),
    ...(maxCert ? { max_certification: maxCert } : {}),
  });
  if (error) {
    console.error('createSession error:', error.message);
    return null;
  }
  return code;
}

export type JoinResult =
  | { ok: true; genreId: number | null; maxCert: string | null }
  | { ok: false; reason: 'not_found' | 'full' | 'network' };

export async function joinSession(
  code: string,
  playerId: string
): Promise<JoinResult> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, status, player2_id, genre_id, max_certification')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) return { ok: false, reason: 'not_found' };
  if (data.status !== 'waiting' || data.player2_id) return { ok: false, reason: 'full' };

  const { error: updateError } = await supabase
    .from('sessions')
    .update({ player2_id: playerId, status: 'voting' })
    .eq('code', code.toUpperCase());

  return updateError ? { ok: false, reason: 'network' } : { ok: true, genreId: data.genre_id ?? null, maxCert: data.max_certification ?? null };
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

export async function clearTiebreakerVotes(code: string): Promise<void> {
  await supabase
    .from('sessions')
    .update({ player1_voted: null, player2_voted: null })
    .eq('code', code.toUpperCase());
}

export async function restartSession(code: string): Promise<void> {
  await supabase
    .from('sessions')
    .update({
      status: 'voting',
      current_movie_index: 0,
      player1_voted: null,
      player2_voted: null,
      matched_movie_title: null,
    })
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
