import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getPlayerId } from './lib/playerId';
import { createSession, joinSession, subscribeToSession } from './services/sessions';
import { track } from './services/analytics';
import { getCurrentUserId } from './services/auth';
import { Profile } from './services/profiles';
import { Movie } from './services/movies';
import { ACCOUNTS_ENABLED, NEW_FLOW_ENABLED } from './lib/flags';
import CodeScreen from './screens/CodeScreen';
import AgePickerScreen from './screens/AgePickerScreen';
import GenreScreen from './screens/GenreScreen';
import HomeScreen from './screens/HomeScreen';
import JoinScreen from './screens/JoinScreen';
import LoginScreen from './screens/LoginScreen';
import WhoIsWatchingScreen from './screens/WhoIsWatchingScreen';
import MatchScreen from './screens/MatchScreen';
import NoMatchScreen from './screens/NoMatchScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import TiebreakerScreen from './screens/TiebreakerScreen';
import VotingScreen from './screens/VotingScreen';

type Screen = 'login' | 'whoswatching' | 'onboarding' | 'home' | 'genre' | 'agepicker' | 'code' | 'join' | 'voting' | 'tiebreaker' | 'match' | 'nomatch';

const ONBOARDING_KEY = '@together_mode_onboarding_seen';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [playerId, setPlayerId] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [alexaPin, setAlexaPin] = useState<number | null>(null);
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [genreId, setGenreId] = useState<number | null>(null);
  const [maxCert, setMaxCert] = useState<string | null>(null);
  const [recSeedIds, setRecSeedIds] = useState<number[]>([]);
  const [activeProfileName, setActiveProfileName] = useState<string | null>(null);
  const [matchedMovie, setMatchedMovie] = useState('');
  const [matchedMovieImage, setMatchedMovieImage] = useState('');
  const [matchMoviesSeen, setMatchMoviesSeen] = useState(0);
  const [matchMyYesCount, setMatchMyYesCount] = useState(0);
  const [matchByChance, setMatchByChance] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [myYesPicks, setMyYesPicks] = useState<Movie[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    Promise.all([
      getPlayerId(),
      AsyncStorage.getItem(ONBOARDING_KEY),
    ]).then(async ([id, seen]) => {
      setPlayerId(id);
      // Accounts on: logged in → pick who's watching; not logged in → login screen.
      if (ACCOUNTS_ENABLED) {
        const userId = await getCurrentUserId();
        setScreen(userId ? 'whoswatching' : 'login');
        setLoading(false);
        return;
      }
      // Flag off = validated flow: skip onboarding, go straight home.
      setScreen(NEW_FLOW_ENABLED && !seen ? 'onboarding' : 'home');
      setLoading(false);
    });
  }, []);

  async function handleOnboardingDone() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setScreen('home');
  }

  // After a successful login/signup, pick who's watching.
  function handleAuthed() {
    setScreen('whoswatching');
  }

  // Picking a profile makes it the active player identity — so taste/recommendations
  // are tracked per person, not per device.
  function handlePickProfile(profile: Profile) {
    setPlayerId(profile.id);
    setActiveProfileName(profile.name);
    AsyncStorage.getItem(ONBOARDING_KEY).then((seen) => {
      setScreen(NEW_FLOW_ENABLED && !seen ? 'onboarding' : 'home');
    });
  }

  // Back to "Who's watching?" to change the active profile.
  function handleSwitchProfile() {
    setScreen('whoswatching');
  }

  // Player 1: wait for player 2 to join
  useEffect(() => {
    if (screen !== 'code' || !sessionCode) return;
    const sub = subscribeToSession(sessionCode, (session) => {
      if (session.status === 'voting') {
        sub.unsubscribe();
        setScreen('voting');
      }
    });
    return () => {
      sub.unsubscribe();
    };
  }, [screen, sessionCode]);

  function handleGenreSelect(selectedGenreId: number | null) {
    setGenreId(selectedGenreId);
    setRecSeedIds([]);
    setScreen('agepicker');
  }

  // "Recommended for you" (movie-level): the host's taste seed replaces the genre filter.
  function handleRecommend(seedIds: number[]) {
    setRecSeedIds(seedIds);
    setGenreId(null);
    setScreen('agepicker');
  }

  // After the age pick: create the session with both filters, then show the code.
  async function handleAgePick(cert: string | null) {
    setLoading(true);
    setMaxCert(cert);
    const result = await createSession(playerId, genreId, cert, recSeedIds);
    setLoading(false);
    if (result) {
      track('session_started', result.code, playerId);
      setSessionCode(result.code);
      setAlexaPin(result.alexaPin);
      setIsPlayer1(true);
      setScreen('code');
    }
  }

  // Validated flow (flag off): start a session immediately, no genre/age picker.
  async function handleStartDirect() {
    setLoading(true);
    const result = await createSession(playerId);
    setLoading(false);
    if (result) {
      track('session_started', result.code, playerId);
      setSessionCode(result.code);
      setAlexaPin(result.alexaPin);
      setIsPlayer1(true);
      setScreen('code');
    }
  }

  async function handleJoin(code: string) {
    setLoading(true);
    setJoinError('');
    const result = await joinSession(code, playerId);
    setLoading(false);
    if (result.ok) {
      track('session_joined', code, playerId);
      setSessionCode(code);
      setGenreId(result.genreId);
      setMaxCert(result.maxCert);
      setRecSeedIds(result.recSeedIds);
      setIsPlayer1(false);
      setScreen('voting');
    } else {
      if (result.reason === 'not_found') {
        setJoinError("That code doesn't exist — ask the other person to check.");
      } else if (result.reason === 'full') {
        setJoinError('Someone already joined that session.');
      } else {
        setJoinError('Something went wrong. Try again.');
      }
    }
  }

  function handleMatch(title: string, image?: string, moviesSeen?: number, myYesCount?: number, byChance?: boolean) {
    setMatchedMovie(title);
    setMatchedMovieImage(image ?? '');
    setMatchMoviesSeen(moviesSeen ?? 0);
    setMatchMyYesCount(myYesCount ?? 0);
    setMatchByChance(byChance ?? false);
    setScreen('match');
  }

  function handleRestart() {
    setMatchedMovie('');
    setMatchedMovieImage('');
    setMatchMoviesSeen(0);
    setMatchMyYesCount(0);
    setMatchByChance(false);
    setMyYesPicks([]);
    setAllMovies([]);
    setScreen('voting');
  }

  function handleTiebreaker(yesPicks: Movie[], movies: Movie[]) {
    setMyYesPicks(yesPicks);
    setAllMovies(movies);
    setScreen('tiebreaker');
  }

  function handleReset() {
    setScreen('home');
    setSessionCode('');
    setGenreId(null);
    setMaxCert(null);
    setRecSeedIds([]);
    setMatchedMovie('');
    setMatchedMovieImage('');
    setMatchByChance(false);
    setMyYesPicks([]);
    setAllMovies([]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f0f23', alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator color="#6c63ff" size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {screen === 'login' && <LoginScreen onAuthed={handleAuthed} />}
      {screen === 'whoswatching' && <WhoIsWatchingScreen onPick={handlePickProfile} />}
      {screen === 'onboarding' && <OnboardingScreen onDone={handleOnboardingDone} />}
      {screen === 'home' && <HomeScreen onStart={NEW_FLOW_ENABLED ? () => setScreen('genre') : handleStartDirect} onJoin={() => setScreen('join')} profileName={ACCOUNTS_ENABLED ? activeProfileName : null} onSwitchProfile={ACCOUNTS_ENABLED ? handleSwitchProfile : undefined} />}
      {screen === 'genre' && <GenreScreen playerId={playerId} onSelect={handleGenreSelect} onRecommend={handleRecommend} />}
      {screen === 'agepicker' && <AgePickerScreen onPick={handleAgePick} onCancel={() => setScreen('genre')} />}
      {screen === 'code' && <CodeScreen code={sessionCode} alexaPin={alexaPin} onCancel={handleReset} />}
      {screen === 'join' && <JoinScreen onJoin={handleJoin} onCancel={() => { setJoinError(''); setScreen('home'); }} externalError={joinError} />}
      {screen === 'voting' && (
        <VotingScreen
          code={sessionCode}
          playerId={playerId}
          isPlayer1={isPlayer1}
          genreId={genreId}
          maxCert={maxCert}
          recSeedIds={recSeedIds}
          onMatch={handleMatch}
          onTiebreaker={handleTiebreaker}
          onNoMatch={() => setScreen('nomatch')}
        />
      )}
      {screen === 'tiebreaker' && (
        <TiebreakerScreen
          code={sessionCode}
          playerId={playerId}
          isPlayer1={isPlayer1}
          myYesPicks={myYesPicks}
          allMovies={allMovies}
          onMatch={handleMatch}
          onNoMatch={handleReset}
        />
      )}
      {screen === 'match' && (
        <MatchScreen
          code={sessionCode}
          movieTitle={matchedMovie}
          movieImage={matchedMovieImage}
          moviesSeen={matchMoviesSeen}
          myYesCount={matchMyYesCount}
          byChance={matchByChance}
          onRestart={handleRestart}
          onReset={handleReset}
        />
      )}
      {screen === 'nomatch' && <NoMatchScreen onReset={handleReset} />}
    </>
  );
}
