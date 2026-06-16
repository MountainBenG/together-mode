import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Profile, createProfile, listProfiles } from '../services/profiles';

const COLORS = ['#6c63ff', '#ff6b6b', '#44ff88', '#ffc24b', '#4db5ff', '#ff7bd5'];

type Props = {
  onPick: (profile: Profile) => void;
};

export default function WhoIsWatchingScreen({ onPick }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const list = await listProfiles();
    setProfiles(list);
    setLoading(false);
    if (list.length === 0) setAdding(true); // first run → straight to "create a profile"
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!name.trim() || saving) return;
    setSaving(true);
    const created = await createProfile(name, color);
    setSaving(false);
    if (created) {
      setName('');
      setColor(COLORS[0]);
      setAdding(false);
      setLoading(true);
      load();
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Who's watching?</Text>

      <View style={styles.grid}>
        {profiles.map((p) => (
          <TouchableOpacity key={p.id} style={styles.tile} onPress={() => onPick(p)} activeOpacity={0.8}>
            <View style={[styles.avatar, { backgroundColor: p.color }]}>
              <Text style={styles.avatarLetter}>{p.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.tileName} numberOfLines={1}>{p.name}</Text>
          </TouchableOpacity>
        ))}
        {!adding && (
          <TouchableOpacity style={styles.tile} onPress={() => setAdding(true)} activeOpacity={0.8}>
            <View style={styles.addAvatar}>
              <Text style={styles.addPlus}>+</Text>
            </View>
            <Text style={styles.tileName}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {adding && (
        <View style={styles.addForm}>
          <Text style={styles.addTitle}>New profile</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#6b6b8a"
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={16}
          />
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
              />
            ))}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAdd} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.addButtonText}>Add profile</Text>}
          </TouchableOpacity>
          {profiles.length > 0 && (
            <TouchableOpacity onPress={() => { setAdding(false); setName(''); }} activeOpacity={0.7}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0f0f23', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#0f0f23', alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { fontSize: 32, fontWeight: '800', color: '#ffffff', marginBottom: 36, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24 },
  tile: { alignItems: 'center', gap: 10, width: 110 },
  avatar: { width: 96, height: 96, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 44, fontWeight: '900', color: '#ffffff' },
  addAvatar: { width: 96, height: 96, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2a2a4a', backgroundColor: '#15152e' },
  addPlus: { fontSize: 52, fontWeight: '300', color: '#6c63ff' },
  tileName: { fontSize: 17, fontWeight: '700', color: '#dddde8' },
  addForm: { marginTop: 40, width: '100%', maxWidth: 340, gap: 14 },
  addTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', textAlign: 'center' },
  input: { backgroundColor: '#1a1a3a', borderRadius: 14, borderWidth: 1, borderColor: '#2a2a4a', paddingHorizontal: 18, paddingVertical: 15, fontSize: 18, color: '#ffffff', textAlign: 'center' },
  colorRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: 'transparent' },
  swatchActive: { borderColor: '#ffffff' },
  addButton: { backgroundColor: '#6c63ff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  addButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  cancel: { color: '#8888aa', fontSize: 15, textAlign: 'center', paddingVertical: 8 },
});
