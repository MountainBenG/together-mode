import { supabase } from '../lib/supabase';

type EventName =
  | 'session_started'
  | 'session_joined'
  | 'vote_cast'
  | 'match_found'
  | 'no_match'
  | 'tiebreaker_started'
  | 'tiebreaker_pick_submitted';

export function track(
  event: EventName,
  sessionCode?: string,
  playerId?: string,
  properties?: Record<string, unknown>
): void {
  supabase
    .from('events')
    .insert({ event_name: event, session_code: sessionCode, player_id: playerId, properties })
    .then(({ error }) => {
      if (error) console.warn('analytics track error:', error.message);
    });
}
