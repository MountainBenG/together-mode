import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import WebView from 'react-native-webview';
import { advanceMovie, setMatched, setTiebreaker, submitVote, subscribeToSession } from '../services/sessions';
import { fetchPopularMovies, fetchTrailerKey, Movie } from '../services/movies';
import { track } from '../services/analytics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TIEBREAKER_AFTER = 8;

// Trailers are OFF for now: YouTube systematically refuses to embed in the iOS
// WebView (error 152/153, every video). The poster is the shipped experience.
// Flip to true once a working embed (react-native-youtube-iframe / a proxy) is in.
const TRAILERS_ENABLED = false;

type Props = {
  code: string;
  playerId: string;
  isPlayer1: boolean;
  onMatch: (title: string, image?: string, moviesSeen?: number, myYesCount?: number) => void;
  onTiebreaker: (myYesPicks: Movie[], allMovies: Movie[]) => void;
};

export default function VotingScreen({ code, playerId, isPlayer1, onMatch, onTiebreaker }: Props) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const moviesRef = useRef<Movie[]>([]);
  const [movieIndex, setMovieIndex] = useState(0);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [trailerFailed, setTrailerFailed] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const myYesPicksRef = useRef<Movie[]>([]);
  const myYesCountRef = useRef(0);

  useEffect(() => {
    fetchPopularMovies()
      .then(data => {
        moviesRef.current = data;
        setMovies(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    subscriptionRef.current = subscribeToSession(code, handleSessionUpdate);
    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [code]);

  // Auto-fetch + autoplay the trailer whenever the current movie changes.
  // Falls back to the poster while loading or if the movie has no trailer.
  useEffect(() => {
    if (movies.length === 0 || !TRAILERS_ENABLED) return;
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

  function handleSessionUpdate(session: any) {
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

  async function handleVote(vote: 'yes' | 'no') {
    if (voted) return;
    setVoted(true);
    if (vote === 'yes') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const currentMovies = moviesRef.current;
    const movie = currentMovies[movieIndex % currentMovies.length];
    track('vote_cast', code, playerId, { vote, movie: movie?.title });
    if (vote === 'yes' && movie) {
      myYesPicksRef.current = [...myYesPicksRef.current, movie];
      myYesCountRef.current += 1;
    }
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

  // Load the trailer through YouTube's IFrame Player API (not a bare embed URL),
  // so we can catch playback failures (onError) and fall back to the poster — and
  // log the real error code, which tells us WHY a given trailer won't embed.
  const trailerHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>html,body{margin:0;padding:0;height:100%;background:#0f0f23;overflow:hidden}#player{position:absolute;top:0;left:0;width:100%;height:100%}</style></head><body><div id="player"></div><script>function post(m){if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(m));}}var s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.body.appendChild(s);var player;function onYouTubeIframeAPIReady(){player=new YT.Player('player',{videoId:'${trailerKey ?? ''}',playerVars:{autoplay:1,mute:${muted ? 1 : 0},playsinline:1,controls:0,rel:0,modestbranding:1},events:{onReady:function(e){try{e.target.playVideo();}catch(err){}post({type:'ready'});},onError:function(e){post({type:'error',code:e.data});}}});}</script></body></html>`;

  return (
    <View style={styles.container}>
      {trailerKey && !trailerFailed ? (
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
      <TouchableOpacity style={styles.codePill} onPress={() => setShowCode(s => !s)} activeOpacity={0.7}>
        <Text style={styles.codePillText}>{showCode ? code : '# code'}</Text>
      </TouchableOpacity>
      {showCode && (
        <View style={styles.codeOverlay}>
          <Text style={styles.codeOverlayLabel}>Session code</Text>
          <Text style={styles.codeOverlayCode}>{code}</Text>
          <Text style={styles.codeOverlaySub}>Share this if the other person gets disconnected</Text>
        </View>
      )}
      <View style={styles.overlay}>
        <View style={styles.bottomContent}>
          <Text style={styles.movieTitle}>{movie.title}</Text>
          <Text style={styles.movieMeta}>{movie.year}</Text>
          <Text style={styles.tagline} numberOfLines={2}>{movie.overview}</Text>
          {trailerKey && (
            <TouchableOpacity onPress={() => setMuted(m => !m)} style={styles.trailerButton}>
              <Text style={styles.trailerButtonText}>{muted ? '🔇 Tap for sound' : '🔊 Sound on'}</Text>
            </TouchableOpacity>
          )}
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
    top: 56,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  codePillText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  codeOverlay: {
    position: 'absolute',
    top: 90,
    left: 20,
    backgroundColor: 'rgba(15,15,35,0.95)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    zIndex: 20,
    gap: 4,
  },
  codeOverlayLabel: {
    fontSize: 11,
    color: '#6c63ff',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  codeOverlayCode: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 4,
  },
  codeOverlaySub: {
    fontSize: 11,
    color: '#555577',
    marginTop: 2,
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
  trailerButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  trailerButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 20, marginTop: 16 },
  noButton: { flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(42,26,26,0.85)', borderWidth: 2, borderColor: '#ff4455', alignItems: 'center', justifyContent: 'center' },
  noText: { fontSize: 32, color: '#ff4455' },
  yesButton: { flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(26,42,26,0.85)', borderWidth: 2, borderColor: '#44ff88', alignItems: 'center', justifyContent: 'center' },
  yesText: { fontSize: 32, color: '#44ff88' },
  dimmed: { opacity: 0.4 },
});
