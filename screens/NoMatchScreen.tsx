import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Shown in async voting when both players finished but said yes to none of the
// same movies (zero mutual yeses). The 1-match and 2+-match cases go to the
// match screen and the tiebreaker instead.
type Props = {
  onReset: () => void;
};

export default function NoMatchScreen({ onReset }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🤷</Text>
      <Text style={styles.title}>No Match</Text>
      <Text style={styles.subtitle}>
        You didn't both say yes to any of the same movies.{'\n'}Maybe try again with a different vibe.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onReset}>
        <Text style={styles.buttonText}>Start over</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 72 },
  title: { fontSize: 36, fontWeight: '800', color: '#ffffff' },
  subtitle: { fontSize: 17, color: '#8888aa', textAlign: 'center', lineHeight: 24 },
  button: {
    marginTop: 16,
    backgroundColor: '#6c63ff',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
  },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
});
