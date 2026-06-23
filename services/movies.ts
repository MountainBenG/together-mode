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
  rating: number;
  voteCount: number;
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
      rating: m.vote_average ?? 0,
      voteCount: m.vote_count ?? 0,
    }));
}

// US movie ratings from least to most restrictive, for the age-cap comparison.
const CERT_ORDER = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

// Kids-safe age filter. TMDB's own certification.lte filter is unreliable (it lets
// higher-rated movies slip through), so we verify each movie's US rating ourselves and
// keep ONLY those we can confirm are at/under the cap. Unrated or above-cap → dropped.
async function filterByCert(movies: Movie[], maxCert?: string | null): Promise<Movie[]> {
  const maxIdx = maxCert ? CERT_ORDER.indexOf(maxCert) : -1;
  if (maxIdx === -1) return movies; // no cap (or unrecognized) → no filtering
  const checked = await Promise.all(
    movies.map(async (m) => ({ m, cert: await fetchCertification(m.id) }))
  );
  return checked
    .filter(({ cert }) => {
      const idx = cert ? CERT_ORDER.indexOf(cert) : -1;
      return idx !== -1 && idx <= maxIdx;
    })
    .map(({ m }) => m);
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
    return filterByCert([...parseResults(d1.results, seen), ...parseResults(d2.results, seen)], maxCert);
  }

  const [popularRes, trendingRes] = await Promise.all([
    fetch(`${TMDB_BASE}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`),
    fetch(`${TMDB_BASE}/trending/movie/week?api_key=${API_KEY}&language=en-US`),
  ]);
  if (!popularRes.ok) throw new Error(`TMDB error: ${popularRes.status}`);
  const [popular, trending] = await Promise.all([popularRes.json(), trendingRes.json()]);
  return filterByCert([...parseResults(popular.results, seen), ...parseResults(trending.results, seen)], maxCert);
}

// Movie-level recommendations: TMDB "people who liked these also liked…" for the seed
// movies (a player's recent yes-votes), interleaved + deduped. Both phones pass the SAME
// seeds (shared via the session) so they build the same catalog and matching still works.
// Age-capped (kids-safe): only candidates whose US rating is CONFIRMED at/under maxCert
// are kept — above-cap AND unrated movies are dropped (an unrated movie could be anything).
export async function fetchRecommendedMovies(seedIds: number[], maxCert?: string | null): Promise<Movie[]> {
  const seeds = seedIds.slice(0, 4);
  if (seeds.length === 0) return [];
  const seen = new Set<number>(seeds); // never recommend a movie they already liked
  const responses = await Promise.all(
    seeds.map((id) =>
      fetch(`${TMDB_BASE}/movie/${id}/recommendations?api_key=${API_KEY}&language=en-US&page=1`)
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .catch(() => ({ results: [] }))
    )
  );
  const lists = responses.map((d) => parseResults(d.results, seen));
  // Interleave so the catalog isn't dominated by a single seed's recommendations.
  const merged: Movie[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const l of lists) if (l[i]) merged.push(l[i]);
  }

  return filterByCert(merged, maxCert);
}

// Where the matched movie can be watched (US), via TMDB's watch-providers endpoint
// (data is provided by JustWatch — attribution required when shown). Returns streaming
// + rent/buy provider names and a link to the full list. Seed of the referral model.
export async function fetchWatchProviders(
  title: string
): Promise<{ link: string; stream: string[]; rentBuy: string[] } | null> {
  try {
    const sRes = await fetch(`${TMDB_BASE}/search/movie?api_key=${API_KEY}&language=en-US&page=1&query=${encodeURIComponent(title)}`);
    if (!sRes.ok) return null;
    const id = (await sRes.json()).results?.[0]?.id;
    if (!id) return null;
    const pRes = await fetch(`${TMDB_BASE}/movie/${id}/watch/providers?api_key=${API_KEY}`);
    if (!pRes.ok) return null;
    const us = (await pRes.json()).results?.US;
    if (!us) return null;
    const names = (arr: any[]): string[] => Array.from(new Set((arr ?? []).map((p: any) => p.provider_name)));
    return {
      link: us.link ?? '',
      stream: names(us.flatrate),
      rentBuy: names([...(us.rent ?? []), ...(us.buy ?? [])]),
    };
  } catch {
    return null;
  }
}
