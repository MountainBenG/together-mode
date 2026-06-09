import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ALEXA_ENABLED } from '../lib/flags';

type Props = {
  code: string;
  alexaPin?: number | null;
  onCancel: () => void;
};

export default function CodeScreen({ code, alexaPin, onCancel }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Share this code</Text>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.sub}>
          Tell the other person to open the app{'\n'}and tap "Join a session"
        </Text>
        {ALEXA_ENABLED && alexaPin && (
          <View style={styles.alexaBox}>
            <Text style={styles.alexaLabel}>ALEXA PIN</Text>
            <Text style={styles.alexaPin}>{alexaPin}</Text>
            <Text style={styles.alexaSub}>Say: "Alexa, ask Together Mode to join {alexaPin}"</Text>
          </View>
        )}
        <Animated.View style={[styles.waitingRow, { opacity: pulse }]}>
          <View style={styles.dot} />
          <Text style={styles.waitingText}>Waiting for the other person…</Text>
        </Animated.View>
      </View>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    gap: 24,
  },
  label: {
    fontSize: 18,
    color: '#8888aa',
  },
  code: {
    fontSize: 72,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 8,
  },
  sub: {
    fontSize: 15,
    color: '#555577',
    textAlign: 'center',
    lineHeight: 22,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6c63ff',
  },
  waitingText: {
    fontSize: 14,
    color: '#6c63ff',
  },
  alexaBox: {
    marginTop: 8,
    backgroundColor: '#1a1a3a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  alexaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6c63ff',
    letterSpacing: 2,
  },
  alexaPin: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 6,
  },
  alexaSub: {
    fontSize: 12,
    color: '#555577',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 16,
  },
  cancelText: {
    color: '#555577',
    fontSize: 16,
  },
});
