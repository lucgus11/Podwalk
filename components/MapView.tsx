'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Walk, POI } from '@/types';

interface Props {
  walk: Walk;
  userLat: number | null;
  userLng: number | null;
  activePOI: POI | null;
  onSelectPOI: (poi: POI) => void;
}

export default function MapView({ walk, userLat, userLng, activePOI, onSelectPOI }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const poiMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Create custom POI marker icon
  const createPOIIcon = useCallback((poi: POI, isActive: boolean) => {
    const color = poi.completed ? '#4a5568' : isActive ? '#c9a84c' : '#e8c97a';
    const bgColor = poi.completed ? 'rgba(74, 85, 104, 0.2)' : isActive ? 'rgba(201, 168, 76, 0.2)' : 'rgba(22, 22, 36, 0.9)';
    const size = isActive ? 44 : 36;
    const pulse = isActive && !poi.completed ? `
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="none" stroke="${color}" stroke-width="1" opacity="0.3">
        <animate attributeName="r" from="${size/2 - 4}" to="${size/2 + 6}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>
      </circle>` : '';

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        ${pulse}
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="${bgColor}" stroke="${color}" stroke-width="${isActive ? 2 : 1.5}"/>
        <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" font-size="${isActive ? 14 : 12}" fill="${color}">${poi.order}</text>
        ${poi.completed ? `<line x1="${size/4}" y1="${size/2}" x2="${size/2}" y2="${size*3/4 - 2}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="${size/2}" y1="${size*3/4 - 2}" x2="${size*3/4}" y2="${size/4 + 2}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>` : ''}
      </svg>`;

    return L.divIcon({
      html: svg,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
      popupAnchor: [0, -(size/2 + 4)],
      className: 'poi-marker-icon',
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [walk.centerLat, walk.centerLng],
      zoom: 15,
      zoomControl: true,
      attributionControl: true,
    });

    // OSM tiles with dark styling
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Draw route line
    const coords: [number, number][] = walk.pois
      .sort((a, b) => a.order - b.order)
      .map(p => [p.lat, p.lng]);

    if (coords.length > 1) {
      routeLineRef.current = L.polyline(coords, {
        color: '#c9a84c',
        weight: 2,
        opacity: 0.5,
        dashArray: '6, 10',
      }).addTo(map);
    }

    // Add POI markers
    walk.pois.forEach(poi => {
      const marker = L.marker([poi.lat, poi.lng], {
        icon: createPOIIcon(poi, false),
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: var(--font-dm-sans); min-width: 200px;">
            <div style="font-weight: 600; color: var(--gold); margin-bottom: 4px;">${poi.name}</div>
            <div style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">${poi.category}</div>
            <div style="font-size: 12px; color: var(--cream); line-height: 1.5; max-height: 80px; overflow: hidden;">
              ${poi.narration.slice(0, 150)}…
            </div>
            <button
              onclick="window._podwalkSelectPOI && window._podwalkSelectPOI('${poi.id}')"
              style="margin-top: 10px; width: 100%; padding: 6px; background: var(--gold); color: var(--void); border: none; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 600;"
            >
              ▶ Écouter la narration
            </button>
          </div>`,
          { maxWidth: 280 }
        )
        .on('click', () => onSelectPOI(poi));

      poiMarkersRef.current.set(poi.id, marker);
    });

    // Fit map to route
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords).pad(0.15));
    }

    // Global callback for popup button
    (window as unknown as Record<string, unknown>)._podwalkSelectPOI = (poiId: string) => {
      const poi = walk.pois.find(p => p.id === poiId);
      if (poi) onSelectPOI(poi);
    };

    return () => {
      map.remove();
      mapRef.current = null;
      delete (window as unknown as Record<string, unknown>)._podwalkSelectPOI;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update user position marker
  useEffect(() => {
    if (!mapRef.current || userLat === null || userLng === null) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    } else {
      userMarkerRef.current = L.circleMarker([userLat, userLng], {
        radius: 8,
        fillColor: '#60a5fa',
        fillOpacity: 0.9,
        color: '#fff',
        weight: 2,
      }).addTo(mapRef.current);

      // Accuracy circle
      L.circle([userLat, userLng], {
        radius: 20,
        fillColor: '#60a5fa',
        fillOpacity: 0.1,
        color: '#60a5fa',
        weight: 1,
        opacity: 0.3,
      }).addTo(mapRef.current);
    }
  }, [userLat, userLng]);

  // Update active POI marker style
  useEffect(() => {
    if (!mapRef.current) return;

    walk.pois.forEach(poi => {
      const marker = poiMarkersRef.current.get(poi.id);
      if (marker) {
        const isActive = activePOI?.id === poi.id;
        marker.setIcon(createPOIIcon(poi, isActive));
      }
    });

    // Pan to active POI
    if (activePOI && mapRef.current) {
      mapRef.current.panTo([activePOI.lat, activePOI.lng], { animate: true, duration: 0.8 });
    }
  }, [activePOI, walk.pois, createPOIIcon]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass rounded-xl px-3 py-2 text-xs space-y-1 z-[1000]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400 border border-white border-2" />
          <span className="text-muted">Vous</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border border-gold bg-gold/20" />
          <span className="text-muted">À visiter</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-surface border border-border" />
          <span className="text-muted">Visité</span>
        </div>
      </div>
    </div>
  );
}
