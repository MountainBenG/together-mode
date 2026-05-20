import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  code: string;
  onCancel: () => void;
};

export default function CodeScreen({ code, onCancel }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Share this code</Text>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.sub}>Tell the other person to open the app and tap "Join a session"</Text>
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
  cancelButton: {
    paddingVertical: 16,
  },
  cancelText: {
    color: '#555577',
    fontSize: 16,
  },
});
