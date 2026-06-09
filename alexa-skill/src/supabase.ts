import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Look up a session by its 4-digit Alexa PIN.
export async function getSessionByPin(pin: number) {
  const { data, error } = await supabase
    .from('sessions')
    .select('code, status, player1_id, player2_id')
    .eq('alexa_pin', pin)
    .in('status', ['waiting', 'voting'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return data;
}

// Store which session an Alexa device is connected to.
export async function linkDevice(deviceId: string, sessionCode: string, playerId: string, isPlayer1: boolean) {
  const { error } = await supabase
    .from('alexa_device_sessions')
    .upsert({ device_id: deviceId, session_code: sessionCode, player_id: playerId, is_player1: isPlayer1 })
    .eq('device_id', deviceId);
  return !error;
}

// Get the active session for an Alexa device.
export async function getLinkedSession(deviceId: string) {
  const { data, error } = await supabase
    .from('alexa_device_sessions')
    .select('session_code, player_id, is_player1')
    .eq('device_id', deviceId)
    .single();
  if (error || !data) return null;
  return data;
}

// Submit a vote to the session.
export async function submitVote(sessionCode: string, isPlayer1: boolean, vote: 'yes' | 'no') {
  const field = isPlayer1 ? 'player1_voted' : 'player2_voted';
  const { error } = await supabase
    .from('sessions')
    .update({ [field]: vote })
    .eq('code', sessionCode);
  return !error;
}

// Join a session as player 2.
export async function joinSessionAsPlayer2(sessionCode: string, playerId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('status, player2_id')
    .eq('code', sessionCode)
    .single();

  if (error || !data) return { ok: false, reason: 'not_found' as const };
  if (data.status !== 'waiting' || data.player2_id) return { ok: false, reason: 'full' as const };

  const { error: updateError } = await supabase
    .from('sessions')
    .update({ player2_id: playerId, status: 'voting' })
    .eq('code', sessionCode);

  return updateError ? { ok: false, reason: 'network' as const } : { ok: true as const };
}
