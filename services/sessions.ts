import { supabase } from '../lib/supabase';

function generateCode(): string {
  // Unambiguous alphabet (no 0/O/1/I) so codes are easy to read + type. Always 4 chars.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateAlexaPin(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

export type CreateSessionResult = { code: string; alexaPin: number };

export async function createSession(playerId: string, genreId?: number | null, maxCert?: string | null, recSeedIds?: number[]): Promise<CreateSessionResult | null> {
  const code = generateCode();
  const alexaPin = generateAlexaPin();
  const { error } = await supabase.from('sessions').insert({
    code,
    player1_id: playerId,
    status: 'waiting',
    alexa_pin: alexaPin,
    ...(genreId ? { genre_id: genreId } : {}),
    ...(maxCert ? { max_certification: maxCert } : {}),
    ...(recSeedIds && recSeedIds.length ? { rec_seed_ids: recSeedIds } : {}),
  });
  if (error) {
    console.error('createSession error:', error.message);
    return null;
  }
  return { code, alexaPin };
}

export type JoinResult =
  | { ok: true; genreId: number | null; maxCert: string | null; recSeedIds: number[] }
  | { ok: false; reason: 'not_found' | 'full' | 'network' };

// Interleave two seed lists (host's + joiner's recently-liked movies) and dedupe, so
// the combined recommendation catalog draws from BOTH players: [host0, joiner0, host1, …].
function mergeSeeds(a: number[], b: number[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    for (const id of [a[i], b[i]]) {
      if (id != null && !seen.has(id)) { seen.add(id); out.push(id); }
    }
  }
  return out;
}

export async function joinSession(
  code: string,
  playerId: string,
  joinerSeeds: number[] = []
): Promise<JoinResult> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, status, player2_id, genre_id, max_certification, rec_seed_ids')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) return { ok: false, reason: 'not_found' };
  if (data.status !== 'waiting' || data.player2_id) return { ok: false, reason: 'full' };

  // Only blend in the joiner's taste if the host chose "Recommended" (rec_seed_ids set).
  // If the host picked a genre, leave it alone — don't switch them into recs mode.
  const hostSeeds: number[] = data.rec_seed_ids ?? [];
  const combinedSeeds = hostSeeds.length > 0 ? mergeSeeds(hostSeeds, joinerSeeds) : hostSeeds;

  const { error: updateError } = await supabase
    .from('sessions')
    .update({
      player2_id: playerId,
      status: 'voting',
      ...(hostSeeds.length > 0 ? { rec_seed_ids: combinedSeeds } : {}),
    })
    .eq('code', code.toUpperCase());

  return updateError
    ? { ok: false, reason: 'network' }
    : { ok: true, genreId: data.genre_id ?? null, maxCert: data.max_certification ?? null, recSeedIds: combinedSeeds };
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

// Async voting: a player records their whole yes-list at once when they finish
// voting on every movie, and flips their "done" flag. Only this player writes
// their own columns, so there's no cross-player race on a single write.
export async function finishVoting(
  code: string,
  isPlayer1: boolean,
  yesMovieIds: number[]
): Promise<void> {
  const yesField = isPlayer1 ? 'player1_yes' : 'player2_yes';
  const doneField = isPlayer1 ? 'player1_done' : 'player2_done';
  await supabase
    .from('sessions')
    .update({ [yesField]: yesMovieIds, [doneField]: true })
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
      // Clear the async-voting state too, so "pick something else" replays cleanly.
      player1_yes: [],
      player2_yes: [],
      player1_done: false,
      player2_done: false,
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
