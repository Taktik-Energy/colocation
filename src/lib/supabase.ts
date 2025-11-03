import { createClient } from '@supabase/supabase-js';

const url = (import.meta as any).env.VITE_SUPABASE_URL || (import.meta as any).env.SUPABASE_URL;
const anonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.SUPABASE_ANON_KEY;

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
  // Contact enrichment fields
  general_email?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_role?: string | null;
  contact_phone?: string | null;
  lon: number;
  lat: number;
  eeg_bucket?: 'eeg_awarded' | 'merchant_likely' | null;
  // Optional fields that may exist in Supabase
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  // Optional EEG details if present
  eeg_award_id?: string | null;
  eeg_auction_round?: string | null;
  eeg_reference_price_ct_per_kwh?: number | null;
}

export type PvBessPair = {
  pv_id: string; pv_mastr_unit_id: string; pv_name: string | null;
  pv_capacity_kwp: number | null; pv_status: string | null;
  pv_commissioning_date: string | null; pv_operator_name: string | null;
  pv_grid_operator_name: string | null; pv_grid_operator_mastr: string | null;
  pv_lon: number; pv_lat: number;
  bess_id: string; bess_mastr_unit_id: string; bess_name: string | null;
  bess_power_kw: number | null; bess_energy_kwh: number | null;
  bess_status: string | null; bess_commissioning_date: string | null;
  bess_operator_name: string | null; bess_grid_operator_name: string | null;
  bess_grid_operator_mastr: string | null; bess_lon: number; bess_lat: number;
  distance_m: number; match_type: 'lokation_mastr' | 'proximity_300m';
};

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

export async function fetchPvBessColocations(): Promise<PvBessPair[]> {
  const { data, error } = await supabase
    .from('pv_bess_colocations')
    .select('*');
  if (error) throw error;
  return (data || []) as PvBessPair[];
}

export async function fetchColocationsByPvId(pvId: string): Promise<PvBessPair[]> {
  const { data, error } = await supabase
    .from('pv_bess_colocations')
    .select('*')
    .eq('pv_id', pvId);
  if (error) throw error;
  return (data || []) as PvBessPair[];
}

export async function getProjectById(id: string): Promise<PvProject | null> {
  const { data, error } = await supabase
    .from('pv_projects')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }
  
  return data as PvProject;
}


