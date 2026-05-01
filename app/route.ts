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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { city, duration, distance, theme, language } = body;

    if (!city || !theme) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const numPOIs = Math.max(3, Math.min(8, Math.floor(duration / 12)));
    const themeContext = THEME_PROMPTS[theme] || theme;
    const langInstruction = language !== 'fr'
      ? `Write ALL narrations and ALL text content in ${language}.`
      : 'Écris toutes les narrations en français.';

    const systemPrompt = `You are an expert documentary narrator and urban historian. You create immersive, captivating audio walking tour scripts. Your style is like a BBC or National Geographic documentary — dramatic, factual, emotionally engaging. You use vivid imagery, surprising facts, and storytelling techniques.

${langInstruction}

CRITICAL: You must return ONLY valid JSON, no markdown, no explanations, just the JSON object.`;

    const userPrompt = `Create an immersive audio walking tour for ${city} with the theme: "${theme}" (${themeContext}).

Parameters:
- Duration: ${duration} minutes
- Distance: ${distance} km
- Number of POIs: ${numPOIs}
- Theme focus: ${themeContext}

Return a JSON object with this EXACT structure:
{
  "city": "${city}",
  "theme": "${theme}",
  "duration": ${duration},
  "distance": ${distance},
  "centerLat": <float: city center latitude>,
  "centerLng": <float: city center longitude>,
  "pois": [
    {
      "id": "poi_1",
      "name": "<name of the real place>",
      "lat": <float: exact real latitude>,
      "lng": <float: exact real longitude>,
      "radius": <int: trigger radius in meters, 30-60>,
      "order": 1,
      "category": "<sub-category>",
      "completed": false,
      "triggered": false,
      "narration": "<300-400 word immersive narration in documentary style. Start with an atmospheric hook. Include real historical facts, sensory details, dramatic anecdotes. Use present tense for immediacy. End with a transition to the next point.>"
    }
  ]
}

IMPORTANT:
- Use REAL, EXISTING places with ACCURATE GPS coordinates for ${city}
- Make the walking route logical and connected (not jumping across the city)
- Each narration should be 300-400 words, captivating, and factually accurate
- The route should cover approximately ${distance} km and take ${duration} minutes
- Start from a recognizable landmark and create a coherent route`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Réponse vide de l\'IA');
    }

    const walkData = JSON.parse(content);

    // Validate structure
    if (!walkData.pois || !Array.isArray(walkData.pois) || walkData.pois.length === 0) {
      throw new Error('Structure de données invalide');
    }

    // Ensure all POIs have required fields
    walkData.pois = walkData.pois.map((poi: Record<string, unknown>, index: number) => ({
      ...poi,
      id: poi.id || `poi_${index + 1}`,
      order: poi.order || index + 1,
      completed: false,
      triggered: false,
      radius: poi.radius || 40,
    }));

    return NextResponse.json(walkData);
  } catch (error: unknown) {
    console.error('[Podwalk API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: `Échec de la génération: ${errorMessage}` },
      { status: 500 }
    );
  }
}
