import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

console.log('Supabase URL:', supabaseUrl);
console.log('Anon key starts with:', supabaseAnonKey?.substring(0, 10));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
