'use client';

import { useState } from 'react';
import { WalkFormData, Theme } from '@/types';

const THEMES: { value: Theme; emoji: string; desc: string }[] = [
  { value: 'Histoire', emoji: '⚔️', desc: 'Batailles, dynasties, révolutions' },
  { value: 'Insolite', emoji: '👁️', desc: 'Secrets, anecdotes, curiosités' },
  { value: 'Nature', emoji: '🌿', desc: 'Parcs, arbres remarquables, faune' },
  { value: 'Architecture', emoji: '🏛️', desc: 'Styles, façades, urbanisme' },
  { value: 'Gastronomie', emoji: '🍷', desc: 'Marchés, traditions culinaires' },
  { value: 'Art & Culture', emoji: '🎨', desc: 'Artistes, œuvres, mouvements' },
  { value: 'Légendes & Mystères', emoji: '🕯️', desc: 'Fantômes, mythes, ésotérisme' },
];

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
];

const POPULAR_CITIES = [
  'Paris', 'Bruxelles', 'Lyon', 'Bruges', 'Gand',
  'Marseille', 'Amsterdam', 'Bordeaux', 'Strasbourg', 'Rome',
];

interface Props {
  onSubmit: (data: WalkFormData) => void;
  error: string;
}

export default function WalkForm({ onSubmit, error }: Props) {
  const [city, setCity] = useState('');
  const [duration, setDuration] = useState(45);
  const [distance, setDistance] = useState(3);
  const [theme, setTheme] = useState<Theme>('Histoire');
  const [language, setLanguage] = useState('fr');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const filteredCities = POPULAR_CITIES.filter(c =>
    c.toLowerCase().startsWith(city.toLowerCase()) && city.length > 0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;
    onSubmit({ city: city.trim(), country: country.trim(), duration, distance, theme, language });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* City Input */}
      <div className="relative">
        <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">
          📍 Ville de départ
        </label>
        <div className="relative">
          <input
            type="text"
            value={city}
            onChange={e => { setCity(e.target.value); setShowCitySuggestions(true); }}
            onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
            placeholder="ex: Bruxelles, Paris, Lyon…"
            className="w-full bg-panel border border-border rounded-xl px-4 py-3 text-cream placeholder-muted outline-none focus:border-gold transition-colors font-body text-sm"
            required
            autoComplete="off"
          />
          {showCitySuggestions && filteredCities.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-border rounded-xl overflow-hidden z-50 shadow-2xl">
              {filteredCities.map(c => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={() => { setCity(c); setShowCitySuggestions(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-cream hover:bg-surface hover:text-gold transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Duration & Distance */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">
            ⏱ Durée
          </label>
          <div className="bg-panel border border-border rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cream font-mono text-lg font-medium">{duration}</span>
              <span className="text-muted text-xs">min</span>
            </div>
            <input
              type="range"
              min={15}
              max={120}
              step={15}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full h-1 accent-gold cursor-pointer"
              style={{ accentColor: 'var(--gold)' }}
            />
            <div className="flex justify-between text-muted/50 text-xs mt-1">
              <span>15</span>
              <span>120</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">
            📏 Distance
          </label>
          <div className="bg-panel border border-border rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cream font-mono text-lg font-medium">{distance}</span>
              <span className="text-muted text-xs">km</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={distance}
              onChange={e => setDistance(Number(e.target.value))}
              className="w-full h-1 cursor-pointer"
              style={{ accentColor: 'var(--gold)' }}
            />
            <div className="flex justify-between text-muted/50 text-xs mt-1">
              <span>1</span>
              <span>10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">
          🎭 Thème de la balade
        </label>
        <div className="grid grid-cols-1 gap-2">
          {THEMES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                theme === t.value
                  ? 'border-gold bg-gold/10 text-cream'
                  : 'border-border bg-panel text-muted hover:border-gold/40 hover:text-cream'
              }`}
            >
              <span className="text-lg leading-none">{t.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{t.value}</div>
                <div className="text-xs text-muted/70 truncate">{t.desc}</div>
              </div>
              {theme === t.value && (
                <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">
          🌐 Langue de narration
        </label>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map(l => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLanguage(l.value)}
              className={`px-3 py-2.5 rounded-xl border text-sm text-center transition-all duration-200 ${
                language === l.value
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-border bg-panel text-muted hover:border-gold/40'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-950/50 border border-red-800/50 rounded-xl text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!city.trim()}
        className="w-full py-4 bg-gold hover:bg-gold-light disabled:bg-gold/30 disabled:cursor-not-allowed text-void font-medium text-sm tracking-wider uppercase rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-gold/20"
      >
        Générer ma balade →
      </button>
    </form>
  );
}
