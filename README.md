# 🎧 Podwalk

> **Une PWA de balades audio immersives, personnalisées par IA, déclenchées par GPS**

Podwalk génère des itinéraires de promenade avec des narrations audio style documentaire, déclenchées automatiquement quand vous approchez d'un point d'intérêt. Fonctionne hors-ligne après la première utilisation.

---

## ✨ Fonctionnalités

| Feature | Description |
|---|---|
| 🤖 **IA Groq** | Narrations immersives générées par `llama-3.3-70b-versatile` |
| 📍 **GPS auto-trigger** | Audio déclenché automatiquement dans un rayon de 30-60m |
| 🗺️ **Cartes OSM** | Leaflet + OpenStreetMap, tuiles mises en cache hors-ligne |
| 💾 **Offline-first** | Service Worker + IndexedDB pour tout stocker localement |
| 🔊 **TTS natif** | Web Speech API, multilingue (FR, EN, ES, DE, IT, NL) |
| 📱 **PWA** | Installable sur iOS & Android |
| 🎨 **7 thèmes** | Histoire, Insolite, Nature, Architecture, Gastronomie, Art, Légendes |

---

## 🚀 Démarrage rapide

### 1. Cloner & installer

```bash
git clone https://github.com/votre-username/podwalk.git
cd podwalk
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Ouvrez `.env.local` et ajoutez votre clé Groq :

```env
GROQ_API_KEY=gsk_votre_cle_groq_ici
```

**Obtenir une clé Groq gratuitement :**
1. Créez un compte sur [console.groq.com](https://console.groq.com)
2. Allez dans **API Keys** → **Create API Key**
3. Copiez la clé dans votre `.env.local`

### 3. Lancer en développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

> ⚠️ **Note GPS** : La géolocalisation requiert HTTPS en production. En développement local (localhost), elle fonctionne sans HTTPS.

---

## 🌐 Déploiement sur Vercel

### Via CLI (recommandé)

```bash
npm install -g vercel
vercel login
vercel
```

### Via GitHub (auto-deploy)

1. Poussez votre code sur GitHub
2. Importez le repo sur [vercel.com/new](https://vercel.com/new)
3. **Configurez la variable d'environnement** dans Vercel :
   - Settings → Environment Variables
   - Ajoutez : `GROQ_API_KEY` = `gsk_votre_cle`
4. Cliquez **Deploy**

### Variables d'environnement Vercel

| Variable | Valeur | Requis |
|---|---|---|
| `GROQ_API_KEY` | `gsk_xxx...` | ✅ Oui |
| `NEXT_PUBLIC_APP_URL` | `https://votre-app.vercel.app` | Non |

---

## 🏗️ Architecture

```
podwalk/
├── app/
│   ├── layout.tsx          # Layout root + enregistrement SW
│   ├── page.tsx            # Page d'accueil (formulaire + historique)
│   ├── globals.css         # Styles globaux (thème cinématographique)
│   └── api/
│       └── generate/
│           └── route.ts    # API Route → Groq AI
│   └── walk/[id]/
│       └── page.tsx        # Page de balade (carte + lecteur)
├── components/
│   ├── WalkForm.tsx        # Formulaire de création de balade
│   ├── MapView.tsx         # Carte Leaflet/OSM avec marqueurs POI
│   ├── PlayerView.tsx      # Interface audio + narration
│   └── WalkHistory.tsx     # Historique des balades (IndexedDB)
├── lib/
│   ├── groq.ts             # Client Groq (non utilisé directement)
│   ├── indexeddb.ts        # CRUD balades dans IndexedDB
│   ├── geolocation.ts      # Hook géolocalisation + détection geofences
│   └── tts.ts              # Classe TTS (Web Speech API)
├── public/
│   ├── sw.js               # Service Worker (cache, offline)
│   ├── manifest.json       # PWA manifest
│   └── icons/              # Icônes PWA (192, 512, 180px)
├── types/
│   └── index.ts            # Types TypeScript
└── scripts/
    └── generate-icons.js   # Générateur d'icônes SVG
```

---

## 🔧 Technologies

- **Framework** : [Next.js 14](https://nextjs.org/) (App Router)
- **Language** : TypeScript
- **Styling** : Tailwind CSS
- **Cartes** : [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/)
- **IA** : [Groq](https://groq.com/) (`llama-3.3-70b-versatile`)
- **Storage** : [IndexedDB](https://developer.mozilla.org/fr/docs/Web/API/IndexedDB_API) via [`idb`](https://github.com/jakearchibald/idb)
- **Audio** : [Web Speech API](https://developer.mozilla.org/fr/docs/Web/API/Web_Speech_API) (natif)
- **PWA** : Service Workers natifs
- **Déploiement** : [Vercel](https://vercel.com/)

---

## 📱 Installation PWA

### Sur iPhone / Safari
1. Ouvrez l'app dans Safari
2. Appuyez sur **Partager** (icône carré avec flèche)
3. Sélectionnez **Ajouter à l'écran d'accueil**

### Sur Android / Chrome
1. Ouvrez l'app dans Chrome
2. Une bannière d'installation apparaîtra, ou appuyez sur le menu **⋮**
3. Sélectionnez **Ajouter à l'écran d'accueil**

---

## 🗺️ Flux de données

```
Utilisateur          Next.js             Groq API          IndexedDB
    │                   │                    │                  │
    │──[Form submit]────▶│                    │                  │
    │                   │──[POST /generate]──▶│                  │
    │                   │                    │──[llama-3.3]     │
    │                   │                    │──[JSON POIs]─────│
    │                   │◀──[Walk data]──────│                  │
    │                   │──[saveWalk()]───────────────────────▶│
    │                   │──[redirect /walk/id]                  │
    │◀──[Page balade]───│                    │                  │
    │                   │──[getWalk(id)]──────────────────────▶│
    │                   │◀──[Walk data]───────────────────────│
    │──[GPS ON]─────────▶│                    │                  │
    │──[Entre geofence]──▶│                    │                  │
    │◀──[Audio auto]────│                    │                  │
```

---

## 🔊 Fonctionnement offline

La balade est générée **une fois en Wi-Fi** puis stockée entièrement :

| Élément | Stockage | Disponible offline |
|---|---|---|
| Données POI + narrations | IndexedDB | ✅ |
| Interface app (HTML/CSS/JS) | Service Worker Cache | ✅ |
| Tuiles de carte OSM | Service Worker Cache (7j) | ✅ |
| Génération IA | Groq API (cloud) | ❌ Nécessite connexion |

---

## 📄 Licence

CC 4.0 — Voir [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">
  <p>Fait avec ❤️ et beaucoup de café</p>
  <p>Propulsé par <strong>Groq</strong> · <strong>Next.js</strong> · <strong>OpenStreetMap</strong></p>
</div>
