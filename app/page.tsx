'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { WalkFormData, Walk } from '@/types';
import { saveWalk } from '@/lib/indexeddb';
import WalkForm from '@/components/WalkForm';
import WalkHistory from '@/components/WalkHistory';

export default function HomePage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleGenerate = async (formData: WalkFormData) => {
    setIsGenerating(true);
    setError('');
    const locationLabel = formData.country
      ? `${formData.city}, ${formData.country}`
      : formData.city;
    setProgress(`Analyse de ${locationLabel}…`);

    try {
      setProgress(`Identification des points d'intérêt à ${formData.city}…`);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Échec de la génération');
      }

      setProgress('Rédaction des narrations immersives…');
      const walkData = await response.json();

      const walk: Walk = {
        id: uuidv4(),
        ...walkData,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      setProgress('Sauvegarde de votre balade…');
      await saveWalk(walk);

      setProgress('Prêt !');
      router.push(`/walk/${walk.id}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      setIsGenerating(false);
      setProgress('');
    }
  };

  return (
    <main className="min-h-dvh bg-void relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-gold/3 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a84c' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-10 animate-fade-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center">
                <HeadphonesIcon />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full animate-pulse" />
            </div>
            <span className="font-display text-xl tracking-widest text-gold uppercase">Podwalk</span>
          </div>

          <h1 className="font-display text-4xl leading-tight mb-3">
            Chaque rue a<br />
            <span className="gold-shimmer italic">son histoire.</span>
          </h1>
          <p className="text-muted font-body text-sm leading-relaxed max-w-xs">
            Une balade audio immersive générée par IA, déclenchée automatiquement par votre position GPS.
          </p>
        </header>

        {/* Stats bar */}
        <div className="flex gap-4 mb-8 animate-fade-up stagger-1">
          {[
            { label: 'Villes', value: '∞' },
            { label: 'Thèmes', value: '7' },
            { label: 'Hors-ligne', value: '✓' },
          ].map((stat) => (
            <div key={stat.label} className="flex-1 glass rounded-xl p-3 text-center">
              <div className="text-gold font-mono text-lg font-medium">{stat.value}</div>
              <div className="text-muted text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="animate-fade-up stagger-2">
          {isGenerating ? (
            <GeneratingScreen progress={progress} />
          ) : (
            <WalkForm onSubmit={handleGenerate} error={error} />
          )}
        </div>

        {/* History */}
        <div className="mt-6 animate-fade-up stagger-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-3 glass rounded-xl text-sm text-muted hover:text-cream transition-colors"
          >
            <span>Mes balades enregistrées</span>
            <ChevronIcon open={showHistory} />
          </button>
          {showHistory && (
            <div className="mt-2">
              <WalkHistory />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center animate-fade-up stagger-4">
          <p className="text-muted text-xs">
            Propulsé par{' '}
            <span className="text-gold">Groq AI</span>
            {' '}· Cartes{' '}
            <span className="text-gold">OpenStreetMap</span>
          </p>
          <p className="text-muted/50 text-xs mt-1">Fonctionne hors-ligne après la première utilisation</p>
        </footer>
      </div>
    </main>
  );
}

function GeneratingScreen({ progress }: { progress: string }) {
  const STEP_LABELS = [
    'Analyse de la ville',
    "Identification des points d'intérêt",
    'Rédaction des narrations',
    'Sauvegarde de votre balade',
    'Prêt !',
  ];

  const currentStep = STEP_LABELS.findIndex(s => progress.startsWith(s.split(' ')[0]));

  return (
    <div className="glass rounded-2xl p-8 text-center">
      {/* Animated compass */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border border-gold/20 animate-spin" style={{ animationDuration: '8s' }} />
        <div className="absolute inset-2 rounded-full border border-gold/10 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <CompassIcon />
        </div>
      </div>

      <h2 className="font-display text-xl mb-2">Génération en cours</h2>
      <p className="text-gold text-sm mb-6 loading-dots">
        {progress}
        <span>.</span><span>.</span><span>.</span>
      </p>

      {/* Progress steps */}
      <div className="space-y-2 text-left">
        {STEP_LABELS.map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
              i < currentStep
                ? 'bg-gold border-gold'
                : i === currentStep
                ? 'border-gold animate-pulse'
                : 'border-border'
            }`}>
              {i < currentStep && (
                <svg className="w-3 h-3 text-void" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={`text-xs transition-all duration-500 ${
              i === currentStep ? 'text-cream' : i < currentStep ? 'text-gold' : 'text-muted'
            }`}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadphonesIcon() {
  return (
    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={1} />
      <polygon points="12,2 14.5,9.5 12,12 9.5,9.5" fill="currentColor" stroke="none" className="text-gold" />
      <polygon points="12,22 14.5,14.5 12,12 9.5,14.5" fill="currentColor" stroke="none" className="text-muted" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
