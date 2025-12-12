import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

// Initialize Gemini Client
// Note: API Key is injected via process.env.API_KEY environment variable.
let ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        const weatherContext = weather || "Not specified (assume standard indoor/outdoor)";

        const prompt = `
            You are an expert fashion stylist.
            Analyze the person in the image.
            
            User Demographics:
            - Gender: ${gender}
            - Skin Tone: ${skinTone}
            
            Context:
            - User Vision: "${userPreference}"
            - Target Categories: ${categoriesStr}
            - Season: "${season}"
            - Weather: "${weatherContext}"
            - Region Style: "${nationality}"

            Tasks:
            1. Analyze the User's Vision (if provided) and the environment.
            2. WEATHER CHECK: Ensure the outfit is practical for "${weatherContext}". (e.g., suggest breathable fabrics for heat, layers for cold, water-resistant for rain).
            3. COLOR THEORY: Choose colors that strictly complement the user's ${skinTone} skin tone.
            4. Refine the description:
               - If User Vision is present: Keep the core idea but enhance it with weather-appropriate fabrics and flattering cuts.
               - If User Vision is empty: Create a completely new, trendy look fitting the season/weather.
            5. Output JSON:
               - "description": Detailed visual prompt for the image generator (include fabric textures).
               - "advice": A friendly stylist note explaining how this look adapts to the *Weather* and suits their *Skin Tone*.
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
            advice: json.advice || "Here is a look curated for the current atmosphere."
        };

    } catch (error) {
        console.error("Suggestion Error:", error);
        // Fallback
        const catStr = categories.length > 0 ? categories.join(' and ') : 'outfit';
        return {
            description: userPreference || `A stylish ${catStr}`,
            advice: "I've improvised a look for you based on the context."
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
        const weatherContext = weather || "Standard";

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
            - Weather: "${weatherContext}"
            
            Strict Requirements:
            1. Keep the person's face, body pose, identity, and skin tone EXACTLY the same.
            2. Keep the background EXACTLY the same.
            3. ATMOSPHERE ADAPTATION: Ensure fabric weight, texture, and lighting match the weather context (e.g. heavier for cold, lighter for hot, subtle wetness if raining).
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
 * Generates a 360-degree rotating video of the subject using Veo.
 * NOTE: Creates a new client instance to ensure latest API key is used.
 */
export const generateRotationVideo = async (
    imageBase64: string, 
    description: string
): Promise<string> => {
    // IMPORTANT: Create a fresh instance to pick up the key if user just selected it via window.aistudio
    const freshAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

    console.log("Starting Veo generation...");
    
    let operation = await freshAi.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic 360 degree turntable shot of this fashion model wearing ${description}. Smooth camera motion, high fashion editorial lighting, photorealistic 4k.`,
        image: {
            imageBytes: cleanBase64,
            mimeType: 'image/jpeg',
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '9:16' // Matches vertical portrait
        }
    });

    console.log("Video operation started:", operation);

    // Poll for completion
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5s
        operation = await freshAi.operations.getVideosOperation({ operation: operation });
        console.log("Polling video status...");
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
        throw new Error("Video generation failed or returned no URI");
    }

    // Append API key to fetch the binary content
    return `${videoUri}&key=${process.env.API_KEY}`;
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