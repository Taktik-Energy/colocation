import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import * as L from 'leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pvMapSearch, PvProject, fetchPvBessColocations, PvBessPair, fetchProjectContacts, windMapSearch, WindProject, bessMapSearch, BessProject } from '../lib/supabase';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import Supercluster from 'supercluster';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

type StatusKey = 'operating' | 'connected' | 'planned';
type EegBucket = 'eeg_awarded' | 'merchant_likely';

const defaultCenter: [number, number] = [51.1657, 10.4515];

const MapEventBinder: React.FC<{ onIdle: (bounds: LatLngBounds, zoom: number) => void }> = ({ onIdle }) => {
  useMapEvents({
    moveend: (e) => onIdle(e.target.getBounds(), e.target.getZoom()),
    zoomend: (e) => onIdle(e.target.getBounds(), e.target.getZoom()),
    load: (e) => onIdle(e.target.getBounds(), e.target.getZoom()),
  });
  return null;
};

const debounce = (fn: (...args: any[]) => void, ms: number) => {
  let handle: any;
  return (...args: any[]) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), ms);
  };
};

const PVMap: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = true }) => {
  const navigate = useNavigate();
  const [minMax, setMinMax] = useState<[number, number]>([500, 250000]);
  const [tempRange, setTempRange] = useState<[number, number]>([500, 250000]);
  const [statuses, setStatuses] = useState<Record<StatusKey, boolean>>({ operating: true, planned: true });
  const [eegBuckets, setEegBuckets] = useState<Record<EegBucket, boolean>>({ eeg_awarded: false, merchant_likely: false });
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [projects, setProjects] = useState<PvProject[]>([]);
  const [windProjects, setWindProjects] = useState<WindProject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingWind, setLoadingWind] = useState<boolean>(false);
  const [loadingBessAll, setLoadingBessAll] = useState<boolean>(false);
  const [showBess, setShowBess] = useState<boolean>(false);
  const [sources, setSources] = useState<{ pv: boolean; wind: boolean; bess: boolean }>({ pv: true, wind: false, bess: false });
  const [bessPairs, setBessPairs] = useState<PvBessPair[]>([]);
  const [loadingBess, setLoadingBess] = useState<boolean>(false);
  const [onlyPvWithoutBess, setOnlyPvWithoutBess] = useState<boolean>(false);
  const [onlyContactEnriched, setOnlyContactEnriched] = useState<boolean>(false);
  const contactsMergedRef = useRef<boolean>(false);
  const latestBoundsRef = useRef<LatLngBounds | null>(null);
  const latestZoomRef = useRef<number>(6);

  const activeStatuses = useMemo(() => Object.entries(statuses).filter(([, v]) => v).map(([k]) => k) as StatusKey[], [statuses]);
  const activeEegBuckets = useMemo(() => {
    const selected = Object.entries(eegBuckets).filter(([, v]) => v).map(([k]) => k) as EegBucket[];
    return selected.length ? selected : null;
  }, [eegBuckets]);

  // Send exactly the selected UI statuses to the RPC (already lowercase from UI)
  const mapUiStatusesToRpc = (keys: StatusKey[]): string[] => keys;

  const fetchData = useCallback(async () => {
    if (!sources.pv) {
      setProjects([]);
      return;
    }
    const b = latestBoundsRef.current;
    if (!b) return;
    setLoading(true);
    try {
      const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      const rpcStatuses = mapUiStatusesToRpc(activeStatuses);
      const data = await pvMapSearch({
        min_kwp: minMax[0],
        max_kwp: minMax[1],
        statuses: rpcStatuses.length ? rpcStatuses : null,
        buckets: activeEegBuckets,
        completed_after: dateFrom || null,
        completed_before: dateTo || null,
        bbox,
      });
      // Ensure contact fields are present for filtering (chunked to avoid IN limits)
      if ((data?.length || 0) > 0) {
        const ids = (data || []).map((p) => p.id);
        const chunkSize = 500;
        try {
          contactsMergedRef.current = false;
          const chunks: string[][] = [];
          for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));
          const results = await Promise.all(chunks.map((c) => fetchProjectContacts(c)));
          const allContacts = ([] as any[]).concat(...results);
          const contactMap = new Map(allContacts.map((c) => [c.id, c]));
          const merged = (data || []).map((p) => Object.assign({}, p, contactMap.get(p.id)));
          setProjects(merged);
          contactsMergedRef.current = true;
        } catch {
          if (onlyContactEnriched) {
            setProjects([]);
            contactsMergedRef.current = false;
          } else {
            setProjects(data || []);
            contactsMergedRef.current = true;
          }
        }
      } else {
        setProjects(data || []);
        contactsMergedRef.current = true;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [minMax, activeStatuses, activeEegBuckets, dateFrom, dateTo, onlyContactEnriched, sources.pv]);

  const debouncedFetch = useMemo(() => debounce(fetchData, 400), [fetchData]);

  const fetchWind = useCallback(async () => {
    if (!sources.wind) {
      setWindProjects([]);
      return;
    }
    const b = latestBoundsRef.current;
    if (!b) return;
    setLoadingWind(true);
    try {
      const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      const data = await windMapSearch({
        min_kwp: minMax[0],
        max_kwp: minMax[1],
        statuses: activeStatuses.length ? activeStatuses : null,
        buckets: null, // EEG buckets currently not used for wind
        completed_after: dateFrom || null,
        completed_before: dateTo || null,
        bbox,
      });
      setWindProjects(data || []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoadingWind(false);
    }
  }, [sources.wind, minMax, activeStatuses, dateFrom, dateTo]);

  const debouncedFetchWind = useMemo(() => debounce(fetchWind, 400), [fetchWind]);

  const [bessAll, setBessAll] = useState<BessProject[]>([]);
  const fetchBessAll = useCallback(async () => {
    if (!sources.bess) {
      setBessAll([]);
      return;
    }
    const b = latestBoundsRef.current;
    if (!b) return;
    setLoadingBessAll(true);
    try {
      const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      const data = await bessMapSearch({
        min_kwp: minMax[0],
        max_kwp: minMax[1],
        statuses: activeStatuses.length ? activeStatuses : null,
        buckets: null,
        completed_after: dateFrom || null,
        completed_before: dateTo || null,
        bbox,
      });
      setBessAll(data || []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoadingBessAll(false);
    }
  }, [sources.bess, minMax, activeStatuses, dateFrom, dateTo]);

  const debouncedFetchBessAll = useMemo(() => debounce(fetchBessAll, 400), [fetchBessAll]);

  const fetchBess = useCallback(async () => {
    if (!showBess && !onlyPvWithoutBess) return;
    setLoadingBess(true);
    try {
      const data = await fetchPvBessColocations();
      setBessPairs(data || []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoadingBess(false);
    }
  }, [showBess, onlyPvWithoutBess]);

  const debouncedFetchBess = useMemo(() => debounce(fetchBess, 300), [fetchBess]);

  const isValidString = (v?: string | null) => {
    if (!v) return false;
    const s = String(v).trim();
    if (!s) return false;
    const lower = s.toLowerCase();
    if (['na', 'n/a', 'none', 'unknown', '-', 'null'].includes(lower)) return false;
    return true;
  };

  const isValidEmail = (v?: string | null) => {
    if (!isValidString(v)) return false;
    const s = String(v).trim();
    // Lightweight email check
    return /.+@.+\..+/.test(s);
  };

  const hasContactEnrichment = (p: PvProject) => (
    isValidEmail(p.contact_email) ||
    isValidEmail(p.general_email) ||
    isValidString(p.contact_name) ||
    isValidString(p.contact_role)
  );

  const handleMapIdle = useCallback((bounds: LatLngBounds, zoom: number) => {
    latestBoundsRef.current = bounds;
    latestZoomRef.current = zoom;
    debouncedFetch();
    debouncedFetchWind();
    debouncedFetchBessAll();
  }, [debouncedFetch, debouncedFetchWind, debouncedFetchBessAll]);

  useEffect(() => {
    debouncedFetch();
    debouncedFetchWind();
    debouncedFetchBessAll();
  }, [minMax, activeStatuses, activeEegBuckets, dateFrom, dateTo, sources]);

  useEffect(() => {
    if (showBess || onlyPvWithoutBess) {
      debouncedFetchBess();
    }
  }, [showBess, onlyPvWithoutBess]);

  const colocatedPvIds = useMemo(() => {
    const s = new Set<string>();
    for (const pair of bessPairs) s.add(pair.pv_id);
    return s;
  }, [bessPairs]);

  // keep tempRange in sync if minMax changes externally
  useEffect(() => {
    setTempRange(minMax);
  }, [minMax]);

  // Build supercluster index when projects change
  type PointFeature = GeoJSON.Feature<GeoJSON.Point, { cluster: false; projectId: string; kind: 'pv' | 'wind' | 'bess' }>;

  const filteredProjects = useMemo(() => {
    if (onlyContactEnriched && !contactsMergedRef.current) return [];
    const base = onlyPvWithoutBess ? projects.filter((p) => !colocatedPvIds.has(p.id)) : projects;
    if (!onlyContactEnriched) return base;
    return base.filter((p) => hasContactEnrichment(p));
  }, [projects, onlyPvWithoutBess, colocatedPvIds, onlyContactEnriched]);

  const features: PointFeature[] = useMemo(() => {
    const out: PointFeature[] = [];
    if (sources.pv) {
      for (const p of filteredProjects) {
        out.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { cluster: false, projectId: p.id, kind: 'pv' } });
      }
    }
    if (sources.wind) {
      for (const w of windProjects) {
        out.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [w.lon, w.lat] }, properties: { cluster: false, projectId: w.id, kind: 'wind' } });
      }
    }
    if (sources.bess) {
      for (const b of bessAll) {
        out.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lon, b.lat] }, properties: { cluster: false, projectId: b.id, kind: 'bess' } });
      }
    }
    return out;
  }, [filteredProjects, windProjects, bessAll, sources]);

  const index = useMemo(() => new Supercluster<{ projectId: string }>({ radius: 60, maxZoom: 20 }).load(features), [features]);

  const [clusters, setClusters] = useState<Array<GeoJSON.Feature<GeoJSON.Point, any>>>([]);

  const recomputeClusters = useCallback(() => {
    const b = latestBoundsRef.current;
    if (!b) return;
    const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    const zoom = Math.round(latestZoomRef.current);
    const result = index.getClusters(bbox, zoom);
    setClusters(result as Array<GeoJSON.Feature<GeoJSON.Point, any>>);
  }, [index]);

  useEffect(() => {
    // recompute on index changes and when bounds already known
    if (latestBoundsRef.current) recomputeClusters();
  }, [recomputeClusters]);

  useEffect(() => {
    if (latestBoundsRef.current) recomputeClusters();
  }, [onlyContactEnriched, onlyPvWithoutBess, projects, recomputeClusters]);

  const projectById = useMemo(() => {
    const m = new Map<string, PvProject>();
    for (const p of filteredProjects) m.set(p.id, p);
    return m;
  }, [filteredProjects]);

  const windById = useMemo(() => {
    const m = new Map<string, WindProject>();
    for (const w of windProjects) m.set(w.id, w);
    return m;
  }, [windProjects]);

  const bessById = useMemo(() => {
    const m = new Map<string, BessProject>();
    for (const b of bessAll) m.set(b.id, b);
    return m;
  }, [bessAll]);

  const pvPointIcon = useMemo(() => L.divIcon({
    html: '<div style="background:#eab308;color:white;border-radius:9999px;display:flex;align-items:center;justify-content:center;width:18px;height:18px;font-size:10px;font-weight:700;">P</div>',
    className: 'pv-marker',
    iconSize: [18, 18],
  }), []);

  const windPointIcon = useMemo(() => L.divIcon({
    html: '<div style="background:#3b82f6;color:white;border-radius:9999px;display:flex;align-items:center;justify-content:center;width:18px;height:18px;font-size:10px;font-weight:700;">W</div>',
    className: 'wind-marker',
    iconSize: [18, 18],
  }), []);

  const bessPointIcon = useMemo(() => L.divIcon({
    html: '<div style="background:#8b5cf6;color:white;border-radius:9999px;display:flex;align-items:center;justify-content:center;width:18px;height:18px;font-size:10px;font-weight:700;">B</div>',
    className: 'bess-marker',
    iconSize: [18, 18],
  }), []);

  const ClustersRenderer: React.FC = () => {
    const map = useMap();
    return (
      <>
        {clusters.map((c: any) => {
          const [lon, lat] = c.geometry.coordinates as [number, number];
          const { cluster: isCluster, point_count: pointCount } = c.properties || {};

          if (isCluster) {
            const icon = L.divIcon({
              html: `<div style="background:#0ea5e9;color:white;border-radius:9999px;display:flex;align-items:center;justify-content:center;width:34px;height:34px;font-size:12px;font-weight:600;">${pointCount}</div>`,
              className: 'cluster-marker',
              iconSize: [34, 34],
            });
            return (
              <Marker
                key={`cluster-${c.id}`}
                position={[lat, lon] as [number, number]}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    const expansionZoom = Math.min(index.getClusterExpansionZoom(c.id), 18);
                    map.flyTo([lat, lon], expansionZoom);
                  },
                }}
              />
            );
          }

          // Unclustered point
          const projectId = c.properties?.projectId as string;
          const kind = c.properties?.kind as 'pv' | 'wind' | 'bess';
          if (kind === 'pv') {
            const p = projectById.get(projectId);
            if (!p) return null;
            if (onlyContactEnriched && !hasContactEnrichment(p)) return null;
            return (
              <Marker 
                key={`pv-${p.id}`} 
                position={[p.lat, p.lon] as [number, number]}
                icon={pvPointIcon}
              >
                <Popup>
                  <div className="space-y-2">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm">{p.capacity_kwp?.toLocaleString()} kWp</div>
                    <div className="text-sm">Status: {p.status || '—'}</div>
                    {p.completion_date && <div className="text-sm">Commissioning: {p.completion_date}</div>}
                    {!p.completion_date && p.planned_date && <div className="text-sm">Planned commissioning: {p.planned_date}</div>}
                    {p.operator_name && <div className="text-sm">Operator: {p.operator_name}</div>}
                    {p.grid_operator_name && <div className="text-sm">Grid: {p.grid_operator_name}</div>}
                    <button
                      onClick={() => window.open(`/project/${p.id}`, '_blank', 'noopener,noreferrer')}
                      className="mt-2 text-sm text-primary hover:underline font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          } else {
            if (kind === 'wind') {
              const w = windById.get(projectId);
              if (!w) return null;
              return (
                <Marker 
                  key={`wind-${w.id}`} 
                  position={[w.lat, w.lon] as [number, number]}
                  icon={windPointIcon}
                >
                  <Popup>
                    <div className="space-y-2">
                      <div className="font-semibold">{w.name || 'Wind project'}</div>
                      <div className="text-sm">{(w.capacity_kw ?? 0).toLocaleString()} kW</div>
                      <div className="text-sm">Status: {w.status || '—'}</div>
                      {w.completion_date && <div className="text-sm">Commissioning: {w.completion_date}</div>}
                      {!w.completion_date && w.planned_date && <div className="text-sm">Planned commissioning: {w.planned_date}</div>}
                      {w.operator_name && <div className="text-sm">Operator: {w.operator_name}</div>}
                      {w.grid_operator_name && <div className="text-sm">Grid: {w.grid_operator_name}</div>}
                      <button
                        onClick={() => window.open(`/wind/${w.id}`, '_blank', 'noopener,noreferrer')}
                        className="mt-2 text-sm text-primary hover:underline font-medium"
                      >
                        View Details →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            const b = bessById.get(projectId);
            if (!b) return null;
            return (
              <Marker
                key={`bess-${b.id}`}
                position={[b.lat, b.lon] as [number, number]}
                icon={bessPointIcon}
              >
                <Popup>
                  <div className="space-y-2">
                    <div className="font-semibold">{b.name || 'Battery project'}</div>
                    <div className="text-sm">{(b.capacity_kw ?? 0).toLocaleString()} kW • {(b.energy_kwh ?? 0).toLocaleString()} kWh</div>
                    <div className="text-sm">Status: {b.status || '—'}</div>
                    {b.completion_date && <div className="text-sm">Commissioning: {b.completion_date}</div>}
                    {!b.completion_date && b.planned_date && <div className="text-sm">Planned commissioning: {b.planned_date}</div>}
                    {b.operator_name && <div className="text-sm">Operator: {b.operator_name}</div>}
                    {b.grid_operator_name && <div className="text-sm">Grid: {b.grid_operator_name}</div>}
                  </div>
                </Popup>
              </Marker>
            );
          }
        })}
      </>
    );
  };

  const BessRenderer: React.FC = () => {
    if (!showBess || !bessPairs.length) return null;

    const bessIcon = L.divIcon({
      html: '<div style="background:#8b5cf6;color:white;border-radius:9999px;display:flex;align-items:center;justify-content:center;width:18px;height:18px;font-size:10px;font-weight:700;">B</div>',
      className: 'bess-marker',
      iconSize: [18, 18],
    });

    return (
      <>
        {bessPairs.map((pair) => {
          const anyPair: any = pair as any;
          const powerKw = (pair as any).bess_kw ?? pair.bess_power_kw ?? anyPair.bess_capacity_kw ?? anyPair.capacity_kw ?? anyPair.power_kw ?? anyPair.bess_power ?? null;
          const energyKwh = (pair as any).bess_kwh ?? pair.bess_energy_kwh ?? anyPair.capacity_kwh ?? anyPair.energy_kwh ?? anyPair.bess_energy ?? null;
          return (
          <React.Fragment key={`${pair.pv_id}-${pair.bess_id}`}>
            <Polyline
              positions={[[pair.pv_lat, pair.pv_lon] as [number, number], [pair.bess_lat, pair.bess_lon] as [number, number]]}
              pathOptions={{ color: '#8b5cf6', weight: 1, opacity: 0.6 }}
            />
            <Marker
              position={[pair.bess_lat, pair.bess_lon] as [number, number]}
              icon={bessIcon}
            >
              <Popup>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Match</div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${pair.match_type === 'lokation_mastr' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {pair.match_type === 'lokation_mastr' ? 'Same Lokation' : '≈300 m'}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold">BESS: {pair.bess_name || '—'}</div>
                    <div className="text-sm">{powerKw != null ? Number(powerKw).toLocaleString() : '—'} kW • {energyKwh != null ? Number(energyKwh).toLocaleString() : '—'} kWh • Status: {pair.bess_status || '—'}</div>
                    {((pair as any).bess_operator ?? pair.bess_operator_name) && (
                      <div className="text-sm">Operator: {(pair as any).bess_operator ?? pair.bess_operator_name}</div>
                    )}
                    {pair.bess_commissioning_date && <div className="text-sm">Commissioning: {pair.bess_commissioning_date}</div>}
                    {pair.bess_operator_name && <div className="text-sm">Operator: {pair.bess_operator_name}</div>}
                    {pair.bess_grid_operator_name && <div className="text-sm">Grid: {pair.bess_grid_operator_name}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground">Distance: {Math.round(pair.distance_m)} m</div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );})}
      </>
    );
  };

  return (
    <div className={fullScreen ? "w-screen h-screen relative" : "w-full h-[600px] relative rounded-lg border border-border shadow-sm"}>
      <div className="absolute inset-0">
        <MapContainer center={defaultCenter} zoom={6} scrollWheelZoom className="h-full w-full" style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapEventBinder onIdle={(b, z) => { handleMapIdle(b, z); recomputeClusters(); }} />
          <ClustersRenderer />
          <BessRenderer />
        </MapContainer>
      </div>

      <div className="absolute left-4 top-4 z-[1000] w-72 max-w-[85vw] bg-background/95 backdrop-blur border border-border rounded-lg shadow p-4 space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Sources</div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={sources.pv} onCheckedChange={(v) => setSources((s) => ({ ...s, pv: Boolean(v) }))} />
            <span>PV projects</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={sources.wind} onCheckedChange={(v) => setSources((s) => ({ ...s, wind: Boolean(v) }))} />
            <span>Wind projects</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={sources.bess} onCheckedChange={(v) => setSources((s) => ({ ...s, bess: Boolean(v) }))} />
            <span>Battery projects</span>
          </label>
          {loadingWind && sources.wind && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground" />
              Loading wind…
            </div>
          )}
          {loadingBessAll && sources.bess && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground" />
              Loading batteries…
            </div>
          )}
        </div>
        <div className="text-sm font-medium">Capacity ({(sources.wind || sources.bess) && !sources.pv ? 'kW' : 'kWp'})</div>
        <div className="px-1">
          <Slider
            min={500}
            max={250000}
            step={500}
            value={[tempRange[0], tempRange[1]]}
            onValueChange={(v) => setTempRange([v[0], v[1]])}
            onValueCommit={(v) => setMinMax([v[0], v[1]])}
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{tempRange[0].toLocaleString()}</span>
            <span>{tempRange[1].toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Status</div>
          {(['operating','planned'] as StatusKey[]).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <Checkbox checked={statuses[k]} onCheckedChange={(v) => setStatuses((s) => ({ ...s, [k]: Boolean(v) }))} />
              <span className="capitalize">{k}</span>
            </label>
          ))}
        </div>

        {sources.pv && (
          <div className="space-y-2">
            <div className="text-sm font-medium">BESS</div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={showBess} onCheckedChange={(v) => setShowBess(Boolean(v))} />
              <span>Show co-located BESS</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={onlyPvWithoutBess} onCheckedChange={(v) => setOnlyPvWithoutBess(Boolean(v))} />
              <span>Only PV without BESS</span>
            </label>
            {loadingBess && showBess && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground" />
                Loading BESS…
              </div>
            )}
          </div>
        )}

        

        {sources.pv && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Contacts</div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={onlyContactEnriched} onCheckedChange={(v) => setOnlyContactEnriched(Boolean(v))} />
              <span>Contact enriched</span>
            </label>
          </div>
        )}

        {sources.pv && (
          <div className="space-y-2">
            <div className="text-sm font-medium">EEG</div>
            {(['eeg_awarded', 'merchant_likely'] as EegBucket[]).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Checkbox checked={eegBuckets[k]} onCheckedChange={(v) => setEegBuckets((s) => ({ ...s, [k]: Boolean(v) }))} />
                <span>{k === 'eeg_awarded' ? 'EEG-awarded' : 'Merchant-likely'}</span>
              </label>
            ))}
            <div className="text-[10px] text-muted-foreground leading-tight">
              <div>EEG-awarded: won auction (Zuschlagnummer present)</div>
              <div>Merchant-likely: ≥10 MWp, ≥2017, no award ID</div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium">Commissioning date</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground block">After</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-border rounded px-2 py-1 text-sm bg-background w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground block">Before</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-border rounded px-2 py-1 text-sm bg-background w-full" />
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground" />
            Loading…
          </div>
        )}
      </div>
    </div>
  );
};

export default PVMap;


