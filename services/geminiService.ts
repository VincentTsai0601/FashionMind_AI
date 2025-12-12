import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

// Initialize Gemini Client
// Note: API Key is injected via process.env.API_KEY environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Fetches the current weather for a given query (City or Lat/Long) using Google Search Grounding.
 */
export const getWeather = async (locationQuery: string): Promise<{ text: string; sources: { title: string; uri: string }[] }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `What is the current weather in ${locationQuery}? Return a very concise summary (e.g., "City: 20°C, Sunny").`,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const text = response.text || "Weather data unavailable";
        
        // Extract sources from grounding chunks if available
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => chunk.web)
            .filter((web: any) => web) || [];

        return { text, sources };
    } catch (error) {
        console.error("Weather Fetch Error:", error);
        return { text: "Unable to fetch weather", sources: [] };
    }
};

/**
 * Analyzes the user's photo and suggests a suitable outfit description and advice.
 * Uses Gemini 2.5 Flash with multimodal capabilities and JSON output.
 */
export const suggestOutfit = async (
    imageBase64: string,
    userPreference: string,
    categories: string[],
    nationality: string,
    season: string,
    weather: string,
    gender: string,
    skinTone: string
): Promise<{ description: string; advice: string }> => {
    try {
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        const categoriesStr = categories.length > 0 ? categories.join(', ') : 'complete outfit';

        const prompt = `
            You are an expert fashion stylist.
            Analyze the person in the image.
            
            User Demographics:
            - Gender: ${gender}
            - Skin Tone / Ethnicity: ${skinTone}
            
            Context:
            - Preference/Vision: "${userPreference}"
            - Target Items: ${categoriesStr}
            - Season: "${season}"
            - Weather: "${weather}"
            - Region Style: "${nationality}"

            Tasks:
            1. Select specific fashion items for the requested categories (${categoriesStr}).
            2. COLOR THEORY: CRITICAL - Choose colors that strictly complement the user's ${skinTone} skin tone (e.g., earthy tones for olive skin, jewel tones for darker skin, pastels for lighter skin, etc).
            3. FIT: Ensure the cut and silhouette matches the requested gender (${gender}) and current high-fashion trends.
            4. Write a detailed visual description for image generation (fabric, color, fit).
            5. Write a short advice explaining why these colors/cuts suit their skin tone and gender.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        advice: { type: Type.STRING }
                    },
                    required: ['description', 'advice']
                }
            }
        });

        const json = JSON.parse(response.text || '{}');
        return {
            description: json.description || userPreference || `Stylish ${categoriesStr} for ${gender}`,
            advice: json.advice || "Here is a look I think you'll love!"
        };

    } catch (error) {
        console.error("Suggestion Error:", error);
        // Fallback
        const catStr = categories.length > 0 ? categories.join(' and ') : 'outfit';
        return {
            description: userPreference || `A stylish ${catStr}`,
            advice: "I couldn't generate a specific suggestion, so I improvised a trendy look for you."
        };
    }
};

/**
 * Generates a Virtual Try-On image using Gemini 2.5 Flash Image model.
 * It uses the "editing" capability by passing the source image and a text prompt.
 */
export const generateVirtualTryOn = async (
    imageBase64: string,
    itemDescription: string,
    categories: string[],
    season: string,
    weather: string,
    gender: string,
    skinTone: string
): Promise<string> => {
    try {
        // Using 'gemini-2.5-flash-image' for image editing/generation
        const model = 'gemini-2.5-flash-image';
        
        // Clean base64 string if it contains metadata
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        const categoriesStr = categories.length > 0 ? categories.join(', ') : 'outfit';

        // Construct a prompt that guides the model to "edit" the person's clothing
        // without changing their identity or the background.
        const prompt = `
            Act as a professional virtual fashion stylist.
            Generate a photorealistic image of the person in this photo wearing: ${itemDescription}.
            
            Subject Attributes:
            - Gender: ${gender}
            - Skin Tone: ${skinTone}
            
            Context:
            - Categories being changed: ${categoriesStr}
            - Season: ${season}
            - Weather: ${weather}
            
            Strict Requirements:
            1. Keep the person's face, body pose, identity, and skin tone EXACTLY the same.
            2. Keep the background EXACTLY the same.
            3. The lighting on the clothing must match the scene's lighting.
            4. Ensure the clothing fit aligns with standard ${gender} fashion tailoring.
            5. Output ONLY the image.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    {
                        text: prompt
                    },
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: cleanBase64
                        }
                    }
                ]
            }
        });

        // Parse response to find the image
        // Gemini returns inlineData for generated images in the parts list
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from Gemini.");
        }

        const parts = candidates[0].content.parts;
        let generatedImageBase64 = null;

        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                generatedImageBase64 = part.inlineData.data;
                break;
            }
        }

        if (!generatedImageBase64) {
            // Sometimes models return text saying they can't do it, handle that.
            const textPart = parts.find(p => p.text);
            if (textPart) {
                throw new Error(`Model returned text instead of image: ${textPart.text}`);
            }
            throw new Error("No image data found in response.");
        }

        return `data:image/jpeg;base64,${generatedImageBase64}`;

    } catch (error) {
        console.error("Try-On Generation Error:", error);
        throw error;
    }
};

/**
 * Chat with the Stylist (Text only, but can be multimodal if we passed history images).
 * Using Gemini 2.5 Flash for speed.
 */
export const getStylistAdvice = async (
    history: { role: string; text: string }[],
    newMessage: string
): Promise<string> => {
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are a high-end fashion stylist named 'Vortex'. You are helpful, trendy, and concise. Offer advice on color theory, fit, and accessories. Keep responses under 100 words unless asked for more details.",
            },
            history: history.map(h => ({
                role: h.role,
                parts: [{ text: h.text }]
            }))
        });

        const response: GenerateContentResponse = await chat.sendMessage({
            message: newMessage
        });

        return response.text || "I'm having trouble connecting to the fashion mainframe. Please try again.";

    } catch (error) {
        console.error("Stylist Chat Error:", error);
        return "I apologize, but I cannot provide advice at this moment.";
    }
};