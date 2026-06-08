import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Each option is a US rating CEILING — TMDB returns that rating and below.
type Option = { emoji: string; label: string; sub: string; cert: string };

const OPTIONS: Option[] = [
  { emoji: '👶', label: 'Little kids', sub: 'G', cert: 'G' },
  { emoji: '🧒', label: 'Kids', sub: 'Up to PG', cert: 'PG' },
  { emoji: '🧑', label: 'Teens', sub: 'Up to PG-13', cert: 'PG-13' },
  { emoji: '🍿', label: 'Everyone', sub: 'Up to R', cert: 'R' },
];

type Props = {
  onPick: (maxCert: string) => void;
  onCancel: () => void;
};

export default function AgePickerScreen({ onPick, onCancel }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Who's watching?</Text>
        <Text style={styles.subtitle}>Pick an age range — we'll only show movies that fit.</Text>
        <View style={styles.options}>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.cert}
              style={styles.option}
              onPress={() => onPick(opt.cert)}
              activeOpacity={0.8}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionSub}>{opt.sub}</Text>
              </View>
              <Text style={styles.optionArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
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
    paddingVertical: 80,
    paddingHorizontal: 28,
  },
  content: { width: '100%', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#8888aa', textAlign: 'center', marginTop: 8, marginBottom: 28 },
  options: { width: '100%', gap: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a3a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 16,
  },
  optionEmoji: { fontSize: 32 },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  optionSub: { fontSize: 14, color: '#6c63ff' },
  optionArrow: { fontSize: 20, color: '#6c63ff' },
  cancelButton: { paddingVertical: 16 },
  cancelText: { color: '#555577', fontSize: 16 },
});
