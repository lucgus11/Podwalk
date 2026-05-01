'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-void flex items-center justify-center p-6">
      <div className="text-center">
        <div className="font-display text-8xl text-gold/20 mb-4">404</div>
        <h1 className="font-display text-2xl text-cream mb-3">Page introuvable</h1>
        <p className="text-muted text-sm mb-6">Cette balade n&apos;existe pas ou a été supprimée.</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-gold text-void font-medium text-sm rounded-xl"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    </div>
  );
}
