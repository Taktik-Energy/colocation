import { createClient } from '@supabase/supabase-js';

const url = (import.meta as any).env.VITE_SUPABASE_URL || (import.meta as any).env.SUPABASE_URL;
const anonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.VSUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail fast to surface misconfigured env in client builds
  throw new Error('Missing Supabase env. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(url as string, anonKey as string, {
  auth: { persistSession: false },
});

export interface PvProject {
  id: string;
  name: string;
  capacity_kwp: number;
  status: 'operating' | 'connected' | 'planned';
  completion_date: string | null;
  planned_date: string | null;
  operator_name: string | null;
  grid_operator_name: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  lon: number;
  lat: number;
  eeg_bucket?: 'eeg_awarded' | 'merchant_likely' | null;
}

export interface PvSearchParams {
  min_kwp: number | null;
  max_kwp: number | null;
  statuses: string[] | null;
  buckets: ('eeg_awarded' | 'merchant_likely')[] | null;
  completed_after: string | null;
  completed_before: string | null;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}

export async function pvMapSearch(params: PvSearchParams) {
  const { data, error } = await supabase.rpc('pv_map_search_v2', params as any);
  if (error) throw error;
  return (data || []) as PvProject[];
}


