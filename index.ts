export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  narration: string;
  radius: number; // meters to trigger audio
  order: number;
  category: string;
  completed: boolean;
  triggered: boolean;
}

export interface Walk {
  id: string;
  city: string;
  theme: string;
  duration: number; // minutes
  distance: number; // km
  pois: POI[];
  centerLat: number;
  centerLng: number;
  createdAt: string;
  completedAt?: string;
  status: 'pending' | 'active' | 'completed';
}

export interface WalkFormData {
  city: string;
  duration: number;
  distance: number;
  theme: string;
  language: string;
}

export type Theme =
  | 'Histoire'
  | 'Insolite'
  | 'Nature'
  | 'Architecture'
  | 'Gastronomie'
  | 'Art & Culture'
  | 'Légendes & Mystères';

export interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  watching: boolean;
}

export interface TTSState {
  speaking: boolean;
  currentPoiId: string | null;
  queue: string[];
}
