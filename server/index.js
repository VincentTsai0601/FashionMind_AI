import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';


// Prefer .env.local for local development if it exists, otherwise fall back to .env
const dotenvPath = fs.existsSync('.env.local') ? '.env.local' : (fs.existsSync('.env') ? '.env' : undefined);
if (dotenvPath) {
  dotenv.config({ path: dotenvPath });
} else {
  // load default (no-op) to keep behavior consistent
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3001;

//app.use(cors());
// app.use(cors({
//   origin: [
//     'http://localhost:3000',
//     'https://vincenttsai0601.github.io'
//   ],
//   methods: ['GET', 'POST'],
// }));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://vincenttsai0601.github.io'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// Explicitly handle preflight
app.options(/.*/, cors());


app.use(bodyParser.json({ limit: '20mb' }));

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is missing. Set it in your environment before starting the server.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/get-weather', async (req, res) => {
  try {
    const { locationQuery } = req.body;
    // Use a simpler prompt without googleSearch tool to get typical weather patterns
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on typical weather patterns, provide a brief weather summary for ${locationQuery}. Format: "Location: Temperature, Condition" (e.g., "New York: 15°C, Cloudy"). If you don't know the exact current weather, provide a reasonable estimate based on the season and location.`
    });
    res.json(response);
  } catch (err) {
    console.error('Weather error:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/suggest-outfit', async (req, res) => {
  try {
    const { imageBase64, userPreference, categories, nationality, season, weather, gender, skinTone } = req.body;
    const cleanBase64 = (imageBase64 || '').split(',')[1] || imageBase64 || '';

    const prompt = req.body.prompt || `You are an expert fashion stylist. Analyze the person in the image.`; // client may pass full prompt

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    // Extract JSON text from nested Gemini response
    let jsonText = response.text || '';
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      jsonText = response.candidates[0].content.parts[0].text;
    }
    
    try {
      const parsed = JSON.parse(jsonText);
      res.json({ text: jsonText, parsed });
    } catch (e) {
      // If JSON parsing fails, return the raw response
      res.json(response);
    }
  } catch (err) {
    console.error('suggest-outfit error', err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/generate-tryon', async (req, res) => {
  try {
    const { imageBase64, itemDescription, categories, season, weather, gender, skinTone } = req.body;
    const cleanBase64 = (imageBase64 || '').split(',')[1] || imageBase64 || '';

    if (!cleanBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const prompt = req.body.prompt || `Generate a photorealistic image of the person in this photo wearing: ${itemDescription}.`;

    try {
      // Try the premium image model first
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
          ]
        }
      });

      // try to extract image bytes from response candidates
      const candidates = response.candidates || [];
      const parts = candidates[0]?.content?.parts || [];
      const generated = parts.find(p => p.inlineData && p.inlineData.data);
      if (generated) {
        return res.json({ image: `data:image/jpeg;base64,${generated.inlineData.data}` });
      }

      return res.status(500).json({ error: 'No image returned from model', raw: response });
    } catch (imageModelErr) {
      // If image model fails (quota exhausted), fall back to creating a text description
      console.log('Image model unavailable, using fallback text description...');
      
      // Check if it's a quota error
      if (imageModelErr.message?.includes('429') || imageModelErr.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn('Free tier quota exhausted. Returning styled description instead of generated image.');
        
        // Use the flash model to generate a detailed styled description
        const styleResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              { text: `You are an AI image generator prompt writer. Create a detailed, technical visual description for generating an image of someone wearing: ${itemDescription}. Include specific details about colors, fabrics, fit, and style. Be direct and factual. Do not add commentary or notes. Just the description.` }
            ]
          }
        });

        // Extract text properly from nested Gemini response structure
        let styledDescription = itemDescription;
        if (styleResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
          styledDescription = styleResponse.candidates[0].content.parts[0].text;
        } else if (styleResponse.text) {
          styledDescription = styleResponse.text;
        }
        
        // Return the fallback with a note
        return res.json({ 
          image: null,
          fallback: true,
          description: styledDescription,
          note: 'Virtual try-on image generation is temporarily unavailable (free tier quota exceeded). Please upgrade your API plan at https://aistudio.google.com/ for full functionality.'
        });
      }

      // Re-throw if it's a different error
      throw imageModelErr;
    }
  } catch (err) {
    console.error('generate-tryon error', err);
    let statusCode = 500;
    let errorMsg = String(err);
    
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      statusCode = 429;
      errorMsg = 'API rate limit exceeded. Please wait before trying again. Consider upgrading at https://aistudio.google.com/';
    } else if (err.message?.includes('401') || err.message?.includes('UNAUTHENTICATED')) {
      statusCode = 401;
      errorMsg = 'Invalid API key. Please check your GEMINI_API_KEY environment variable.';
    } else if (err.message?.includes('MODEL_NOT_FOUND') || err.message?.includes('not found')) {
      statusCode = 400;
      errorMsg = 'Model gemini-2.5-flash-image is not available. Check your API access.';
    }
    
    res.status(statusCode).json({ error: errorMsg });
  }
});

