import { supabase } from '../lib/supabase';

// The family account. Supabase Auth persists the session (see lib/supabase.ts), so a
// successful login sticks across app launches — next time you go straight to "who's watching".
export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; error: string };

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) return { ok: false, error: error.message };
  // If email confirmation is required, Supabase returns no session yet — the user must
  // confirm via the emailed link before they can log in. needsConfirmation flags that.
  return { ok: true, needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// The logged-in family account's user id (null if not logged in).
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}
