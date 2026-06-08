import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onDone: () => void;
};

const STEPS = [
  {
    emoji: '🎬',
    title: 'Browse independently',
    body: 'You and a friend each vote yes or no on movies — without seeing each other\'s picks.',
  },
  {
    emoji: '✅',
    title: 'Match = you both said yes',
    body: 'When you both vote yes on the same movie, that\'s your pick for tonight.',
  },
  {
    emoji: '🍿',
    title: 'No more arguing',
    body: 'One code. Two phones. One movie.',
  },
];

export default function OnboardingScreen({ onDone }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.appName}>Together Mode</Text>
      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.step}>
            <Text style={styles.stepEmoji}>{step.emoji}</Text>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.button} onPress={onDone} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Let's go</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    paddingTop: 80,
    paddingHorizontal: 32,
    paddingBottom: 60,
    justifyContent: 'space-between',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  steps: {
    flex: 1,
    justifyContent: 'center',
    gap: 36,
    paddingVertical: 40,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  stepEmoji: {
    fontSize: 40,
    lineHeight: 48,
  },
  stepText: {
    flex: 1,
    gap: 6,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepBody: {
    fontSize: 14,
    color: '#8888aa',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#6c63ff',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
