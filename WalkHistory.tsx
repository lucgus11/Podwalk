'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Walk } from '@/types';
import { getAllWalks, deleteWalk } from '@/lib/indexeddb';

export default function WalkHistory() {
  const router = useRouter();
  const [walks, setWalks] = useState<Walk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllWalks().then(w => {
      setWalks(w.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteWalk(id);
    setWalks(prev => prev.filter(w => w.id !== id));
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-4 text-center text-muted text-sm">
        Chargement…
      </div>
    );
  }

  if (walks.length === 0) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <p className="text-muted text-sm">Aucune balade enregistrée</p>
        <p className="text-muted/50 text-xs mt-1">Vos balades seront disponibles hors-ligne</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {walks.map(walk => (
        <div
          key={walk.id}
          onClick={() => router.push(`/walk/${walk.id}`)}
          className="glass rounded-xl p-4 cursor-pointer hover:border-gold/40 transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-gold font-display font-medium text-sm truncate">
                  {walk.city}
                </span>
                <StatusBadge status={walk.status} />
              </div>
              <div className="text-muted text-xs mt-0.5">
                {walk.theme} · {walk.duration}min · {walk.distance}km · {walk.pois.length} POI
              </div>
              <div className="text-muted/50 text-xs">
                {new Date(walk.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={(e) => handleDelete(e, walk.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-950/30 transition-all opacity-0 group-hover:opacity-100"
              >
                <TrashIcon />
              </button>
              <svg className="w-4 h-4 text-muted group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-500"
                style={{
                  width: `${(walk.pois.filter(p => p.completed).length / walk.pois.length) * 100}%`
                }}
              />
            </div>
            <div className="text-muted/50 text-xs mt-1">
              {walk.pois.filter(p => p.completed).length}/{walk.pois.length} points visités
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: Walk['status'] }) {
  const config = {
    pending: { label: 'Nouveau', color: 'text-gold bg-gold/10 border-gold/20' },
    active: { label: 'En cours', color: 'text-green-400 bg-green-950/50 border-green-800/30' },
    completed: { label: 'Terminé', color: 'text-muted bg-muted/10 border-border' },
  };
  const c = config[status];
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs border ${c.color}`}>
      {c.label}
    </span>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
