import { supabase } from '../lib/supabase';

// A "who's watching" profile inside the logged-in family account. RLS ties each
// profile to its account (auth.uid() = account_id), so families only see their own.
export type Profile = {
  id: string;
  name: string;
  color: string;
};

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, color')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as Profile[];
}

export async function createProfile(name: string, color: string): Promise<Profile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accountId = sessionData.session?.user?.id;
  if (!accountId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .insert({ account_id: accountId, name: name.trim(), color })
    .select('id, name, color')
    .single();
  return error || !data ? null : (data as Profile);
}
