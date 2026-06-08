import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  movieTitle: string;
  movieImage?: string;
  onReset: () => void;
};

export default function MatchScreen({ movieTitle, movieImage, onReset }: Props) {
  const emojiScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(28)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(emojiScale, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(contentY, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {movieImage ? (
        <Image source={{ uri: movieImage }} style={styles.poster} resizeMode="cover" />
      ) : null}

      {/* Dark gradient overlay so text is always readable */}
      <View style={styles.overlay} />

      {/* Glow rings — sit on top of overlay, behind content */}
      <Animated.View style={[styles.glowOuter, { transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.glowInner, { transform: [{ scale: glowScale }] }]} />

      <View style={styles.centerContent}>
        <Animated.Text style={[styles.emoji, { transform: [{ scale: emojiScale }] }]}>
          🎬
        </Animated.Text>
        <Animated.View style={[styles.textGroup, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}>
          <Text style={styles.heading}>It's a match!</Text>
          <Text style={styles.movieTitle}>{movieTitle}</Text>
          <Text style={styles.sub}>You both said yes.</Text>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.watchButton} activeOpacity={0.85}>
          <Text style={styles.watchButtonText}>▶  Start watching</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.againButton} onPress={onReset} activeOpacity={0.7}>
          <Text style={styles.againButtonText}>Pick something else</Text>
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
    gap: 0,
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
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  watchButton: {
    backgroundColor: '#6c63ff',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
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
  },
  againButtonText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 16,
  },
});
