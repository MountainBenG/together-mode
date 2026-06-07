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
  return data.results
    .filter((m: any) => m.poster_path)
    .map((m: any) => ({
      id: m.id,
      title: m.title,
      year: m.release_date?.substring(0, 4) ?? '',
      overview: m.overview,
      image: `${TMDB_IMG}${m.poster_path}`,
    }));
}
