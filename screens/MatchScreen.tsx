import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  movieTitle: string;
  onReset: () => void;
};

export default function MatchScreen({ movieTitle, onReset }: Props) {
  const emojiScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(24)).current;
  const glowScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(emojiScale, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(contentY, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Animated.View style={[styles.glowOuter, { transform: [{ scale: glowScale }] }]} />
        <Animated.View style={[styles.glowInner, { transform: [{ scale: glowScale }] }]} />
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
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#6c63ff',
    opacity: 0.07,
  },
  glowInner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#6c63ff',
    opacity: 0.13,
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
    fontSize: 22,
    fontWeight: '600',
    color: '#6c63ff',
    textAlign: 'center',
  },
  sub: {
    fontSize: 15,
    color: '#8888aa',
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
    color: '#8888aa',
    fontSize: 16,
  },
});
