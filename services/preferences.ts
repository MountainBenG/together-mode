import AsyncStorage from '@react-native-async-storage/async-storage';

// Tracks what each player tends to like, so we can bias recommendations later.
// Stored locally, per player. This is the DATA FOUNDATION for adaptivity —
// a simple heuristic can use it now, and a real ML model could train on it later.
//
// NOT wired into the live flow yet (nothing imports this). Wire it in AFTER the
// user test: call recordVote() from handleVote, and getFavoriteGenres() in the fetch.

const KEY_PREFIX = '@together_mode_prefs_';

// genreId -> net score (a 'yes' adds 1, a 'no' subtracts 1)
type GenreScores = Record<number, number>;

export async function getGenreScores(playerId: string): Promise<GenreScores> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + playerId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Record one vote: nudge each of the movie's genres up (yes) or down (no).
export async function recordVote(
  playerId: string,
  genreIds: number[],
  vote: 'yes' | 'no'
): Promise<void> {
  if (!playerId || genreIds.length === 0) return;
  const scores = await getGenreScores(playerId);
  const delta = vote === 'yes' ? 1 : -1;
  for (const g of genreIds) scores[g] = (scores[g] ?? 0) + delta;
  await AsyncStorage.setItem(KEY_PREFIX + playerId, JSON.stringify(scores));
}

// The genres this player has liked most (net positive), best first.
export async function getFavoriteGenres(playerId: string, limit = 3): Promise<number[]> {
  const scores = await getGenreScores(playerId);
  return Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([genreId]) => Number(genreId));
}
