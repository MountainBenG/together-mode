import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { setMatched, submitVote, subscribeToSession } from '../services/sessions';
import { track } from '../services/analytics';
import { Movie } from '../services/movies';

type Phase = 'pick' | 'faceoff' | 'done';

type Props = {
  code: string;
  playerId: string;
  isPlayer1: boolean;
  myYesPicks: Movie[];
  onMatch: (title: string) => void;
};

export default function TiebreakerScreen({ code, playerId, isPlayer1, myYesPicks, onMatch }: Props) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [myPick, setMyPick] = useState<Movie | null>(null);
  const [theirPickTitle, setTheirPickTitle] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    subscriptionRef.current = subscribeToSession(code, handleSessionUpdate);
    return () => subscriptionRef.current?.unsubscribe();
  }, [code]);

  function handleSessionUpdate(session: any) {
    if (session.status === 'matched') {
      onMatch(session.matched_movie_title);
      return;
    }
    const p1 = session.player1_voted;
    const p2 = session.player2_voted;
    if (!p1 || !p2) return;

    if (phase === 'pick') {
      if (p1 === p2) {
        setMatched(code, p1);
      } else {
        setTheirPickTitle(isPlayer1 ? p2 : p1);
        setVoted(false);
        setPhase('faceoff');
      }
    } else if (phase === 'faceoff') {
      const myVote = isPlayer1 ? p1 : p2;
      const theirVote = isPlayer1 ? p2 : p1;
      if (myVote && theirVote) {
        // They agree on one of the two options, or we just pick the most popular
        const winner = myVote === theirVote ? myVote : (Math.random() < 0.5 ? myVote : theirVote);
        setMatched(code, winner);
      }
    }
  }

  async function handlePick(movie: Movie) {
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
          <Text style={styles.subtitle}>No match after 8 movies. Pick your favorite one you liked.</Text>
        </View>
        {myYesPicks.length === 0 ? (
          <View style={styles.noPicks}>
            <Text style={styles.noPicksText}>You didn't vote yes on anything…</Text>
            <Text style={styles.noPicksSub}>Tap below and a random movie will be chosen for you.</Text>
            <TouchableOpacity style={styles.randomButton} onPress={() => handlePick({ id: 0, title: 'Surprise Pick', year: '', overview: '', image: '' })}>
              <Text style={styles.randomButtonText}>Pick for me</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.pickList}>
            {myYesPicks.map((movie) => (
              <TouchableOpacity key={movie.id} style={styles.movieCard} onPress={() => handlePick(movie)}>
                {movie.image ? (
                  <Image source={{ uri: movie.image }} style={styles.movieThumb} resizeMode="cover" />
                ) : null}
                <View style={styles.movieInfo}>
                  <Text style={styles.movieTitle}>{movie.title}</Text>
                  <Text style={styles.movieYear}>{movie.year}</Text>
                </View>
                <Text style={styles.pickArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {myPick && (
          <View style={styles.waiting}>
            <Text style={styles.waitingText}>Waiting for the other person…</Text>
          </View>
        )}
      </View>
    );
  }

  if (phase === 'faceoff') {
    const options = [myPick?.title, theirPickTitle].filter(Boolean) as string[];
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emoji}>⚡</Text>
          <Text style={styles.title}>Final Round</Text>
          <Text style={styles.subtitle}>Your picks didn't match. One last vote — which one?</Text>
        </View>
        <View style={styles.faceoffButtons}>
          {options.map((title) => (
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
        {voted && <Text style={styles.waitingText}>Waiting for the other person…</Text>}
      </View>
    );
  }

  return null;
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
    gap: 14,
  },
  movieThumb: {
    width: 64,
    height: 80,
  },
  movieInfo: {
    flex: 1,
    paddingVertical: 16,
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
  noPicks: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  noPicksText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  noPicksSub: {
    fontSize: 14,
    color: '#8888aa',
    textAlign: 'center',
  },
  randomButton: {
    marginTop: 12,
    backgroundColor: '#6c63ff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
  },
  randomButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  waiting: {
    alignItems: 'center',
    paddingTop: 20,
  },
  waitingText: {
    fontSize: 14,
    color: '#6c63ff',
  },
  faceoffButtons: {
    gap: 16,
    flex: 1,
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
