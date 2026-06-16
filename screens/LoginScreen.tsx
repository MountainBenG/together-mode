import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { signIn, signUp } from '../services/auth';

type Props = {
  onAuthed: () => void;
};

export default function LoginScreen({ onAuthed }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    const result = isSignup ? await signUp(email, password) : await signIn(email, password);
    setLoading(false);
    if (result.ok) onAuthed();
    else setError(result.error);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎬</Text>
        <Text style={styles.title}>Together Mode</Text>
        <Text style={styles.subtitle}>{isSignup ? 'Create your family account' : 'Welcome back'}</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6b6b8a"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6b6b8a"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>{isSignup ? 'Create account' : 'Log in'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setMode(isSignup ? 'login' : 'signup'); setError(''); }} activeOpacity={0.7}>
          <Text style={styles.toggle}>
            {isSignup ? 'Already have an account?  Log in' : 'New here?  Create a family account'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  emoji: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: 34, fontWeight: '800', color: '#ffffff', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#8888aa', textAlign: 'center', marginBottom: 18 },
  input: {
    backgroundColor: '#1a1a3a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 17,
    color: '#ffffff',
  },
  error: { color: '#ff6b6b', fontSize: 14, textAlign: 'center' },
  button: { backgroundColor: '#6c63ff', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  toggle: { color: '#6c63ff', fontSize: 15, textAlign: 'center', marginTop: 14, fontWeight: '600' },
});
