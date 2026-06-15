import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onStart: () => void;
  onJoin: () => void;
};

export default function HomeScreen({ onStart, onJoin }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconGlow} />
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>🎬</Text>
        </View>
        <Text style={styles.title}>Together Mode</Text>
        <Text style={styles.subtitle}>Two phones. One pick.</Text>
        <Text style={styles.description}>
          Each person votes on movies independently.{'\n'}When you both say yes — that's tonight's watch.
        </Text>
      </View>
      <View style={styles.actions}>
        <Text style={styles.howTo}>One of you starts and gets a code — the other joins with it.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onStart}>
          <Text style={styles.primaryButtonText}>Start a session</Text>
          <Text style={styles.primaryButtonHint}>You'll get a code to share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onJoin}>
          <Text style={styles.secondaryButtonText}>Join a session</Text>
          <Text style={styles.secondaryButtonHint}>Enter a code from the other phone</Text>
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
    paddingTop: 100,
    paddingBottom: 64,
    paddingHorizontal: 32,
  },
  hero: {
    alignItems: 'center',
    gap: 16,
  },
  iconGlow: {
    position: 'absolute',
    top: -20,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#6c63ff',
    opacity: 0.08,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1a1a3a',
    borderWidth: 1.5,
    borderColor: '#6c63ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconEmoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#6c63ff',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 18,
    color: '#8888aa',
    textAlign: 'center',
    lineHeight: 27,
    marginTop: 4,
  },
  actions: {
    width: '100%',
    gap: 14,
  },
  howTo: {
    fontSize: 17,
    color: '#8888aa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: '#6c63ff',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '700',
  },
  primaryButtonHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    marginTop: 3,
  },
  secondaryButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2a2a4a',
  },
  secondaryButtonText: {
    color: '#8888aa',
    fontSize: 21,
    fontWeight: '500',
  },
  secondaryButtonHint: {
    color: '#6c6c8a',
    fontSize: 15,
    marginTop: 3,
  },
});
