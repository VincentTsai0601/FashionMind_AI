import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

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

app.use(cors());
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `What is the current weather in ${locationQuery}? Return a very concise summary (e.g., \"City: 20°C, Sunny\").`,
      config: { tools: [{ googleSearch: {} }] }
    });
    res.json(response);
  } catch (err) {
    console.error(err);
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

    res.json(response);
  } catch (err) {
    console.error('suggest-outfit error', err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/generate-tryon', async (req, res) => {
  try {
    const { imageBase64, itemDescription, categories, season, weather, gender, skinTone } = req.body;
    const cleanBase64 = (imageBase64 || '').split(',')[1] || imageBase64 || '';

    const prompt = req.body.prompt || `Generate a photorealistic image of the person in this photo wearing: ${itemDescription}.`;

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

    res.status(500).json({ error: 'No image returned from model', raw: response });
  } catch (err) {
    console.error('generate-tryon error', err);
    res.status(500).json({ error: String(err) });
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
    const chat = ai.chats.create({ model: 'gemini-2.5-flash', history: (history || []).map(h => ({ role: h.role, parts: [{ text: h.text }] })) });
    const response = await chat.sendMessage({ message: newMessage });
    res.json(response);
  } catch (err) {
    console.error('stylist-chat error', err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
