import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'together_mode_player_id';

export async function getPlayerId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    id = Math.random().toString(36).substring(2, 10);
    await AsyncStorage.setItem(KEY, id);
  }
  return id;
}
