import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onStart: () => void;
  onJoin: () => void;
};

export default function HomeScreen({ onStart, onJoin }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Together Mode</Text>
        <Text style={styles.subtitle}>Find something you'll both love</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={onStart}>
          <Text style={styles.primaryButtonText}>Let's pick something</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onJoin}>
          <Text style={styles.secondaryButtonText}>Join a session</Text>
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
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#8888aa',
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#6c63ff',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333355',
  },
  secondaryButtonText: {
    color: '#8888aa',
    fontSize: 18,
    fontWeight: '500',
  },
});