app.post('/api/generate-rotation', async (req, res) => {
  try {
    const { imageBase64, description } = req.body;
    const cleanBase64 = (imageBase64 || '').split(',')[1] || imageBase64 || '';

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic 360 degree turntable shot of this fashion model wearing ${description}.`,
      image: { imageBytes: cleanBase64, mimeType: 'image/jpeg' },
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
    });

    // Poll until done - simple loop
    while (!operation.done) {
      await new Promise(r => setTimeout(r, 3000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) return res.status(500).json({ error: 'No video URI' });

    // Return the URI (client can fetch). Append key if necessary for now.
    res.json({ uri: `${videoUri}&key=${apiKey}` });
  } catch (err) {
    console.error('generate-rotation error', err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/stylist-chat', async (req, res) => {
  try {
    const { history, newMessage } = req.body;
    
    // Create chat with system context for fashion styling
    const systemPrompt = `You are Vortex, an expert luxury fashion stylist with 20+ years of experience. Your personality is:
- Knowledgeable and trendy (aware of current fashion)
- Personalized and attentive to the user's needs
- Encouraging and confident
- Practical but also creative
- Respectful of diverse styles and body types

Provide fashion advice that is:
1. Specific and actionable (not generic)
2. Considers the user's personal style
3. Explains the 'why' behind recommendations
4. Includes details about colors, fabrics, and fits
5. Adaptable to different occasions and seasons

Keep responses conversational but informative (2-3 paragraphs).`;
    
    // Build message history with better formatting
    const messageHistory = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Thank you for that context. I\'m ready to provide personalized fashion styling advice. What can I help you with today?' }] }
    ];
    
    // Add conversation history
    (history || []).forEach(h => {
      messageHistory.push({
        role: h.role,
        parts: [{ text: h.text }]
      });
    });
    
    const chat = ai.chats.create({ 
      model: 'gemini-2.5-flash', 
      history: messageHistory.slice(0, -2) // Exclude the context exchange from history passed to API
    });
    
    const response = await chat.sendMessage({ message: newMessage });
    res.json(response);
  } catch (err) {
    console.error('stylist-chat error', err);
    res.status(500).json({ error: String(err) });
  }
});

// ============================================================
// OLLAMA ENDPOINTS
// ============================================================

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL || 'mistral';
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llava';

console.log('Ollama Configuration:');
console.log('  OLLAMA_URL:', OLLAMA_URL);
console.log('  OLLAMA_TEXT_MODEL:', OLLAMA_TEXT_MODEL);
console.log('  OLLAMA_VISION_MODEL:', OLLAMA_VISION_MODEL);

/**
 * Helper function to call Ollama API
 */
const callOllama = async (model, prompt, image = null) => {
  try {
    const payload = {
      model,
      prompt,
      stream: false,
    };
    
    if (image) {
      payload.images = [image];
    }

    console.log('Calling Ollama with model:', model);
    console.log('Ollama URL:', `${OLLAMA_URL}/api/generate`);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Ollama error response:', errorText);
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
  } catch (err) {
    console.error('Ollama call failed:', err);
    throw err;
  }
};

// Ollama: Suggest Outfit
app.post('/api/ollama/suggest-outfit', async (req, res) => {
  try {
    const { prompt } = req.body;
    // Use text model for outfit suggestions to avoid waiting for vision model
    const fullPrompt = prompt || `You are an expert fashion stylist. Provide outfit suggestions.`;
    
    const response = await callOllama(OLLAMA_TEXT_MODEL, fullPrompt);
    
    // Try to parse as JSON, otherwise wrap in JSON
    let parsed;
    try {
      parsed = JSON.parse(response);
    } catch {
      // If not JSON, create a default response
      parsed = {
        description: response.substring(0, 300),
        advice: response.substring(300, 600) || 'Here is a look curated for you.'
      };
    }

    res.json({ text: JSON.stringify(parsed), parsed });
  } catch (err) {
    console.error('ollama suggest-outfit error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Ollama: Generate Try-On Description
app.post('/api/ollama/generate-tryon', async (req, res) => {
  try {
    const { prompt } = req.body;
    // Use text model for try-on descriptions
    const fullPrompt = prompt || `Describe how this person would look wearing the suggested item.`;
    
    const response = await callOllama(OLLAMA_TEXT_MODEL, fullPrompt);
    
    res.json({ description: response });
  } catch (err) {
    console.error('ollama generate-tryon error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Ollama: Stylist Chat
app.post('/api/ollama/stylist-chat', async (req, res) => {
  try {
    const { history, newMessage } = req.body;
    
    // Build conversation context
    const conversationContext = (history || [])
      .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
      .join('\n');
    
    const fullPrompt = `You are a fashion stylist. Here is the conversation history:\n${conversationContext}\nUser: ${newMessage}\nAssistant:`;
    
    const response = await callOllama(OLLAMA_TEXT_MODEL, fullPrompt);
    
    res.json({ text: response });
  } catch (err) {
    console.error('ollama stylist-chat error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Ollama: Get Weather (simulated - Ollama has no real-time access)
app.post('/api/ollama/get-weather', async (req, res) => {
  try {
    const { locationQuery } = req.body;
    
    const prompt = `Based on typical weather patterns, describe current weather conditions in ${locationQuery}. Keep it brief (e.g., "Location: 20°C, Sunny"). Note: This is a simulated response as Ollama has no real-time access.`;
    
    const response = await callOllama(OLLAMA_TEXT_MODEL, prompt);
    
    res.json({ text: response });
  } catch (err) {
    console.error('ollama get-weather error', err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
