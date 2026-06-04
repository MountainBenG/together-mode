import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { advanceMovie, setMatched, submitVote, subscribeToSession } from '../services/sessions';
import { fetchPopularMovies, Movie } from '../services/movies';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  code: string;
  playerId: string;
  isPlayer1: boolean;
  onMatch: (title: string) => void;
};

export default function VotingScreen({ code, playerId, isPlayer1, onMatch }: Props) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [movieIndex, setMovieIndex] = useState(0);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    fetchPopularMovies()
      .then(setMovies)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    subscriptionRef.current = subscribeToSession(code, handleSessionUpdate);
    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [code]);

  function handleSessionUpdate(session: any) {
    if (session.status === 'matched') {
      onMatch(session.matched_movie_title);
      return;
    }
    if (session.current_movie_index !== movieIndex) {
      setMovieIndex(session.current_movie_index);
      setVoted(false);
    }
    const myVote = isPlayer1 ? session.player1_voted : session.player2_voted;
    const theirVote = isPlayer1 ? session.player2_voted : session.player1_voted;
    if (movies.length === 0) return;
    if (myVote === 'yes' && theirVote === 'yes') {
      setMatched(code, movies[session.current_movie_index].title);
    } else if (myVote && theirVote && !(myVote === 'yes' && theirVote === 'yes')) {
      const next = (session.current_movie_index + 1) % movies.length;
      advanceMovie(code, next);
    }
  }

  async function handleVote(vote: 'yes' | 'no') {
    if (voted) return;
    setVoted(true);
    await submitVote(code, playerId, isPlayer1, vote);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading movies…</Text>
      </View>
    );
  }

  if (movies.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Couldn't load movies. Check your connection.</Text>
      </View>
    );
  }

  const movie = movies[movieIndex % movies.length];

  return (
    <View style={styles.container}>
      <Image source={{ uri: movie.image }} style={styles.backgroundImage} resizeMode="cover" />
      <View style={styles.overlay}>
        <View style={styles.bottomContent}>
          <Text style={styles.movieTitle}>{movie.title}</Text>
          <Text style={styles.movieMeta}>{movie.year}</Text>
          <Text style={styles.tagline} numberOfLines={2}>{movie.overview}</Text>
          {voted && <Text style={styles.waiting}>Waiting for the other person…</Text>}
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.noButton, voted && styles.dimmed]} onPress={() => handleVote('no')} disabled={voted}>
              <Text style={styles.noText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.yesButton, voted && styles.dimmed]} onPress={() => handleVote('yes')} disabled={voted}>
              <Text style={styles.yesText}>✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#8888aa',
    fontSize: 16,
  },
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomContent: {
    paddingHorizontal: 28,
    paddingBottom: 60,
    paddingTop: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    gap: 8,
  },
  movieTitle: { fontSize: 30, fontWeight: '700', color: '#ffffff', letterSpacing: -0.5 },
  movieMeta: { fontSize: 15, color: '#aaaacc' },
  tagline: { fontSize: 14, color: '#cccccc', lineHeight: 20 },
  waiting: { fontSize: 13, color: '#6c63ff' },
  buttons: { flexDirection: 'row', gap: 20, marginTop: 16 },
  noButton: { flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(42,26,26,0.85)', borderWidth: 2, borderColor: '#ff4455', alignItems: 'center', justifyContent: 'center' },
  noText: { fontSize: 32, color: '#ff4455' },
  yesButton: { flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(26,42,26,0.85)', borderWidth: 2, borderColor: '#44ff88', alignItems: 'center', justifyContent: 'center' },
  yesText: { fontSize: 32, color: '#44ff88' },
  dimmed: { opacity: 0.4 },
});
