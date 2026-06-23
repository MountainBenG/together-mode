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

// Movie-level taste: the actual movie IDs this player has said yes to, most recent
// first, deduped and capped. These seed "because you liked X" recommendations.
const LIKED_PREFIX = '@together_mode_liked_';
const MAX_LIKED = 30;

export async function recordLikedMovie(playerId: string, movieId: number): Promise<void> {
  if (!playerId || !movieId) return;
  try {
    const raw = await AsyncStorage.getItem(LIKED_PREFIX + playerId);
    const list: number[] = raw ? JSON.parse(raw) : [];
    const next = [movieId, ...list.filter((id) => id !== movieId)].slice(0, MAX_LIKED);
    await AsyncStorage.setItem(LIKED_PREFIX + playerId, JSON.stringify(next));
  } catch {}
}

export async function getRecentLikedMovies(playerId: string, limit = 5): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(LIKED_PREFIX + playerId);
    const list: number[] = raw ? JSON.parse(raw) : [];
    return list.slice(0, limit);
  } catch {
    return [];
  }
}

// Movies a player has marked "already seen" — hidden from their future decks, so
// matches land on films neither person has seen. Local per player; capped.
const SEEN_PREFIX = '@together_mode_seen_';
const MAX_SEEN = 300;

export async function recordSeenMovie(playerId: string, movieId: number): Promise<void> {
  if (!playerId || !movieId) return;
  try {
    const raw = await AsyncStorage.getItem(SEEN_PREFIX + playerId);
    const list: number[] = raw ? JSON.parse(raw) : [];
    if (list.includes(movieId)) return;
    await AsyncStorage.setItem(SEEN_PREFIX + playerId, JSON.stringify([movieId, ...list].slice(0, MAX_SEEN)));
  } catch {}
}

export async function getSeenMovies(playerId: string): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_PREFIX + playerId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
