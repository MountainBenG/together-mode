import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { clearTiebreakerVotes, setMatched, submitVote, subscribeToSession } from '../services/sessions';
import { track } from '../services/analytics';
import { Movie } from '../services/movies';

type Phase = 'pick' | 'faceoff';

type Props = {
  code: string;
  playerId: string;
  isPlayer1: boolean;
  myYesPicks: Movie[];
  allMovies: Movie[];
  onMatch: (title: string) => void;
};

export default function TiebreakerScreen({ code, playerId, isPlayer1, myYesPicks, allMovies, onMatch }: Props) {
  const pickList = myYesPicks.length > 0 ? myYesPicks : allMovies.slice(0, 8);
  const [phase, setPhase] = useState<Phase>('pick');
  const phaseRef = useRef<Phase>('pick');
  const [myPick, setMyPick] = useState<Movie | null>(null);
  const [theirPickTitle, setTheirPickTitle] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    const sub = subscribeToSession(code, handleSessionUpdate);
    return () => { sub.unsubscribe(); };
  }, [code]);

  function enterFaceoff(theirTitle: string) {
    phaseRef.current = 'faceoff';
    setTheirPickTitle(theirTitle);
    setVoted(false);
    setPhase('faceoff');
    clearTiebreakerVotes(code);
  }

  function handleSessionUpdate(session: any) {
    if (session.status === 'matched') {
      onMatch(session.matched_movie_title);
      return;
    }
    const p1 = session.player1_voted as string | null;
    const p2 = session.player2_voted as string | null;
    if (!p1 || !p2) return;

    if (phaseRef.current === 'pick') {
      if (p1 === p2) {
        setMatched(code, p1);
      } else {
        enterFaceoff(isPlayer1 ? p2 : p1);
      }
    } else if (phaseRef.current === 'faceoff') {
      const winner = p1 === p2 ? p1 : Math.random() < 0.5 ? p1 : p2;
      setMatched(code, winner);
    }
  }

  async function handlePick(movie: Movie) {
    if (myPick) return;
    setMyPick(movie);
    track('tiebreaker_pick_submitted', code, playerId, { movie: movie.title });
    await submitVote(code, playerId, isPlayer1, movie.title as any);
  }

  async function handleFaceoffVote(title: string) {
    if (voted) return;
    setVoted(true);
    await submitVote(code, playerId, isPlayer1, title as any);
  }

  if (phase === 'pick') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🎬</Text>
          <Text style={styles.title}>Tiebreaker!</Text>
          <Text style={styles.subtitle}>8 movies, no match. Pick your favorite one you said yes to.</Text>
        </View>

        {myYesPicks.length === 0 && (
          <Text style={styles.noPicksNote}>You didn't vote yes on anything — pick one of these:</Text>
        )}
        <ScrollView contentContainerStyle={styles.pickList} showsVerticalScrollIndicator={false}>
          {pickList.map((movie) => (
            <TouchableOpacity
              key={movie.id}
              style={[styles.movieCard, myPick?.id === movie.id && styles.movieCardSelected]}
              onPress={() => handlePick(movie)}
              disabled={!!myPick}
            >
              {movie.image ? (
                <Image source={{ uri: movie.image }} style={styles.movieThumb} resizeMode="cover" />
              ) : null}
              <View style={styles.movieInfo}>
                <Text style={styles.movieTitle}>{movie.title}</Text>
                <Text style={styles.movieYear}>{movie.year}</Text>
              </View>
              {myPick?.id === movie.id ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : (
                <Text style={styles.pickArrow}>→</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {myPick && (
          <View style={styles.waitingRow}>
            <Text style={styles.waitingText}>Waiting for the other person…</Text>
          </View>
        )}
      </View>
    );
  }

  const faceoffOptions = [myPick?.title, theirPickTitle].filter(Boolean) as string[];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>⚡</Text>
        <Text style={styles.title}>Final Round</Text>
        <Text style={styles.subtitle}>Your picks didn't match. One last vote — which one?</Text>
      </View>
      <View style={styles.faceoffList}>
        {faceoffOptions.map((title) => (
          <TouchableOpacity
            key={title}
            style={[styles.faceoffCard, voted && styles.dimmed]}
            onPress={() => handleFaceoffVote(title)}
            disabled={voted}
          >
            <Text style={styles.faceoffTitle}>{title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {voted && (
        <View style={styles.waitingRow}>
          <Text style={styles.waitingText}>Waiting for the other person…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  emoji: {
    fontSize: 52,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#8888aa',
    textAlign: 'center',
    lineHeight: 22,
  },
  pickList: {
    gap: 12,
    paddingBottom: 20,
  },
  movieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a3a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    overflow: 'hidden',
  },
  movieCardSelected: {
    borderColor: '#6c63ff',
    backgroundColor: '#1e1e4a',
  },
  movieThumb: {
    width: 64,
    height: 80,
  },
  movieInfo: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 14,
    gap: 4,
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  movieYear: {
    fontSize: 13,
    color: '#6c63ff',
  },
  pickArrow: {
    fontSize: 18,
    color: '#6c63ff',
    paddingRight: 16,
  },
  checkmark: {
    fontSize: 20,
    color: '#44ff88',
    paddingRight: 16,
    fontWeight: '700',
  },
  noPicksNote: {
    fontSize: 14,
    color: '#8888aa',
    marginBottom: 12,
    textAlign: 'center',
  },
  waitingRow: {
    alignItems: 'center',
    paddingTop: 20,
  },
  waitingText: {
    fontSize: 14,
    color: '#6c63ff',
  },
  faceoffList: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  faceoffCard: {
    backgroundColor: '#1a1a3a',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#6c63ff',
    padding: 28,
    alignItems: 'center',
  },
  faceoffTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  dimmed: {
    opacity: 0.4,
  },
});
