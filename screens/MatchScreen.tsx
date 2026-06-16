import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { restartSession, subscribeToSession } from '../services/sessions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  code: string;
  movieTitle: string;
  movieImage?: string;
  moviesSeen?: number;
  myYesCount?: number;
  byChance?: boolean;
  onRestart: () => void;
  onReset: () => void;
};

export default function MatchScreen({ code, movieTitle, movieImage, moviesSeen, myYesCount, byChance, onRestart, onReset }: Props) {
  const emojiScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(28)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const restarting = useRef(false);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(emojiScale, { toValue: 1, tension: 40, friction: 5, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(contentY, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // When the other player taps "Pick something else", the session status
  // goes back to 'voting' — detect it here so both phones navigate together.
  useEffect(() => {
    const sub = subscribeToSession(code, (session) => {
      if (session.status === 'voting' && !restarting.current) {
        restarting.current = true;
        onRestart();
      }
    });
    return () => { sub.unsubscribe(); };
  }, [code]);

  async function handlePickSomethingElse() {
    if (restarting.current) return;
    restarting.current = true;
    await restartSession(code);
    onRestart();
  }

  async function handleWhereToWatch() {
    const url = `https://www.justwatch.com/us/search?q=${encodeURIComponent(movieTitle)}`;
    try { await WebBrowser.openBrowserAsync(url); } catch {}
  }

  const statLine = byChance
    ? "You couldn't agree — so a coin flip picked one. Fair's fair!"
    : moviesSeen
    ? `Found on movie ${moviesSeen} — you said yes to ${myYesCount ?? 0}`
    : 'You both said yes.';

  return (
    <View style={styles.container}>
      {movieImage ? (
        <Image source={{ uri: movieImage }} style={styles.poster} resizeMode="cover" />
      ) : null}
      <View style={styles.overlay} />
      <Animated.View style={[styles.glowOuter, { transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.glowInner, { transform: [{ scale: glowScale }] }]} />

      <View style={styles.centerContent}>
        <Animated.Text style={[styles.emoji, { transform: [{ scale: emojiScale }] }]}>
          {byChance ? '🪙' : '🎬'}
        </Animated.Text>
        <Animated.View style={[styles.textGroup, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}>
          <Text style={styles.heading}>{byChance ? 'The coin chose!' : "It's a match!"}</Text>
          <Text style={styles.movieTitle}>{movieTitle}</Text>
          <Text style={styles.sub}>{statLine}</Text>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.watchButton} activeOpacity={0.85} onPress={handleWhereToWatch}>
          <Text style={styles.watchButtonText}>Where to watch</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.againButton} onPress={handlePickSomethingElse} activeOpacity={0.7}>
          <Text style={styles.againButtonText}>Pick something else</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onReset} activeOpacity={0.6}>
          <Text style={styles.endText}>End session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 32,
  },
  poster: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(10, 10, 28, 0.72)',
  },
  glowOuter: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#6c63ff',
    opacity: 0.10,
    top: SCREEN_HEIGHT / 2 - 170,
  },
  glowInner: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#6c63ff',
    opacity: 0.16,
    top: SCREEN_HEIGHT / 2 - 95,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 32,
  },
  textGroup: {
    alignItems: 'center',
    gap: 12,
  },
  heading: {
    fontSize: 44,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1.5,
  },
  movieTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6c63ff',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  sub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  watchButton: {
    backgroundColor: '#6c63ff',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  watchButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  againButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  againButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  endText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    paddingVertical: 4,
  },
});
