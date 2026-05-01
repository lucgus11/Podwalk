'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Walk, POI } from '@/types';
import { getWalk, markPOICompleted, markPOITriggered, updateWalk } from '@/lib/indexeddb';
import { useGeolocation } from '@/lib/geolocation';
import { getTTS } from '@/lib/tts';
import PlayerView from '@/components/PlayerView';

// Dynamic import for map (no SSR)
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type ViewMode = 'map' | 'player';

export default function WalkPage() {
  const params = useParams();
  const router = useRouter();
  const walkId = params.id as string;

  const [walk, setWalk] = useState<Walk | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [activePOI, setActivePOI] = useState<POI | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGeoActive, setIsGeoActive] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [charIndex, setCharIndex] = useState(0);

  const tts = useRef(typeof window !== 'undefined' ? getTTS() : null);

  const { lat, lng, accuracy, error: geoError, nearbyPOI, startWatching, stopWatching } =
    useGeolocation(walk?.pois || []);

  // Load walk from IndexedDB
  useEffect(() => {
    if (!walkId) return;
    getWalk(walkId).then(w => {
      if (!w) {
        router.push('/');
        return;
      }
      setWalk(w);
      setLoading(false);
    });
  }, [walkId, router]);

  // Show notification
  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Handle entering a POI geofence
  const handleEnterPOI = useCallback(async (poi: POI) => {
    if (!walk) return;

    // Mark as triggered in DB
    await markPOITriggered(walkId, poi.id);
    setWalk(prev => prev ? {
      ...prev,
      pois: prev.pois.map(p => p.id === poi.id ? { ...p, triggered: true } : p),
      status: 'active',
    } : prev);

    setActivePOI(poi);
    setViewMode('player');
    showNotification(`📍 ${poi.name}`);

    // Auto-play narration
    if (tts.current?.supported) {
      tts.current.speak(poi.narration, {
        lang: 'fr',
        rate: 0.92,
        onStart: () => { setIsSpeaking(true); setIsPaused(false); },
        onEnd: () => { setIsSpeaking(false); setIsPaused(false); },
        onBoundary: (idx) => setCharIndex(idx),
        onError: () => setIsSpeaking(false),
      });
    }
  }, [walk, walkId, showNotification]);

  // Geolocation toggle
  const toggleGeo = useCallback(() => {
    if (isGeoActive) {
      stopWatching();
      tts.current?.stop();
      setIsSpeaking(false);
      setIsGeoActive(false);
    } else {
      startWatching(handleEnterPOI);
      setIsGeoActive(true);
      updateWalk(walkId, { status: 'active' });
    }
  }, [isGeoActive, startWatching, stopWatching, handleEnterPOI, walkId]);

  // Manual POI selection
  const handleSelectPOI = useCallback((poi: POI) => {
    setActivePOI(poi);
    setViewMode('player');
  }, []);

  // Play/pause TTS
  const togglePlayback = useCallback(() => {
    if (!tts.current || !activePOI) return;

    if (isSpeaking && !isPaused) {
      tts.current.pause();
      setIsPaused(true);
    } else if (isPaused) {
      tts.current.resume();
      setIsPaused(false);
    } else {
      tts.current.speak(activePOI.narration, {
        lang: 'fr',
        rate: 0.92,
        onStart: () => { setIsSpeaking(true); setIsPaused(false); },
        onEnd: () => { setIsSpeaking(false); setIsPaused(false); },
        onBoundary: (idx) => setCharIndex(idx),
        onError: () => setIsSpeaking(false),
      });
    }
  }, [activePOI, isSpeaking, isPaused]);

  // Mark POI as completed
  const handleCompletePOI = useCallback(async () => {
    if (!activePOI || !walk) return;

    tts.current?.stop();
    setIsSpeaking(false);

    await markPOICompleted(walkId, activePOI.id);
    setWalk(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        pois: prev.pois.map(p =>
          p.id === activePOI.id ? { ...p, completed: true } : p
        ),
      };
      const allDone = updated.pois.every(p => p.completed);
      if (allDone) updated.status = 'completed';
      return updated;
    });

    // Move to next POI
    const sorted = [...walk.pois].sort((a, b) => a.order - b.order);
    const currentIdx = sorted.findIndex(p => p.id === activePOI.id);
    const next = sorted.slice(currentIdx + 1).find(p => !p.completed);

    if (next) {
      setActivePOI(next);
      showNotification('Prochaine étape sélectionnée →');
    } else {
      setActivePOI(null);
      setViewMode('map');
      showNotification('🎉 Balade terminée !');
    }
  }, [activePOI, walk, walkId, showNotification]);

  if (loading) return <LoadingScreen />;
  if (!walk) return null;

  const completedCount = walk.pois.filter(p => p.completed).length;
  const progress = completedCount / walk.pois.length;

  return (
    <div className="h-dvh bg-void flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 glass border-b border-border px-4 py-3 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-cream hover:bg-panel transition-all"
            >
              ←
            </button>
            <div>
              <div className="font-display text-base text-cream leading-tight">{walk.city}</div>
              <div className="text-muted text-xs">{walk.theme} · {walk.pois.length} points</div>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-gold font-mono text-sm">{completedCount}/{walk.pois.length}</div>
              <div className="text-muted text-xs">visités</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <button
              onClick={toggleGeo}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isGeoActive
                  ? 'bg-gold/20 text-gold border border-gold/30 animate-pulse-gold'
                  : 'bg-panel text-muted border border-border'
              }`}
            >
              <GPSIcon active={isGeoActive} />
              {isGeoActive ? 'GPS ON' : 'GPS'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-0.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold-dark to-gold transition-all duration-700"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 glass border border-gold/30 px-4 py-2 rounded-full text-sm text-gold animate-fade-up whitespace-nowrap">
          {notification}
        </div>
      )}

      {/* GPS Error */}
      {geoError && isGeoActive && (
        <div className="flex-shrink-0 mx-4 mt-2 px-4 py-2 bg-red-950/50 border border-red-800/30 rounded-xl text-red-400 text-xs">
          {geoError}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Map */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${viewMode === 'map' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <MapView
            walk={walk}
            userLat={lat}
            userLng={lng}
            activePOI={activePOI}
            onSelectPOI={handleSelectPOI}
          />
        </div>

        {/* Player */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${viewMode === 'player' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {activePOI && (
            <PlayerView
              poi={activePOI}
              walk={walk}
              isSpeaking={isSpeaking}
              isPaused={isPaused}
              charIndex={charIndex}
              onPlay={togglePlayback}
              onComplete={handleCompletePOI}
              onSelectPOI={handleSelectPOI}
            />
          )}
          {!activePOI && viewMode === 'player' && (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <div className="text-4xl mb-4">🎧</div>
                <p className="text-muted text-sm">Sélectionnez un point sur la carte<br />ou activez le GPS pour démarrer</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 glass border-t border-border safe-bottom">
        <div className="flex">
          {[
            { mode: 'map' as ViewMode, label: 'Carte', icon: <MapIcon /> },
            { mode: 'player' as ViewMode, label: 'Lecteur', icon: <PlayerIcon /> },
          ].map(tab => (
            <button
              key={tab.mode}
              onClick={() => setViewMode(tab.mode)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all ${
                viewMode === tab.mode ? 'text-gold' : 'text-muted'
              }`}
            >
              <div className={`w-6 h-6 transition-transform ${viewMode === tab.mode ? 'scale-110' : ''}`}>
                {tab.icon}
              </div>
              {tab.label}
              {tab.mode === 'player' && isSpeaking && (
                <div className="flex gap-px h-2.5 mt-0.5">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="waveform-bar" style={{ height: '100%' }} />
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="h-dvh bg-void flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border border-gold/30 rounded-full animate-spin mx-auto mb-4"
          style={{ borderTopColor: 'var(--gold)' }} />
        <p className="text-muted text-sm">Chargement de la balade…</p>
      </div>
    </div>
  );
}

function GPSIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-3 h-3 ${active ? 'text-gold' : 'text-muted'}`} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  );
}

function MapIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6 3m0-3l5.447 2.724A1 1 0 0121 10.618v10.764a1 1 0 01-1.447.894L15 20m0-13v13" />
    </svg>
  );
}

function PlayerIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}
