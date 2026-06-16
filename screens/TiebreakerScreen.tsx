import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { clearTiebreakerVotes, setMatched, submitVote, subscribeToSession } from '../services/sessions';
import { track } from '../services/analytics';
import { Movie } from '../services/movies';

type Phase = 'pick' | 'faceoff' | 'flip';

type Props = {
  code: string;
  playerId: string;
  isPlayer1: boolean;
  myYesPicks: Movie[];
  allMovies: Movie[];
  onMatch: (title: string, image?: string, moviesSeen?: number, myYesCount?: number, byChance?: boolean) => void;
  onNoMatch: () => void; // kept for API compatibility; the tiebreaker now always resolves
};

// Deterministic coin flip: both phones derive the SAME winner from shared inputs
// (session code + the two finalist titles, sorted so order doesn't matter), so they
// always land on the same movie — no extra round-trip, no random mismatch between devices.
function pickWinner(code: string, titleA: string, titleB: string): string {
  const pair = [titleA, titleB].sort();
  const seed = `${code}|${pair[0]}|${pair[1]}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return pair[Math.abs(h) % 2];
}

export default function TiebreakerScreen({ code, playerId, isPlayer1, myYesPicks, allMovies, onMatch }: Props) {
  const rawPickList = myYesPicks.length > 0 ? myYesPicks : allMovies.slice(0, 8);
  // Guard duplicate ids so React keys stay unique (no "two children with the same key").
  const pickList = rawPickList.filter((m, i) => rawPickList.findIndex(x => x.id === m.id) === i);
  const [phase, setPhase] = useState<Phase>('pick');
  const phaseRef = useRef<Phase>('pick');
  const [myPick, setMyPick] = useState<Movie | null>(null);
  const [theirPickTitle, setTheirPickTitle] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  // Coin-flip phase state.
  const [finalists, setFinalists] = useState<string[]>([]);
  const [winnerIndex, setWinnerIndex] = useState(0);
  const [settled, setSettled] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sub = subscribeToSession(code, handleSessionUpdate);
    return () => { sub.unsubscribe(); };
  }, [code]);

  // Spin the coin (5 full rotations, decelerating) and land showing the winner's face,
  // then persist the match. Both phones land on the same (deterministic) winner.
  useEffect(() => {
    if (phase !== 'flip') return;
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 2000,
      easing: Easing.linear, // linear time + a parabolic height curve = real "gravity" toss
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setSettled(true);
      setTimeout(() => setMatched(code, finalists[winnerIndex]), 1200);
    });
  }, [phase]);

  function enterFaceoff(theirTitle: string) {
    phaseRef.current = 'faceoff';
    setTheirPickTitle(theirTitle);
    setVoted(false);
    setPhase('faceoff');
    clearTiebreakerVotes(code);
  }

  function enterFlip(titleA: string, titleB: string) {
    phaseRef.current = 'flip';
    const pair = [titleA, titleB];
    const winner = pickWinner(code, titleA, titleB);
    setFinalists(pair);
    setWinnerIndex(pair.indexOf(winner));
    track('tiebreaker_started', code, playerId, { finalists: pair, winner, byCoin: true });
    setPhase('flip');
  }

  function handleSessionUpdate(session: any) {
    if (session.status === 'matched') {
      const all = [...myYesPicks, ...allMovies];
      const matchedMovie = all.find(m => m.title === session.matched_movie_title);
      onMatch(session.matched_movie_title, matchedMovie?.image, 8, myYesPicks.length, phaseRef.current === 'flip');
      return;
    }
    if (phaseRef.current === 'flip') return; // winner already decided — ignore vote updates
    const p1 = session.player1_voted as string | null;
    const p2 = session.player2_voted as string | null;
    if (!p1 || !p2) return;

    if (phaseRef.current === 'pick') {
      if (p1 === p2) {
        setMatched(code, p1); // both picked the same — real match
      } else {
        enterFaceoff(isPlayer1 ? p2 : p1);
      }
    } else if (phaseRef.current === 'faceoff') {
      if (p1 === p2) {
        setMatched(code, p1); // agreed on the second vote — real match
      } else {
        enterFlip(p1, p2); // still disagree — let the coin decide
      }
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
          <Text style={styles.subtitle}>You both liked a few of these. Pick your favorite one.</Text>
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

  if (phase === 'faceoff') {
    const faceoffOptions = [myPick?.title, theirPickTitle].filter(Boolean) as string[];
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emoji}>⚡</Text>
          <Text style={styles.title}>Final Round</Text>
          <Text style={styles.subtitle}>You picked different movies. One more vote — which one wins? (Still can't agree? A coin flip decides.)</Text>
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

  // Coin-flip phase. The coin arcs up and back down (translateY), grows near the apex
  // for depth, and spins 6 full turns so it lands face-up on the winner.
  const spin = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '2880deg'] }); // 8 fast flips
  const lift = flipAnim.interpolate({
    // parabola peaking at the midpoint — fast off the launch + into the catch, hangs at the top
    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    outputRange: [0, -83, -147, -193, -221, -230, -221, -193, -147, -83, 0],
  });
  const grow = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 1] });
  const shadowScale = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.5, 1] });
  const shadowFade = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.1, 0.5] });
  const winner = finalists[winnerIndex];
  const loser = finalists[1 - winnerIndex];
  const coinFace = (label: string, isBack: boolean) => (
    <LinearGradient
      colors={['#fff3c4', '#ffd451', '#c87f05']}
      start={{ x: 0.2, y: 0.05 }}
      end={{ x: 0.8, y: 0.95 }}
      style={[styles.coinFace, isBack && styles.coinBack]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.65)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.7 }}
        style={styles.coinSheen}
      />
      <View style={styles.coinInner}>
        <Text style={styles.coinEmoji}>🎬</Text>
        <Text style={styles.coinFaceText} numberOfLines={2}>{label}</Text>
      </View>
    </LinearGradient>
  );
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{settled ? '🎉 The coin decided!' : 'Flipping a coin…'}</Text>
        <Text style={styles.subtitle}>
          {settled ? `It landed on “${winner}”` : "You still couldn't agree — so a fair coin flip settles it."}
        </Text>
      </View>
      <View style={styles.coinArea}>
        <Animated.View style={[styles.coinShadow, { opacity: shadowFade, transform: [{ scaleX: shadowScale }] }]} />
        <Animated.View
          style={[styles.coin, { transform: [{ perspective: 900 }, { translateY: lift }, { scale: grow }, { rotateX: spin }] }]}
        >
          {coinFace(winner, false)}
          {coinFace(loser, true)}
        </Animated.View>
      </View>
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
    textAlign: 'center',
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
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  dimmed: {
    opacity: 0.4,
  },
  coinArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinShadow: {
    position: 'absolute',
    bottom: 80,
    width: 200,
    height: 32,
    borderRadius: 100,
    backgroundColor: '#000000',
  },
  coin: {
    width: 240,
    height: 240,
  },
  coinFace: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: '#9c6303',
  },
  coinSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  coinBack: {
    transform: [{ rotateX: '180deg' }],
  },
  coinInner: {
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 2,
    borderColor: 'rgba(120,70,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  coinEmoji: {
    fontSize: 46,
  },
  coinFaceText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#5a3a00',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
