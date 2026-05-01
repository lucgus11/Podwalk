import { openDB, IDBPDatabase } from 'idb';
import { Walk } from '@/types';

const DB_NAME = 'podwalk-db';
const DB_VERSION = 1;
const WALKS_STORE = 'walks';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(WALKS_STORE)) {
          const store = db.createObjectStore(WALKS_STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('city', 'city');
          store.createIndex('status', 'status');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveWalk(walk: Walk): Promise<void> {
  const db = await getDB();
  await db.put(WALKS_STORE, walk);
}

export async function getWalk(id: string): Promise<Walk | undefined> {
  const db = await getDB();
  return db.get(WALKS_STORE, id);
}

export async function getAllWalks(): Promise<Walk[]> {
  const db = await getDB();
  return db.getAll(WALKS_STORE);
}

export async function updateWalk(id: string, updates: Partial<Walk>): Promise<void> {
  const db = await getDB();
  const existing = await db.get(WALKS_STORE, id);
  if (existing) {
    await db.put(WALKS_STORE, { ...existing, ...updates });
  }
}

export async function markPOICompleted(walkId: string, poiId: string): Promise<void> {
  const db = await getDB();
  const walk = await db.get(WALKS_STORE, walkId);
  if (walk) {
    walk.pois = walk.pois.map((poi: Walk['pois'][0]) =>
      poi.id === poiId ? { ...poi, completed: true } : poi
    );

    const allCompleted = walk.pois.every((poi: Walk['pois'][0]) => poi.completed);
    if (allCompleted) {
      walk.status = 'completed';
      walk.completedAt = new Date().toISOString();
    } else {
      walk.status = 'active';
    }

    await db.put(WALKS_STORE, walk);
  }
}

export async function markPOITriggered(walkId: string, poiId: string): Promise<void> {
  const db = await getDB();
  const walk = await db.get(WALKS_STORE, walkId);
  if (walk) {
    walk.pois = walk.pois.map((poi: Walk['pois'][0]) =>
      poi.id === poiId ? { ...poi, triggered: true } : poi
    );
    if (walk.status === 'pending') walk.status = 'active';
    await db.put(WALKS_STORE, walk);
  }
}

export async function deleteWalk(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(WALKS_STORE, id);
}

export async function getWalkCount(): Promise<number> {
  const db = await getDB();
  return db.count(WALKS_STORE);
}
