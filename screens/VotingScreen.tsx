import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import WebView from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { advanceMovie, finishVoting, setMatched, setTiebreaker, submitVote, subscribeToSession } from '../services/sessions';
import { fetchCertification, fetchPopularMovies, fetchRecommendedMovies, fetchTrailerKey, GENRES, Movie } from '../services/movies';
import { recordLikedMovie, recordVote } from '../services/preferences';
import { track } from '../services/analytics';
import { ASYNC_VOTING_ENABLED, MOVIE_RECS_ENABLED, VOICE_ENABLED } from '../lib/flags';
import { useVoiceVoting } from '../hooks/useVoiceVoting';

const TIEBREAKER_AFTER = 8;

// Trailers are OFF for now: YouTube systematically refuses to embed in the iOS
// WebView (error 152/153, every video). The poster is the shipped experience.
// Flip to true once a working embed (react-native-youtube-iframe / a proxy) is in.
const TRAILERS_ENABLED = false;

// Realtime can deliver a jsonb column as either a parsed array or a JSON string,
// and the ids inside can be numbers or numeric strings. Coerce to a clean
// number[] so the mutual-yes intersection is reliable across both phones.
function asIdArray(value: any): number[] {
  const arr = typeof value === 'string' ? safeParseArray(value) : value;
  return Array.isArray(arr) ? arr.map((x: any) => Number(x)).filter((n) => !Number.isNaN(n)) : [];
}

function safeParseArray(s: string): any {
  try { return JSON.parse(s); } catch { return []; }
}

type Props = {
  code: string;
  playerId: string;
  isPlayer1: boolean;
  genreId?: number | null;
  maxCert?: string | null;
  recSeedIds?: number[];
  onMatch: (title: string, image?: string, moviesSeen?: number, myYesCount?: number) => void;
  onTiebreaker: (myYesPicks: Movie[], allMovies: Movie[]) => void;
  onNoMatch: () => void;
};

export default function VotingScreen({ code, playerId, isPlayer1, genreId, maxCert, recSeedIds, onMatch, onTiebreaker, onNoMatch }: Props) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const moviesRef = useRef<Movie[]>([]);
  const [movieIndex, setMovieIndex] = useState(0);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [trailerFailed, setTrailerFailed] = useState(false);
  const [cert, setCert] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const myYesPicksRef = useRef<Movie[]>([]);
  const myYesCountRef = useRef(0);
  const [iAmDone, setIAmDone] = useState(false); // async voting: I've voted on every movie, waiting for the other player
  const advancingRef = useRef(false); // async voting: guards double-tap during the local advance
  const infoPulse = useRef(new Animated.Value(1)).current; // gentle "press me" pulse on the info button

  useEffect(() => {
    const useRecs = MOVIE_RECS_ENABLED && !!recSeedIds && recSeedIds.length > 0;
    (useRecs ? fetchRecommendedMovies(recSeedIds!, maxCert) : fetchPopularMovies(genreId, maxCert))
      .then(async (data) => {
        let list = data;
        // If recs come back thin (after the age filter, etc.), top up with popular so the
        // deck is never too short to vote through.
        if (useRecs && list.length < TIEBREAKER_AFTER) {
          const filler = await fetchPopularMovies(genreId, maxCert);
          const seen = new Set(list.map((m) => m.id));
          list = [...list, ...filler.filter((m) => !seen.has(m.id))];
        }
        moviesRef.current = list;
        setMovies(list);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    subscriptionRef.current = subscribeToSession(code, handleSessionUpdate);
    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [code]);

  // Fetch the current movie's trailer key for the "Watch trailer" button (opens
  // it in the in-app browser). Inline embed stays off — YouTube blocks it (152/153).
  useEffect(() => {
    if (movies.length === 0) return;
    let cancelled = false;
    setTrailerKey(null);
    setMuted(true);
    setTrailerFailed(false);
    fetchTrailerKey(movies[movieIndex % movies.length].id).then(key => {
      if (!cancelled) setTrailerKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [movieIndex, movies]);

  // Fetch the current movie's US age rating for the corner badge.
  useEffect(() => {
    if (movies.length === 0) return;
    let cancelled = false;
    setCert(null);
    fetchCertification(movies[movieIndex % movies.length].id).then(c => {
      if (!cancelled) setCert(c);
    });
    return () => {
      cancelled = true;
    };
  }, [movieIndex, movies]);

  // Gentle continuous pulse so the info button invites a tap (feels alive, not "stuck there").
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(infoPulse, { toValue: 1.05, duration: 750, useNativeDriver: true }),
        Animated.timing(infoPulse, { toValue: 1.0, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  function handleSessionUpdate(session: any) {
    if (ASYNC_VOTING_ENABLED) return handleSessionUpdateAsync(session);
    if (session.status === 'matched') {
      const matchedMovie = moviesRef.current.find(m => m.title === session.matched_movie_title);
      onMatch(session.matched_movie_title, matchedMovie?.image, session.current_movie_index + 1, myYesCountRef.current);
      return;
    }
    if (session.status === 'tiebreaker') {
      onTiebreaker(myYesPicksRef.current, moviesRef.current);
      return;
    }
    if (session.current_movie_index !== movieIndex) {
      setMovieIndex(session.current_movie_index);
      setVoted(false);
    }
    const myVote = isPlayer1 ? session.player1_voted : session.player2_voted;
    const theirVote = isPlayer1 ? session.player2_voted : session.player1_voted;
    const currentMovies = moviesRef.current;
    if (currentMovies.length === 0) return;
    if (myVote === 'yes' && theirVote === 'yes') {
      track('match_found', code, playerId, { movie: currentMovies[session.current_movie_index]?.title });
      setMatched(code, currentMovies[session.current_movie_index].title);
    } else if (myVote && theirVote && !(myVote === 'yes' && theirVote === 'yes')) {
      if (session.current_movie_index >= TIEBREAKER_AFTER - 1) {
        track('tiebreaker_started', code, playerId);
        setTiebreaker(code);
      } else {
        const next = session.current_movie_index + 1;
        advanceMovie(code, next);
      }
    }
  }

  // Async voting: the mutual-yes set = movies BOTH players said yes to. Computed
  // off the row payload (player1_yes ∩ player2_yes) so both phones agree on it.
  function computeMutualMovies(session: any): Movie[] {
    const p1 = asIdArray(session.player1_yes);
    const p2 = asIdArray(session.player2_yes);
    const p2set = new Set(p2);
    const mutualIds = p1.filter((id) => p2set.has(id));
    return mutualIds
      .map((id) => moviesRef.current.find((m) => m.id === id))
      .filter((m): m is Movie => !!m);
  }

  function handleSessionUpdateAsync(session: any) {
    if (session.status === 'matched') {
      const matchedMovie = moviesRef.current.find((m) => m.title === session.matched_movie_title);
      onMatch(session.matched_movie_title, matchedMovie?.image, TIEBREAKER_AFTER, myYesCountRef.current);
      return;
    }
    if (session.status === 'tiebreaker') {
      onTiebreaker(computeMutualMovies(session), moviesRef.current);
      return;
    }
    // Resolve only once BOTH players have finished voting on every movie.
    if (!session.player1_done || !session.player2_done) return;
    const mutual = computeMutualMovies(session);
    if (mutual.length === 1) {
      track('match_found', code, playerId, { movie: mutual[0].title });
      setMatched(code, mutual[0].title);
    } else if (mutual.length >= 2) {
      track('tiebreaker_started', code, playerId);
      setTiebreaker(code);
    } else {
      track('no_match', code, playerId);
      onNoMatch();
    }
  }

  const voice = useVoiceVoting((vote) => {
    if (VOICE_ENABLED) handleVote(vote);
  });

  async function handleVote(vote: 'yes' | 'no') {
    if (ASYNC_VOTING_ENABLED) return handleVoteAsync(vote);
    if (voted) return;
    setVoted(true);
    if (vote === 'yes') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const currentMovies = moviesRef.current;
    const movie = currentMovies[movieIndex % currentMovies.length];
    track('vote_cast', code, playerId, { vote, movie: movie?.title });
    if (movie) recordVote(playerId, movie.genreIds, vote); // fire-and-forget: builds the prefs profile
    if (vote === 'yes' && movie) {
      myYesPicksRef.current = [...myYesPicksRef.current, movie];
      myYesCountRef.current += 1;
      recordLikedMovie(playerId, movie.id); // movie-level taste, for "because you liked X" recs
    }
    await submitVote(code, playerId, isPlayer1, vote);
  }

  // Async voting: record the vote locally and immediately advance to the next
  // movie at this phone's own pace — no waiting on the other player. Once this
  // phone has voted on every movie, write its whole yes-list + done flag; the
  // resolution runs once BOTH phones are done (handleSessionUpdateAsync).
  async function handleVoteAsync(vote: 'yes' | 'no') {
    if (iAmDone || advancingRef.current) return;
    advancingRef.current = true;
    Haptics.impactAsync(vote === 'yes' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
    const currentMovies = moviesRef.current;
    const movie = currentMovies[movieIndex];
    track('vote_cast', code, playerId, { vote, movie: movie?.title });
    if (movie) recordVote(playerId, movie.genreIds, vote); // fire-and-forget: builds the prefs profile
    if (vote === 'yes' && movie) {
      myYesPicksRef.current = [...myYesPicksRef.current, movie];
      myYesCountRef.current += 1;
      recordLikedMovie(playerId, movie.id); // movie-level taste, for "because you liked X" recs
    }
    const nextIndex = movieIndex + 1;
    if (nextIndex >= TIEBREAKER_AFTER) {
      await finishVoting(code, isPlayer1, myYesPicksRef.current.map((m) => m.id));
      setIAmDone(true);
    } else {
      setMovieIndex(nextIndex);
    }
    advancingRef.current = false;
  }

  // Open the movie's trailer in the in-app browser (YouTube plays fine here —
  // the 152/153 wall was only about embedding it inline). Done returns to voting.
  async function handleWatchTrailer() {
    if (!trailerKey) return;
    try {
      await WebBrowser.openBrowserAsync(`https://www.youtube.com/watch?v=${trailerKey}`);
    } catch {}
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

  // Async voting: I've voted on every movie — wait (once) for the other player to finish.
  if (ASYNC_VOTING_ENABLED && iAmDone) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.doneEmoji}>✅</Text>
        <Text style={styles.doneTitle}>You're done!</Text>
        <Text style={styles.doneSubtitle}>Waiting for the other person to finish voting…</Text>
        <ActivityIndicator size="large" color="#6c63ff" style={{ marginTop: 12 }} />
      </View>
    );
  }

  const movie = movies[movieIndex % movies.length];
  const genreNames = movie.genreIds
    .map((id) => GENRES.find((g) => g.id === id)?.name)
    .filter((n): n is string => !!n);

  // Load the trailer through YouTube's IFrame Player API (not a bare embed URL),
  // so we can catch playback failures (onError) and fall back to the poster — and
  // log the real error code, which tells us WHY a given trailer won't embed.
  const trailerHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>html,body{margin:0;padding:0;height:100%;background:#0f0f23;overflow:hidden}#player{position:absolute;top:0;left:0;width:100%;height:100%}</style></head><body><div id="player"></div><script>function post(m){if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(m));}}var s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.body.appendChild(s);var player;function onYouTubeIframeAPIReady(){player=new YT.Player('player',{videoId:'${trailerKey ?? ''}',playerVars:{autoplay:1,mute:${muted ? 1 : 0},playsinline:1,controls:0,rel:0,modestbranding:1},events:{onReady:function(e){try{e.target.playVideo();}catch(err){}post({type:'ready'});},onError:function(e){post({type:'error',code:e.data});}}});}</script></body></html>`;

  return (
    <View style={styles.container}>
      {TRAILERS_ENABLED && trailerKey && !trailerFailed ? (
        <WebView
          source={{ html: trailerHtml, baseUrl: 'https://www.youtube.com' }}
          originWhitelist={['*']}
          style={styles.backgroundImage}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={false}
          onMessage={(e) => {
            try {
              const m = JSON.parse(e.nativeEvent.data);
              if (m.type === 'error') {
                console.log('[trailer] YouTube embed error code', m.code, 'for', movie.title);
                setTrailerFailed(true);
              }
            } catch {}
          }}
        />
      ) : (
        <Image source={{ uri: movie.image }} style={styles.backgroundImage} resizeMode="cover" />
      )}
      <View style={styles.progressPill}>
        <Text style={styles.progressText}>Movie {Math.min(movieIndex + 1, TIEBREAKER_AFTER)} of {TIEBREAKER_AFTER}</Text>
      </View>
      <View style={styles.codePill}>
        <Text style={styles.codePillLabel}>SESSION CODE</Text>
        <Text style={styles.codePillText}>{code}</Text>
      </View>
      {cert && (
        <View style={styles.certPill}>
          <Text style={styles.certText}>{cert}</Text>
        </View>
      )}
      <View style={styles.overlay}>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']} locations={[0, 0.35, 1]} style={styles.bottomContent}>
          <Text style={styles.movieTitle}>{movie.title}</Text>
          <Text style={styles.movieMeta}>{movie.year}</Text>
          <Text style={styles.tagline} numberOfLines={2}>{movie.overview}</Text>
          <Animated.View style={[styles.infoButtonWrap, { transform: [{ scale: infoPulse }] }]}>
            <TouchableOpacity onPress={() => setShowInfo(true)} activeOpacity={0.85}>
              <LinearGradient colors={['#ffd84d', '#ff9b2f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.infoButton}>
                <Text style={styles.infoButtonText}>🎬  Information on the movie</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          {trailerKey && (
            <TouchableOpacity onPress={handleWatchTrailer} style={styles.trailerButton}>
              <Text style={styles.trailerButtonText}>▶  Watch trailer</Text>
            </TouchableOpacity>
          )}
          {voted && <Text style={styles.waiting}>Waiting for the other person to vote…</Text>}
          {VOICE_ENABLED && voice.transcript !== '' && !voted && (
            <Text style={styles.voiceTranscript}>"{voice.transcript}"</Text>
          )}
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.noButton, voted && styles.dimmed]} onPress={() => handleVote('no')} disabled={voted}>
              <Text style={styles.noText}>✕</Text>
            </TouchableOpacity>
            {VOICE_ENABLED && (
              <TouchableOpacity
                style={[styles.micButton, voice.listening && styles.micButtonActive, voted && styles.dimmed]}
                onPressIn={voice.startListening}
                onPressOut={voice.stopListening}
                disabled={voted}
              >
                <Text style={styles.micText}>{voice.listening ? '🔴' : '🎤'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.yesButton, voted && styles.dimmed]} onPress={() => handleVote('yes')} disabled={voted}>
              <Text style={styles.yesText}>✓</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
      <Modal visible={showInfo} transparent animationType="slide" onRequestClose={() => setShowInfo(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{movie.title}</Text>
            <Text style={styles.modalMeta}>
              {movie.year}{cert ? `   ·   ${cert}` : ''}{movie.rating && movie.voteCount >= 50 ? `   ·   ⭐ ${movie.rating.toFixed(1)}` : ''}
            </Text>
            {genreNames.length > 0 && <Text style={styles.modalGenres}>{genreNames.join('    ·    ')}</Text>}
            <ScrollView style={styles.modalOverviewScroll} contentContainerStyle={{ paddingBottom: 8 }}>
              <Text style={styles.modalOverview}>{movie.overview || 'No description available.'}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowInfo(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  doneEmoji: { fontSize: 64 },
  doneTitle: { fontSize: 30, fontWeight: '800', color: '#ffffff' },
  doneSubtitle: { fontSize: 18, color: '#8888aa', textAlign: 'center', paddingHorizontal: 40, lineHeight: 26 },
  container: {
    flex: 1,
  },
  progressPill: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  progressText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  codePill: {
    position: 'absolute',
    top: 52,
    left: 20,
    backgroundColor: 'rgba(10,10,28,0.75)',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.4)',
    zIndex: 10,
    gap: 4,
  },
  codePillLabel: {
    color: '#6c63ff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
  },
  codePillText: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 6,
  },
  certPill: {
    position: 'absolute',
    top: 56,
    right: 20,
    backgroundColor: 'rgba(10,10,28,0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
  },
  certText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomContent: {
    paddingHorizontal: 28,
    paddingBottom: 60,
    paddingTop: 80,
    gap: 8,
  },
  movieTitle: { fontSize: 34, fontWeight: '700', color: '#ffffff', letterSpacing: -0.5 },
  movieMeta: { fontSize: 18, color: '#aaaacc' },
  tagline: { fontSize: 17, color: '#cccccc', lineHeight: 24 },
  waiting: { fontSize: 24, fontWeight: '700', color: '#6c63ff', textAlign: 'center', marginTop: 4 },
  trailerButton: { alignSelf: 'stretch', paddingVertical: 22, paddingHorizontal: 20, borderRadius: 16, backgroundColor: '#6c63ff', alignItems: 'center', marginVertical: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)' },
  trailerButtonText: { color: '#ffffff', fontSize: 25, fontWeight: '800', letterSpacing: 0.5 },
  buttons: { flexDirection: 'row', gap: 20, marginTop: 16, alignItems: 'center' },
  noButton: { flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(42,26,26,0.85)', borderWidth: 2, borderColor: '#ff4455', alignItems: 'center', justifyContent: 'center' },
  noText: { fontSize: 40, color: '#ff4455' },
  yesButton: { flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(26,42,26,0.85)', borderWidth: 2, borderColor: '#44ff88', alignItems: 'center', justifyContent: 'center' },
  yesText: { fontSize: 40, color: '#44ff88' },
  micButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(108,99,255,0.2)', borderWidth: 2, borderColor: '#6c63ff', alignItems: 'center', justifyContent: 'center' },
  micButtonActive: { backgroundColor: 'rgba(108,99,255,0.5)', borderColor: '#ffffff' },
  micText: { fontSize: 22 },
  voiceTranscript: { fontSize: 13, color: '#6c63ff', fontStyle: 'italic', textAlign: 'center' },
  dimmed: { opacity: 0.4 },
  infoButtonWrap: { alignSelf: 'stretch', marginTop: 14, marginBottom: 4, borderRadius: 18, shadowColor: '#ffb020', shadowOpacity: 0.85, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  infoButton: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, borderRadius: 18 },
  infoButtonText: { color: '#2a1c00', fontSize: 25, fontWeight: '900', letterSpacing: 0.4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#171733', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40, maxHeight: '78%', gap: 12, borderTopWidth: 1, borderColor: 'rgba(108,99,255,0.4)' },
  modalTitle: { fontSize: 30, fontWeight: '800', color: '#ffffff' },
  modalMeta: { fontSize: 17, color: '#aaaacc', fontWeight: '600' },
  modalGenres: { fontSize: 16, color: '#6c63ff', fontWeight: '700' },
  modalOverviewScroll: { maxHeight: 280, marginTop: 4 },
  modalOverview: { fontSize: 18, color: '#dddde8', lineHeight: 27 },
  modalClose: { marginTop: 8, backgroundColor: '#6c63ff', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  modalCloseText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
});
