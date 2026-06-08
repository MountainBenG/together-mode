const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

export type Movie = {
  id: number;
  title: string;
  year: string;
  overview: string;
  image: string;
};

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

export async function fetchPopularMovies(): Promise<Movie[]> {
  const res = await fetch(
    `${TMDB_BASE}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`
  );
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  const data = await res.json();
  // Dedupe by id — TMDB's popular list can repeat a movie, which creates duplicate
  // React keys and shows the same movie twice while voting.
  const seen = new Set<number>();
  return data.results
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
    }));
}

// Like fetchPopularMovies, but only movies rated `maxCert` (US) or lower —
// e.g. maxCert "PG-13" returns G/PG/PG-13. Used only when the age filter is on;
// fetchPopularMovies stays the untouched default.
export async function fetchMoviesByCertification(maxCert: string): Promise<Movie[]> {
  const res = await fetch(
    `${TMDB_BASE}/discover/movie?api_key=${API_KEY}&language=en-US&page=1&sort_by=popularity.desc&certification_country=US&certification.lte=${encodeURIComponent(maxCert)}`
  );
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  const data = await res.json();
  const seen = new Set<number>();
  return data.results
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
    }));
}
