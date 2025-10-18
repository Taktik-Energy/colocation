import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { LatLngTuple, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import mapObjectsData from '../map_objects.json';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Types for our map objects based on map_objects.json structure
interface PointObject {
  type: 'point';
  coordinates: LatLngTuple;
  metadata: {
    dso_name: string;
    maßnahmen_id: string;
    grid_type: string;
    cities: string;
    project_type: string;
    state: string;
    capacity_change: string;
    date_of_completion: string;
    raw_geo_codes: string;
  };
}

interface LineObject {
  type: 'line';
  coordinates: LatLngTuple[];
  metadata: {
    dso_name: string;
    maßnahmen_id: string;
    grid_type: string;
    cities: string;
    project_type: string;
    state: string;
    capacity_change: string;
    date_of_completion: string;
    raw_geo_codes: string;
  };
}

type MapObject = PointObject | LineObject;

const InteractiveMap = () => {
  const [selectedObject, setSelectedObject] = useState<MapObject | null>(null);

  // Use data from map_objects.json
  const mapObjects: MapObject[] = mapObjectsData as MapObject[];

  const handleObjectClick = (object: MapObject) => {
    setSelectedObject(object);
  };

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'Operational': return '#22c55e'; // green
      case 'Under Construction': return '#f59e0b'; // amber
      case 'Planned': return '#3b82f6'; // blue
      default: return '#6b7280'; // gray
    }
  };

  const getLineColor = (status: string) => {
    switch (status) {
      case 'Operational': return '#22c55e'; // green
      case 'Under Construction': return '#f59e0b'; // amber
      case 'Planned': return '#3b82f6'; // blue
      default: return '#6b7280'; // gray
    }
  };

  return (
    <section id="map" className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <div className="space-y-4">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Interactive Grid Map
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore Germany's grid infrastructure with interactive points and transmission lines
            </p>
          </div>
          
          <div className="w-full h-[420px] md:h-[600px] bg-card rounded-lg border border-border shadow-sm relative overflow-hidden">
            <MapContainer
              center={[51.1657, 10.4515]} // Center of Germany
              zoom={6}
              scrollWheelZoom={true}
              className="h-full w-full"
              style={{ height: '100%', width: '100%' }}
            >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render point objects */}
        {mapObjects
          .filter(obj => obj.type === 'point')
          .map((obj, index) => {
            const point = obj as PointObject;
            return (
              <Marker
                key={`point-${index}`}
                position={point.coordinates}
                eventHandlers={{
                  click: () => handleObjectClick(point)
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-lg">{point.metadata.cities}</h3>
                    <p className="text-sm text-gray-600 mb-2">{point.metadata.project_type}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium">Grid Type:</span>
                        <span>{point.metadata.grid_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">DSO:</span>
                        <span>{point.metadata.dso_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Status:</span>
                        <span 
                          className="px-2 py-1 rounded text-xs"
                          style={{ 
                            backgroundColor: getMarkerColor(point.metadata.state) + '20',
                            color: getMarkerColor(point.metadata.state)
                          }}
                        >
                          {point.metadata.state}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Capacity Change:</span>
                        <span>{point.metadata.capacity_change}</span>
                      </div>
                      <code>{point.metadata.raw_geo_codes}</code>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        
        {/* Render line objects */}
        {mapObjects
          .filter(obj => obj.type === 'line')
          .map((obj, index) => {
            const line = obj as LineObject;
            return (
              <Polyline
                key={`line-${index}`}
                positions={line.coordinates}
                pathOptions={{
                  color: getLineColor(line.metadata.state),
                  weight: 4,
                  opacity: 0.8
                }}
                eventHandlers={{
                  click: () => handleObjectClick(line)
                }}
              />
            );
          })}
            </MapContainer>

            {/* Selected object details panel */}
            {selectedObject && (
              <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-[1000]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{selectedObject.metadata.cities}</h3>
                  <button
                    onClick={() => setSelectedObject(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-3">{selectedObject.metadata.project_type}</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Type:</span>
                    <span className="capitalize">{selectedObject.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Grid Type:</span>
                    <span>{selectedObject.metadata.grid_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">DSO:</span>
                    <span>{selectedObject.metadata.dso_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span 
                      className="px-2 py-1 rounded text-xs"
                      style={{ 
                        backgroundColor: getMarkerColor(selectedObject.metadata.state) + '20',
                        color: getMarkerColor(selectedObject.metadata.state)
                      }}
                    >
                      {selectedObject.metadata.state}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Capacity Change:</span>
                    <span>{selectedObject.metadata.capacity_change}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Completion:</span>
                    <span className="text-xs">{selectedObject.metadata.date_of_completion}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveMap;