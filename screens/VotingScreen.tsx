import { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const POSTER_HEIGHT = SCREEN_HEIGHT * 0.55;
import { advanceMovie, setMatched, submitVote, subscribeToSession } from '../services/sessions';

const MOVIES = [
  {
    title: 'Interstellar',
    year: '2014',
    genre: 'Sci-Fi',
    tagline: 'Mankind was born on Earth. It was never meant to die here.',
    image: 'https://picsum.photos/seed/interstellar/400/600',
  },
  {
    title: 'Inception',
    year: '2010',
    genre: 'Thriller',
    tagline: 'Your mind is the scene of the crime.',
    image: 'https://picsum.photos/seed/inception/400/600',
  },
  {
    title: 'The Dark Knight',
    year: '2008',
    genre: 'Action',
    tagline: 'Why so serious?',
    image: 'https://picsum.photos/seed/darkknight/400/600',
  },
  {
    title: 'Knives Out',
    year: '2019',
    genre: 'Mystery',
    tagline: 'Hell of a thing to lose.',
    image: 'https://picsum.photos/seed/knivesout/400/600',
  },
];

type Props = {
  code: string;
  playerId: string;
  isPlayer1: boolean;
  onMatch: (title: string) => void;
};

export default function VotingScreen({ code, playerId, isPlayer1, onMatch }: Props) {
  const [movieIndex, setMovieIndex] = useState(0);
  const [voted, setVoted] = useState(false);
  const subscriptionRef = useRef<any>(null);

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
    if (myVote === 'yes' && theirVote === 'yes') {
      setMatched(code, MOVIES[session.current_movie_index].title);
    } else if (myVote && theirVote && !(myVote === 'yes' && theirVote === 'yes')) {
      const next = (session.current_movie_index + 1) % MOVIES.length;
      advanceMovie(code, next);
    }
  }

  async function handleVote(vote: 'yes' | 'no') {
    if (voted) return;
    setVoted(true);
    await submitVote(code, playerId, isPlayer1, vote);
  }

  const movie = MOVIES[movieIndex];

  return (
    <View style={styles.container}>
      <Image source={{ uri: movie.image }} style={styles.backgroundImage} resizeMode="cover" />
      <View style={styles.overlay}>
        <View style={styles.bottomContent}>
          <Text style={styles.movieTitle}>{movie.title}</Text>
          <Text style={styles.movieMeta}>{movie.genre} • {movie.year}</Text>
          <Text style={styles.tagline}>"{movie.tagline}"</Text>
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
    backgroundColor: 'transparent',
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
  tagline: { fontSize: 14, color: '#cccccc', lineHeight: 20, fontStyle: 'italic' },
  waiting: { fontSize: 13, color: '#6c63ff' },
  buttons: { flexDirection: 'row', gap: 20, marginTop: 16 },
  noButton: { flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(42,26,26,0.85)', borderWidth: 2, borderColor: '#ff4455', alignItems: 'center', justifyContent: 'center' },
  noText: { fontSize: 32, color: '#ff4455' },
  yesButton: { flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(26,42,26,0.85)', borderWidth: 2, borderColor: '#44ff88', alignItems: 'center', justifyContent: 'center' },
  yesText: { fontSize: 32, color: '#44ff88' },
  dimmed: { opacity: 0.4 },
});
