import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  movieTitle: string;
  onReset: () => void;
};

export default function MatchScreen({ movieTitle, onReset }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.heading}>It's a match!</Text>
        <Text style={styles.movieTitle}>{movieTitle}</Text>
        <Text style={styles.sub}>You both said yes.</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.watchButton}>
          <Text style={styles.watchButtonText}>Start watching</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.againButton} onPress={onReset}>
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
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  emoji: {
    fontSize: 64,
  },
  heading: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
  },
  movieTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6c63ff',
  },
  sub: {
    fontSize: 16,
    color: '#8888aa',
  },
  actions: {
    width: '100%',
    gap: 16,
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
    fontWeight: '600',
  },
  againButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  againButtonText: {
    color: '#8888aa',
    fontSize: 16,
  },
});
