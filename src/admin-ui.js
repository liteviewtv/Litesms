import { supabase } from './lib/supabase';

// Admin navigation is rendered by the main React app. This module is intentionally
// kept free of DOM injection so the Profile page cannot receive duplicate buttons.
export function renderAdminDashboard(){
  return null;
}

// Keep the module importable for the existing frontend architecture.
void supabase;
