import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getPlayerId } from './lib/playerId';
import { createSession, joinSession, subscribeToSession } from './services/sessions';
import { track } from './services/analytics';
import { Movie } from './services/movies';
import CodeScreen from './screens/CodeScreen';
import HomeScreen from './screens/HomeScreen';
import JoinScreen from './screens/JoinScreen';
import MatchScreen from './screens/MatchScreen';
import TiebreakerScreen from './screens/TiebreakerScreen';
import VotingScreen from './screens/VotingScreen';

type Screen = 'home' | 'code' | 'join' | 'voting' | 'tiebreaker' | 'match';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [playerId, setPlayerId] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [matchedMovie, setMatchedMovie] = useState('');
  const [myYesPicks, setMyYesPicks] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    getPlayerId().then((id) => {
      setPlayerId(id);
      setLoading(false);
    });
  }, []);

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

  async function handleStart() {
    setLoading(true);
    const code = await createSession(playerId);
    setLoading(false);
    if (code) {
      track('session_started', code, playerId);
      setSessionCode(code);
      setIsPlayer1(true);
      setScreen('code');
    }
  }

  async function handleJoin(code: string) {
    setLoading(true);
    const success = await joinSession(code, playerId);
    setLoading(false);
    if (success) {
      track('session_joined', code, playerId);
      setSessionCode(code);
      setIsPlayer1(false);
      setScreen('voting');
    }
  }

  function handleMatch(title: string) {
    setMatchedMovie(title);
    setScreen('match');
  }

  function handleTiebreaker(yesPicks: Movie[]) {
    setMyYesPicks(yesPicks);
    setScreen('tiebreaker');
  }

  function handleReset() {
    setScreen('home');
    setSessionCode('');
    setMatchedMovie('');
    setMyYesPicks([]);
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
      {screen === 'home' && <HomeScreen onStart={handleStart} onJoin={() => setScreen('join')} />}
      {screen === 'code' && <CodeScreen code={sessionCode} onCancel={handleReset} />}
      {screen === 'join' && <JoinScreen onJoin={handleJoin} onCancel={() => setScreen('home')} />}
      {screen === 'voting' && (
        <VotingScreen
          code={sessionCode}
          playerId={playerId}
          isPlayer1={isPlayer1}
          onMatch={handleMatch}
          onTiebreaker={handleTiebreaker}
        />
      )}
      {screen === 'tiebreaker' && (
        <TiebreakerScreen
          code={sessionCode}
          playerId={playerId}
          isPlayer1={isPlayer1}
          myYesPicks={myYesPicks}
          onMatch={handleMatch}
        />
      )}
      {screen === 'match' && <MatchScreen movieTitle={matchedMovie} onReset={handleReset} />}
    </>
  );
}
