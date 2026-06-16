const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

export type Movie = {
  id: number;
  title: string;
  year: string;
  overview: string;
  image: string;
  genreIds: number[];
};

export type Genre = {
  id: number;
  name: string;
  emoji: string;
};

export const GENRES: Genre[] = [
  { id: 28,    name: 'Action',    emoji: '💥' },
  { id: 35,    name: 'Comedy',    emoji: '😂' },
  { id: 27,    name: 'Horror',    emoji: '👻' },
  { id: 10749, name: 'Romance',   emoji: '❤️' },
  { id: 878,   name: 'Sci-Fi',    emoji: '🚀' },
  { id: 16,    name: 'Animation', emoji: '🎨' },
  { id: 53,    name: 'Thriller',  emoji: '😱' },
  { id: 18,    name: 'Drama',     emoji: '🎭' },
  { id: 80,    name: 'Crime',     emoji: '🔍' },
  { id: 12,    name: 'Adventure', emoji: '🗺️' },
  { id: 14,    name: 'Fantasy',   emoji: '✨' },
  { id: 10751, name: 'Family',    emoji: '👨‍👩‍👧' },
];

export async function fetchTrailerKey(movieId: number): Promise<string | null> {
  const res = await fetch(
    `${TMDB_BASE}/movie/${movieId}/videos?api_key=${API_KEY}&language=en-US`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const trailer = data.results.find(
    (v: any) => v.site === 'YouTube' && v.type === 'Trailer'
  );
  return trailer?.key ?? null;
}

// US age rating (G / PG / PG-13 / R) for a movie, via the release_dates endpoint.
export async function fetchCertification(movieId: number): Promise<string | null> {
  const res = await fetch(
    `${TMDB_BASE}/movie/${movieId}/release_dates?api_key=${API_KEY}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const us = (data.results ?? []).find((r: any) => r.iso_3166_1 === 'US');
  const cert = us?.release_dates?.map((d: any) => d.certification).find((c: string) => c);
  return cert || null;
}

function parseResults(results: any[], seen: Set<number>): Movie[] {
  return (results ?? [])
    .filter((m: any) => {
      if (!m.poster_path || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .map((m: any) => ({
      id: m.id,
      title: m.title,
      year: m.release_date?.substring(0, 4) ?? '',
      overview: m.overview,
      image: `${TMDB_IMG}${m.poster_path}`,
      genreIds: m.genre_ids ?? [],
    }));
}

// Without a genreId: mixes popular + trending for variety.
// With a genreId: fetches two pages of that genre sorted by popularity.
export async function fetchPopularMovies(genreId?: number | null, maxCert?: string | null): Promise<Movie[]> {
  const seen = new Set<number>();

  // Any filter set (genre and/or age) → /discover with those filters combined.
  if (genreId || maxCert) {
    const filters = [`api_key=${API_KEY}`, 'language=en-US', 'sort_by=popularity.desc'];
    if (genreId) filters.push(`with_genres=${genreId}`);
    if (maxCert) filters.push('certification_country=US', `certification.lte=${encodeURIComponent(maxCert)}`);
    const base = `${TMDB_BASE}/discover/movie?${filters.join('&')}`;
    const [r1, r2] = await Promise.all([fetch(`${base}&page=1`), fetch(`${base}&page=2`)]);
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
    return [...parseResults(d1.results, seen), ...parseResults(d2.results, seen)];
  }

  const [popularRes, trendingRes] = await Promise.all([
    fetch(`${TMDB_BASE}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`),
    fetch(`${TMDB_BASE}/trending/movie/week?api_key=${API_KEY}&language=en-US`),
  ]);
  if (!popularRes.ok) throw new Error(`TMDB error: ${popularRes.status}`);
  const [popular, trending] = await Promise.all([popularRes.json(), trendingRes.json()]);
  return [...parseResults(popular.results, seen), ...parseResults(trending.results, seen)];
}

export async function fetchMoviesByCertification(maxCert: string): Promise<Movie[]> {
  const res = await fetch(
    `${TMDB_BASE}/discover/movie?api_key=${API_KEY}&language=en-US&page=1&sort_by=popularity.desc&certification_country=US&certification.lte=${encodeURIComponent(maxCert)}`
  );
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  const data = await res.json();
  const seen = new Set<number>();
  return parseResults(data.results, seen);
}
