import { supabase } from './supabaseClient';

export async function getEnabledProviders() {
  return supabase.from('providers').select('id,name,slug').eq('enabled', true).order('name');
}
