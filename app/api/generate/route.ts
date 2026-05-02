import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const THEME_PROMPTS: Record<string, string> = {
  'Histoire': 'historical events, famous battles, dynasties, revolutions, key historical figures, medieval history, ancient periods',
  'Insolite': 'unusual stories, hidden secrets, bizarre anecdotes, strange facts, quirky curiosities, urban legends, oddities',
  'Nature': 'parks, remarkable trees, hidden gardens, urban wildlife, geological features, natural history',
  'Architecture': 'architectural styles, building facades, urban planning, famous architects, construction history, art nouveau, gothic, baroque',
  'Gastronomie': 'food markets, culinary traditions, famous restaurants, local specialties, food history, taverns, cafés',
  'Art & Culture': 'famous artists, artworks, cultural movements, museums, theaters, literary connections, bohemian history',
  'Légendes & Mystères': 'ghost stories, myths, esoteric history, mysterious disappearances, cursed places, supernatural legends, folklore',
};

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodePOI(
  poiName: string,
  city: string,
  country: string,
  fallbackLat: number,
  fallbackLng: number
): Promise<{ lat: number; lng: number; verified: boolean }> {
  const queries = [
    `${poiName}, ${city}, ${country}`,
    `${poiName}, ${city}`,
    `${poiName}, ${country}`,
  ];

  for (const q of queries) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(q)}&format=json&limit=3&addressdetails=0`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Podwalk/1.0 (contact@podwalk.app)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) { await sleep(1100); continue; }

      const results: NominatimResult[] = await res.json();
      if (results.length === 0) { await sleep(1100); continue; }

      const best = results.reduce((a, b) =>
        (a.importance ?? 0) >= (b.importance ?? 0) ? a : b
      );

      const lat = parseFloat(best.lat);
      const lng = parseFloat(best.lon);

      if (fallbackLat !== 0 && fallbackLng !== 0) {
        const d = haversineKm(lat, lng, fallbackLat, fallbackLng);
        if (d > 50) { await sleep(1100); continue; }
      }

      return { lat, lng, verified: true };
    } catch {
      // network error or timeout
    }
    await sleep(1100);
  }

  return { lat: fallbackLat, lng: fallbackLng, verified: false };
}

async function geocodeCity(city: string, country: string) {
  try {
    const q = country ? `${city}, ${country}` : city;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Podwalk/1.0 (contact@podwalk.app)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const results: NominatimResult[] = await res.json();
    if (results.length === 0) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { city, country = '', duration, distance, theme, language } = body;

    if (!city || !theme) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const location = country ? `${city}, ${country}` : city;
    // ~1 POI per 10 min, min 3, max 8 (stays within Groq free tier token limit)
    const numPOIs = Math.max(3, Math.min(8, Math.round(duration / 10)));
    const themeContext = THEME_PROMPTS[theme] || theme;
    const langInstruction =
      language !== 'fr'
        ? `Write ALL narrations and ALL text content in ${language}.`
        : 'Écris toutes les narrations en français.';

    const systemPrompt = `You are an expert documentary narrator and urban historian. You create immersive, captivating audio walking tour scripts in BBC/National Geographic style.

${langInstruction}

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown fences, no explanations.
2. Every place MUST be a real, named, publicly accessible location in ${location}.
3. For GPS coordinates, provide your best estimate — they will be verified by OSM Nominatim. Accuracy matters.
4. The walking route must be geographically coherent: consecutive POIs should be walkable from each other.`;

    const userPrompt = `Create an immersive audio walking tour for "${location}" with the theme: "${theme}" (${themeContext}).

Parameters:
- Duration: ${duration} minutes total walk
- Distance: ~${distance} km
- Number of POIs: exactly ${numPOIs}
- Language: ${language}

Return this EXACT JSON structure:
{
  "city": "${city}",
  "country": "${country}",
  "theme": "${theme}",
  "duration": ${duration},
  "distance": ${distance},
  "centerLat": <float: real latitude of ${city} city centre>,
  "centerLng": <float: real longitude of ${city} city centre>,
  "pois": [
    {
      "id": "poi_1",
      "name": "<exact official name of the real place in its local language>",
      "lat": <float: your best GPS estimate for this specific place>,
      "lng": <float: your best GPS estimate for this specific place>,
      "radius": <int: geofence trigger in meters, 25-50>,
      "order": 1,
      "category": "<specific sub-category, e.g. 'Église gothique', 'Place médiévale'>",
      "completed": false,
      "triggered": false,
      "narration": "<150-200 word immersive narration. Sensory hook, one key historical fact, one surprising anecdote, present tense. End with a transition to the next stop.>"
    }
  ]
}

ROUTE DESIGN RULES:
- Start at the most iconic or accessible landmark
- Space POIs ~${Math.round((distance * 1000) / numPOIs)}m apart on average
- Follow real streets — no shortcuts through private property or waterways
- Cover ${distance} km in a geographically coherent route
- ${numPOIs} distinct, real, named places with their correct local names`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.65,
      max_tokens: 7000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Réponse vide de l'IA");

    const walkData = JSON.parse(content);

    if (!walkData.pois || !Array.isArray(walkData.pois) || walkData.pois.length === 0) {
      throw new Error('Structure de données invalide retournée par le modèle');
    }

    // ── 1. Geocode city center ────────────────────────────────
    const cityGeo = await geocodeCity(city, country);
    if (cityGeo) {
      walkData.centerLat = cityGeo.lat;
      walkData.centerLng = cityGeo.lng;
    }
    await sleep(1100);

    // ── 2. Geocode each POI via Nominatim ────────────────────
    const geocodedPOIs = [];
    for (let i = 0; i < walkData.pois.length; i++) {
      const poi = walkData.pois[i] as Record<string, unknown>;
      const fallbackLat = typeof poi.lat === 'number' ? poi.lat : walkData.centerLat;
      const fallbackLng = typeof poi.lng === 'number' ? poi.lng : walkData.centerLng;

      const geo = await geocodePOI(
        String(poi.name || ''),
        city,
        country,
        fallbackLat,
        fallbackLng
      );

      geocodedPOIs.push({
        ...poi,
        id: poi.id || `poi_${i + 1}`,
        order: typeof poi.order === 'number' ? poi.order : i + 1,
        lat: geo.lat,
        lng: geo.lng,
        geocoded: geo.verified,
        completed: false,
        triggered: false,
        radius: typeof poi.radius === 'number' ? poi.radius : 40,
      });

      if (i < walkData.pois.length - 1) await sleep(300);
    }

    walkData.pois = geocodedPOIs;
    walkData.country = country;

    return NextResponse.json(walkData);
  } catch (error: unknown) {
    console.error('[Podwalk API] Error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: `Échec de la génération: ${msg}` }, { status: 500 });
  }
}
