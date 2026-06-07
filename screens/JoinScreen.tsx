import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  onJoin: (code: string) => void;
  onCancel: () => void;
};

export default function JoinScreen({ onJoin, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function handleCodeChange(text: string) {
    const upper = text.toUpperCase();
    setCode(upper);
    setError('');
    if (upper.trim().length === 4) {
      onJoin(upper.trim());
    }
  }

  function handleJoin() {
    if (code.trim().length < 4) {
      setError('Enter the 4-letter code');
      return;
    }
    setError('');
    onJoin(code.trim());
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Enter the session code</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={handleCodeChange}
          placeholder="ABCD"
          placeholderTextColor="#333355"
          maxLength={4}
          autoCapitalize="characters"
          autoFocus
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
          <Text style={styles.joinText}>Join</Text>
        </TouchableOpacity>
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
    width: '100%',
  },
  label: {
    fontSize: 18,
    color: '#8888aa',
  },
  input: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 8,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#6c63ff',
    paddingVertical: 8,
    width: '80%',
  },
  error: {
    color: '#ff4455',
    fontSize: 14,
  },
  joinButton: {
    backgroundColor: '#6c63ff',
    paddingVertical: 18,
    paddingHorizontal: 64,
    borderRadius: 16,
    marginTop: 8,
  },
  joinText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
  },
  cancelText: {
    color: '#555577',
    fontSize: 16,
  },
});
