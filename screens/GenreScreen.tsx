import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GENRES, Genre } from '../services/movies';
import { RECOMMENDATIONS_ENABLED } from '../lib/flags';
import { getFavoriteGenres } from '../services/preferences';

type Props = {
  playerId: string;
  onSelect: (genreId: number | null) => void;
};

export default function GenreScreen({ playerId, onSelect }: Props) {
  // Recommendations v1: the genre this player has said yes to most, surfaced as a
  // shortcut. Picking it just selects that genre, so the session/matching is unchanged.
  const [recommended, setRecommended] = useState<Genre | null>(null);

  useEffect(() => {
    if (!RECOMMENDATIONS_ENABLED || !playerId) return;
    let cancelled = false;
    getFavoriteGenres(playerId, 1).then((favs) => {
      if (cancelled || favs.length === 0) return;
      const g = GENRES.find((x) => x.id === favs[0]);
      if (g) setRecommended(g);
    });
    return () => { cancelled = true; };
  }, [playerId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>What are you in the mood for?</Text>
        <Text style={styles.subtitle}>You pick the vibe — your friend gets the same filter.</Text>
      </View>

      {recommended && (
        <TouchableOpacity style={styles.recCard} onPress={() => onSelect(recommended.id)} activeOpacity={0.85}>
          <Text style={styles.recLabel}>✨  RECOMMENDED FOR YOU</Text>
          <Text style={styles.recName}>{recommended.emoji}  {recommended.name}</Text>
          <Text style={styles.recWhy}>You've said yes to {recommended.name} movies the most.</Text>
        </TouchableOpacity>
      )}

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
  recCard: {
    backgroundColor: '#6c63ff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    gap: 5,
    shadowColor: '#6c63ff',
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  recLabel: {
    color: '#ffe98a',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  recName: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  recWhy: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
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
