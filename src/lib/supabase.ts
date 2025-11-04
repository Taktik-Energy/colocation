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
  display_name?: string | null;
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
  lon: number;
  lat: number;
  eeg_bucket?: 'eeg_awarded' | 'merchant_likely' | null;
  // Optional fields that may exist in Supabase
  // Legacy/alternative address shapes
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null; // legacy naming
  postcode?: string | null;    // canonical in current schema
  street?: string | null;
  house_no?: string | null;
  city?: string | null;
  municipality?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  // Optional EEG details if present
  eeg_award_id?: string | null;
  eeg_auction_round?: string | null;
  eeg_reference_price_ct_per_kwh?: number | null;
}

export interface WindProject {
  id: string;
  name: string | null;
  capacity_kw: number | null;
  status: 'operating' | 'connected' | 'planned' | string;
  completion_date: string | null;
  planned_date: string | null;
  operator_name: string | null;
  grid_operator_name: string | null;
  lon: number;
  lat: number;
  // Optional context fields exposed by the view
  state?: string | null;
  postcode?: string | null;
  city?: string | null;
  municipality?: string | null;
  district?: string | null;
  windpark_name?: string | null;
  onshore_offshore?: string | null;
  manufacturer?: string | null;
  model_type?: string | null;
  hub_height_m?: number | null;
  rotor_diameter_m?: number | null;
}

export interface BessProject {
  id: string;
  name: string | null;
  status: 'operating' | 'connected' | 'planned' | string;
  capacity_kw: number | null;
  energy_kwh: number | null;
  completion_date: string | null;
  planned_date: string | null;
  operator_name: string | null;
  grid_operator_name: string | null;
  lon: number;
  lat: number;
  // Optional context
  state?: string | null;
  postcode?: string | null;
  city?: string | null;
  municipality?: string | null;
  district?: string | null;
  lokation_mastr?: string | null;
  storage_technology?: string | null;
}

export type PvBessPair = {
  pv_id: string; pv_mastr_unit_id: string; pv_name: string | null;
  pv_capacity_kwp: number | null; pv_status: string | null;
  pv_commissioning_date: string | null; pv_operator_name: string | null;
  pv_grid_operator_name: string | null; pv_grid_operator_mastr: string | null;
  pv_lon: number; pv_lat: number;
  bess_id: string; bess_mastr_unit_id: string; bess_name: string | null;
  // Canonical columns from view
  bess_kw: number | null; bess_kwh: number | null;
  // Back-compat optional aliases that may exist on earlier views
  bess_power_kw?: number | null; bess_energy_kwh?: number | null;
  // Operator naming variants
  bess_operator?: string | null;
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

export async function windMapSearch(params: PvSearchParams) {
  // Uses the wind_projects_map_v1 view; applies filters using lon/lat bounds and capacity/status/date
  const { min_kwp, max_kwp, statuses, completed_after, completed_before, bbox } = params;
  const [minLon, minLat, maxLon, maxLat] = bbox;

  let query = supabase
    .from('wind_projects_map_v1')
    .select('*')
    .gte('lon', minLon)
    .lte('lon', maxLon)
    .gte('lat', minLat)
    .lte('lat', maxLat);

  if (typeof min_kwp === 'number') query = query.gte('capacity_kw', min_kwp);
  if (typeof max_kwp === 'number') query = query.lte('capacity_kw', max_kwp);
  if (statuses && statuses.length) query = query.in('status', statuses);

  // Date range: match either commissioning or planned dates when provided
  const ands: string[] = [];
  if (completed_after) {
    ands.push(`or(and(completion_date.gte.${completed_after}),and(planned_date.gte.${completed_after}))`);
  }
  if (completed_before) {
    ands.push(`or(and(completion_date.lte.${completed_before}),and(planned_date.lte.${completed_before}))`);
  }
  if (ands.length) {
    // Combine all date constraints with and(...)
    query = query.or(ands.join(','));
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as WindProject[];
}

export async function bessMapSearch(params: PvSearchParams) {
  const { min_kwp, max_kwp, statuses, completed_after, completed_before, bbox } = params;
  const [minLon, minLat, maxLon, maxLat] = bbox;

  let query = supabase
    .from('battery_projects_map_v1')
    .select('*')
    .gte('lon', minLon)
    .lte('lon', maxLon)
    .gte('lat', minLat)
    .lte('lat', maxLat);

  if (typeof min_kwp === 'number') query = query.gte('capacity_kw', min_kwp);
  if (typeof max_kwp === 'number') query = query.lte('capacity_kw', max_kwp);
  if (statuses && statuses.length) query = query.in('status', statuses);

  const ands: string[] = [];
  if (completed_after) ands.push(`or(and(completion_date.gte.${completed_after}),and(planned_date.gte.${completed_after}))`);
  if (completed_before) ands.push(`or(and(completion_date.lte.${completed_before}),and(planned_date.lte.${completed_before}))`);
  if (ands.length) query = query.or(ands.join(','));

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as BessProject[];
}

export async function fetchProjectContacts(ids: string[]): Promise<Pick<PvProject, 'id' | 'general_email' | 'contact_name' | 'contact_email' | 'contact_role'>[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('pv_projects')
    .select('id, general_email, contact_name, contact_email, contact_role')
    .in('id', ids);
  if (error) throw error;
  return (data || []) as any;
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

export async function getWindProjectById(id: string): Promise<WindProject | null> {
  // Use the map view for consistent fields used in the client
  const { data, error } = await supabase
    .from('wind_projects_map_v1')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching wind project:', error);
    return null;
  }

  return data as WindProject;
}


