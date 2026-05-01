'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { POI } from '@/types';

interface GeoState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  error: string | null;
  watching: boolean;
}

interface NearbyPOI {
  poi: POI;
  distance: number;
}

/**
 * Haversine formula to calculate distance between two GPS coordinates (meters)
 */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeolocation(pois: POI[] = []) {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    accuracy: null,
    heading: null,
    speed: null,
    error: null,
    watching: false,
  });

  const [nearbyPOI, setNearbyPOI] = useState<NearbyPOI | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const triggeredPOIsRef = useRef<Set<string>>(new Set());

  const checkGeofences = useCallback(
    (lat: number, lng: number) => {
      let closest: NearbyPOI | null = null;

      for (const poi of pois) {
        if (poi.completed) continue;

        const distance = calculateDistance(lat, lng, poi.lat, poi.lng);

        if (distance <= poi.radius) {
          if (!closest || distance < closest.distance) {
            closest = { poi, distance };
          }
        }
      }

      setNearbyPOI(closest);

      // Return newly triggered POI (not yet triggered before)
      if (closest && !triggeredPOIsRef.current.has(closest.poi.id)) {
        triggeredPOIsRef.current.add(closest.poi.id);
        return closest.poi;
      }

      return null;
    },
    [pois]
  );

  const startWatching = useCallback(
    (onEnterPOI: (poi: POI) => void) => {
      if (!navigator.geolocation) {
        setState(prev => ({ ...prev, error: 'Géolocalisation non supportée' }));
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, heading, speed } = position.coords;

          setState({
            lat: latitude,
            lng: longitude,
            accuracy,
            heading,
            speed,
            error: null,
            watching: true,
          });

          const triggered = checkGeofences(latitude, longitude);
          if (triggered) {
            onEnterPOI(triggered);
          }
        },
        (error) => {
          let message = 'Erreur de géolocalisation';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permission GPS refusée. Activez la localisation pour cette app.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Position GPS indisponible';
              break;
            case error.TIMEOUT:
              message = 'Délai d\'attente GPS dépassé';
              break;
          }
          setState(prev => ({ ...prev, error: message, watching: false }));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 2000,
        }
      );

      setState(prev => ({ ...prev, watching: true }));
    },
    [checkGeofences]
  );

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState(prev => ({ ...prev, watching: false }));
  }, []);

  const resetTriggered = useCallback(() => {
    triggeredPOIsRef.current = new Set();
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    nearbyPOI,
    startWatching,
    stopWatching,
    resetTriggered,
    checkGeofences,
  };
}

/**
 * Get bearing between two coordinates (degrees)
 */
export function getBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Format distance to readable string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
