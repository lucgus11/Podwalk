'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-dvh bg-void flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="font-display text-2xl text-cream mb-3">Hors connexion</h1>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          Vous êtes actuellement sans connexion internet. Vos balades déjà générées restent accessibles.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-gold text-void font-medium text-sm rounded-xl hover:bg-gold-light transition-colors"
        >
          Accéder à mes balades →
        </button>
      </div>
    </div>
  );
}
