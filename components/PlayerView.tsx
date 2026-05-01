'use client';

import { useState, useMemo } from 'react';
import { POI, Walk } from '@/types';

interface Props {
  poi: POI;
  walk: Walk;
  isSpeaking: boolean;
  isPaused: boolean;
  charIndex: number;
  onPlay: () => void;
  onComplete: () => void;
  onSelectPOI: (poi: POI) => void;
}

export default function PlayerView({ poi, walk, isSpeaking, isPaused, charIndex, onPlay, onComplete, onSelectPOI }: Props) {
  const [showFullText, setShowFullText] = useState(false);

  const sortedPOIs = useMemo(
    () => [...walk.pois].sort((a, b) => a.order - b.order),
    [walk.pois]
  );

  const progress = isSpeaking && poi.narration.length > 0
    ? Math.min(charIndex / poi.narration.length, 1)
    : poi.completed ? 1 : 0;

  const displayedText = showFullText
    ? poi.narration
    : poi.narration.slice(0, 300) + (poi.narration.length > 300 ? '…' : '');

  return (
    <div className="h-full flex flex-col bg-void overflow-hidden">
      {/* POI Header Card */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="glass rounded-2xl p-5 border border-gold/20">
          {/* Category & order */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted uppercase tracking-widest">
              Étape {poi.order}/{walk.pois.length}
            </span>
            <span className="text-xs px-2 py-1 bg-gold/10 border border-gold/20 rounded-full text-gold">
              {poi.category}
            </span>
          </div>

          {/* Title */}
          <h2 className="font-display text-2xl text-cream leading-tight mb-1">{poi.name}</h2>
          <p className="text-muted text-xs flex items-center gap-1">
            <span>📍</span>
            {poi.lat.toFixed(5)}, {poi.lng.toFixed(5)}
          </p>

          {/* Audio progress */}
          <div className="mt-4">
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold-dark to-gold-light transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-4">
            {/* Play/Pause button */}
            <button
              onClick={onPlay}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                isSpeaking && !isPaused
                  ? 'bg-gold text-void shadow-lg shadow-gold/30'
                  : 'bg-panel border border-gold/40 text-gold hover:bg-gold/10'
              }`}
            >
              {isSpeaking && !isPaused ? (
                <PauseIcon />
              ) : (
                <PlayIcon />
              )}
            </button>

            {/* Waveform */}
            <div className="flex-1 flex items-center gap-0.5 h-8">
              {isSpeaking && !isPaused ? (
                Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-gold"
                    style={{
                      height: `${20 + Math.sin(i * 0.8 + Date.now() * 0.005) * 60}%`,
                      opacity: 0.4 + (i / 20) * 0.6,
                      animation: `wave ${0.8 + (i % 5) * 0.1}s ease-in-out infinite`,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))
              ) : (
                Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-0.5 rounded-sm bg-border"
                  />
                ))
              )}
            </div>

            {/* Complete button */}
            <button
              onClick={onComplete}
              disabled={poi.completed}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-sm transition-all duration-200 active:scale-95 ${
                poi.completed
                  ? 'bg-muted/20 text-muted cursor-not-allowed'
                  : 'bg-green-950/50 border border-green-700/40 text-green-400 hover:bg-green-900/50'
              }`}
              title={poi.completed ? 'Déjà visité' : 'Marquer comme visité'}
            >
              {poi.completed ? '✓' : '→'}
            </button>
          </div>
        </div>
      </div>

      {/* Narration text */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted uppercase tracking-widest">Narration</span>
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="text-xs text-gold hover:text-gold-light transition-colors"
            >
              {showFullText ? 'Réduire ↑' : 'Tout lire ↓'}
            </button>
          </div>

          <p className="text-cream/80 text-sm leading-relaxed font-body whitespace-pre-line">
            {displayedText}
          </p>
        </div>
      </div>

      {/* POI list */}
      <div className="flex-shrink-0 px-4 pb-2">
        <p className="text-xs text-muted uppercase tracking-widest mb-2 px-1">Itinéraire</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {sortedPOIs.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectPOI(p)}
              className={`flex-shrink-0 w-12 h-12 rounded-xl border text-xs font-mono transition-all duration-200 relative ${
                p.id === poi.id
                  ? 'border-gold bg-gold/20 text-gold'
                  : p.completed
                  ? 'border-border bg-panel/50 text-muted'
                  : 'border-border bg-panel text-cream hover:border-gold/40'
              }`}
            >
              {p.order}
              {p.completed && (
                <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-500" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}
