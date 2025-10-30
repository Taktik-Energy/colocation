import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pvMapSearch, PvProject } from '../lib/supabase';
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
  const DEBUG = true;
  const [minMax, setMinMax] = useState<[number, number]>([10000, 2000000]);
  const [tempRange, setTempRange] = useState<[number, number]>([10000, 2000000]);
  const [statuses, setStatuses] = useState<Record<StatusKey, boolean>>({ operating: true, connected: true, planned: true });
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [projects, setProjects] = useState<PvProject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const latestBoundsRef = useRef<LatLngBounds | null>(null);
  const latestZoomRef = useRef<number>(6);

  const activeStatuses = useMemo(() => Object.entries(statuses).filter(([, v]) => v).map(([k]) => k), [statuses]);

  const fetchData = useCallback(async () => {
    const b = latestBoundsRef.current;
    if (!b) return;
    setLoading(true);
    try {
      const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[RPC] pv_map_search params', {
          min_kwp: minMax[0], max_kwp: minMax[1], statuses: activeStatuses.length ? activeStatuses : null,
          completed_after: dateFrom || null, completed_before: dateTo || null, bbox
        });
      }
      const data = await pvMapSearch({
        min_kwp: minMax[0],
        max_kwp: minMax[1],
        statuses: activeStatuses.length ? (activeStatuses as string[]) : null,
        eegs: null,
        completed_after: dateFrom || null,
        completed_before: dateTo || null,
        bbox,
      });
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[RPC] pv_map_search result count', data?.length, data?.slice(0, 3));
      }
      setProjects(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [minMax, activeStatuses, dateFrom, dateTo]);

  const debouncedFetch = useMemo(() => debounce(fetchData, 400), [fetchData]);

  const handleMapIdle = useCallback((bounds: LatLngBounds, zoom: number) => {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[Map idle]', { bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], zoom });
    }
    latestBoundsRef.current = bounds;
    latestZoomRef.current = zoom;
    debouncedFetch();
  }, [debouncedFetch]);

  useEffect(() => {
    debouncedFetch();
  }, [minMax, activeStatuses, dateFrom, dateTo]);

  // keep tempRange in sync if minMax changes externally
  useEffect(() => {
    setTempRange(minMax);
  }, [minMax]);

  // Build supercluster index when projects change
  type PointFeature = GeoJSON.Feature<GeoJSON.Point, { cluster: false; projectId: string }>;

  const features: PointFeature[] = useMemo(() => (
    projects.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { cluster: false, projectId: p.id },
    }))
  ), [projects]);

  const index = useMemo(() => new Supercluster<{ projectId: string }>({ radius: 60, maxZoom: 16 }).load(features), [features]);

  const [clusters, setClusters] = useState<Array<GeoJSON.Feature<GeoJSON.Point, any>>>([]);

  const recomputeClusters = useCallback(() => {
    const b = latestBoundsRef.current;
    if (!b) return;
    const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    const zoom = Math.round(latestZoomRef.current);
    const result = index.getClusters(bbox, zoom);
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[Cluster] clusters', { zoom, bbox, features: features.length, clusters: result.length });
    }
    setClusters(result as Array<GeoJSON.Feature<GeoJSON.Point, any>>);
  }, [index]);

  useEffect(() => {
    // recompute on index changes and when bounds already known
    if (latestBoundsRef.current) recomputeClusters();
  }, [recomputeClusters]);

  const projectById = useMemo(() => {
    const m = new Map<string, PvProject>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

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
          const p = projectById.get(projectId);
          if (!p) return null;
          return (
            <Marker key={p.id} position={[p.lat, p.lon] as [number, number]}>
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm">{p.capacity_kwp?.toLocaleString()} kWp</div>
                  <div className="text-sm">Status: {p.status || '—'}</div>
                  {p.completion_date && <div className="text-sm">Completion: {p.completion_date}</div>}
                  {p.operator && <div className="text-sm">Operator: {p.operator}</div>}
                  {p.grid_operator && <div className="text-sm">Grid: {p.grid_operator}</div>}
                  {(p.contact_name || p.contact_email) && (
                    <div className="text-sm">Contact: {p.contact_name || ''} {p.contact_email ? `(${p.contact_email})` : ''}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
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
        </MapContainer>
      </div>

      <div className="absolute left-4 top-4 z-[1000] w-72 max-w-[85vw] bg-background/95 backdrop-blur border border-border rounded-lg shadow p-4 space-y-4">
        <div className="text-sm font-medium">Size (kWp)</div>
        <div className="px-1">
          <Slider
            min={10000}
            max={2000000}
            step={1000}
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
          {(['operating','connected','planned'] as StatusKey[]).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <Checkbox checked={statuses[k]} onCheckedChange={(v) => setStatuses((s) => ({ ...s, [k]: Boolean(v) }))} />
              <span className="capitalize">{k}</span>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Completion date</div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-border rounded px-2 py-1 text-sm bg-background" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-border rounded px-2 py-1 text-sm bg-background" />
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground" />
            Loading…
          </div>
        )}
      </div>

      {DEBUG && (
        <div className="absolute bottom-4 left-4 z-[1000] text-[10px] leading-tight bg-background/95 backdrop-blur border border-border rounded px-2 py-1 text-muted-foreground">
          <div>projects: {projects.length}</div>
          <div>clusters: {clusters.length}</div>
          <div>statuses: {activeStatuses.join(',') || 'none'}</div>
          <div>range: {tempRange[0].toLocaleString()} - {tempRange[1].toLocaleString()} kWp</div>
        </div>
      )}
    </div>
  );
};

export default PVMap;


