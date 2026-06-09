-- Run these in the Supabase SQL Editor (one at a time if needed)

-- 1. Add genre filter support
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS genre_id integer;

-- 2. Add Alexa PIN (4-digit number shown in the app, spoken to Alexa to join)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS alexa_pin integer;

-- 3. Table for tracking which Alexa device is linked to which session
CREATE TABLE IF NOT EXISTS alexa_device_sessions (
  device_id    text PRIMARY KEY,
  session_code text NOT NULL,
  player_id    text NOT NULL,
  is_player1   boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);
