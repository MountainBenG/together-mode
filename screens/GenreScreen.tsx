import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GENRES } from '../services/movies';

type Props = {
  onSelect: (genreId: number | null) => void;
};

export default function GenreScreen({ onSelect }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>What are you in the mood for?</Text>
        <Text style={styles.subtitle}>You pick the vibe — your friend gets the same filter.</Text>
      </View>
      <FlatList
        data={GENRES}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onSelect(item.id)} activeOpacity={0.7}>
            <Text style={styles.cardEmoji}>{item.emoji}</Text>
            <Text style={styles.cardName}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.skipButton} onPress={() => onSelect(null)} activeOpacity={0.7}>
        <Text style={styles.skipText}>No preference — just show popular movies</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
    gap: 8,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#8888aa',
    lineHeight: 22,
  },
  grid: {
    gap: 12,
  },
  row: {
    gap: 12,
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#1a1a3a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  skipButton: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    color: '#555577',
    fontSize: 14,
    textAlign: 'center',
  },
});
