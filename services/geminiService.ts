import { GenerateContentResponse, Type } from "@google/genai";

// Client-side proxy wrappers. These functions call the local server proxy
// endpoints under `/api/*` which perform the actual Gemini calls using a
// server-side API key. This prevents exposing the key to the browser.

const API_BASE =
    import.meta.env.PROD
    ? 'https://fashionmind-ai-backend.onrender.com'
    : 'http://localhost:3001';


const apiFetch = async (path: string, body: any, retries: number = 3): Promise<any> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            if (!res.ok) {
                const errText = await res.text();
                try {
                    const errJson = JSON.parse(errText);
                    lastError = new Error(`${res.status}: ${errJson.error || errText}`);
                } catch {
                    lastError = new Error(`${res.status}: ${errText || res.statusText}`);
                }
                
                // Rate limit (429) or server error (5xx) - retry with backoff
                if (res.status === 429 || res.status >= 500) {
                    if (attempt < retries - 1) {
                        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000) + Math.random() * 1000;
                        console.log(`Rate limited or server error. Retrying in ${backoffMs.toFixed(0)}ms... (Attempt ${attempt + 1}/${retries})`);
                        await new Promise(resolve => setTimeout(resolve, backoffMs));
                        continue;
                    }
                }
                
                throw lastError;
            }
            
            return res.json();
        } catch (error) {
            lastError = error as Error;
            
            // If it's a rate limit, retry
            if (lastError.message.includes('429') && attempt < retries - 1) {
                const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000) + Math.random() * 1000;
                console.log(`Rate limited. Retrying in ${backoffMs.toFixed(0)}ms... (Attempt ${attempt + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                continue;
            }
            
            if (attempt === retries - 1) {
                throw lastError;
            }
        }
    }
    
    throw lastError || new Error('Unknown error occurred');
};

/**
 * Fetches the current weather for a given query (City or Lat/Long) using Gemini.
 */
export const getWeather = async (locationQuery: string): Promise<{ text: string; sources: { title: string; uri: string }[] }> => {
    try {
        const response = await apiFetch('/api/get-weather', { locationQuery });
        
        // Extract text from Gemini response
        let text = 'Weather data unavailable';
        let sources: { title: string; uri: string }[] = [];
        
        // Try different possible response structures
        if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
            text = response.candidates[0].content.parts[0].text;
        } else if (response.text) {
            text = response.text;
        } else if (response.output?.[0]?.text) {
            text = response.output[0].text;
        }
        
        // Extract sources if available
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            sources = response.candidates[0].groundingMetadata.groundingChunks
                .map((c: any) => c.web)
                .filter((w: any) => w) || [];
        }
        
        return { text, sources };
    } catch (error) {
        console.error('Weather Fetch Error:', error);
        return { text: 'Unable to fetch weather', sources: [] };
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
            You are an expert luxury fashion stylist with 20+ years of experience. Your task is to provide comprehensive, detailed outfit recommendations.
            
            User Demographics:
            - Gender: ${gender}
            - Skin Tone: ${skinTone}
            
            Context:
            - User Vision/Preference: "${userPreference}"
            - Clothing Categories: ${categoriesStr}
            - Season: ${season}
            - Weather: ${weatherContext}
            - Regional/Cultural Style: ${nationality}

            COMPREHENSIVE ANALYSIS REQUIRED:
            
            1. PERSONAL ANALYSIS:
               - Analyze the person's body type, skin tone, and current style from the image
               - Consider what flatters their specific complexion and features
            
            2. WEATHER-APPROPRIATE STYLING:
               - For cold (${weatherContext.includes('Cold') || weatherContext.includes('Snow')}): Suggest thermal layers, insulated fabrics, windproof materials
               - For hot (${weatherContext.includes('Hot') || weatherContext.includes('Sunny')}): Recommend breathable fabrics (cotton, linen), UV protection
               - For rain: Suggest water-resistant, quick-dry materials
               - Match fabric weight and texture to the conditions
            
            3. COLOR THEORY & SKIN TONE:
               - Recommend specific colors that complement ${skinTone} skin tone
               - Explain WHY these colors work (undertones, contrast, harmony)
               - Suggest complementary accent colors
            
            4. FABRIC & MATERIAL RECOMMENDATIONS:
               - Specific fabric types (silk, cotton, wool blend, etc.)
               - Texture suggestions for visual interest
               - Quality indicators for longevity
            
            5. STYLING DETAILS:
               - Specific clothing pieces (brand styles if possible)
               - Accessory recommendations
               - Layering suggestions
               - Pattern and print recommendations
            
            6. OCCASION & VERSATILITY:
               - How this outfit works for the occasion
               - How to style it differently for other occasions
               - Mix and match possibilities
            
            OUTPUT FORMAT (JSON):
            {
              "description": "A 200-300 word detailed visual description of the outfit including: specific pieces, colors, fabrics, textures, patterns, accessories, and styling tips. Make it vivid and descriptive so it could be used as a prompt for an image generator.",
              "advice": "A 150-200 word friendly stylist recommendation explaining: why these colors work for their skin tone, how the outfit adapts to the weather conditions, care tips, and styling confidence tips. Be encouraging and specific."
            }
            
            Be VERY detailed, specific, and fashion-forward in your recommendations. Avoid generic advice. Provide actionable, wearable recommendations.
        `;

        const response = await apiFetch('/api/suggest-outfit', { imageBase64: cleanBase64, userPreference, categories, nationality, season, weather: weatherContext, gender, skinTone, prompt });
        
        // Server returns { text: "...", parsed: {...} }
        const json = response.parsed || (response.text ? JSON.parse(response.text || '{}') : {});
        return {
            description: json.description || userPreference || `Stylish ${categoriesStr} for ${gender}`,
            advice: json.advice || 'Here is a look curated for the current atmosphere.'
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

        const response = await apiFetch('/api/generate-tryon', { imageBase64: cleanBase64, itemDescription, categories, season, weather: weatherContext, gender, skinTone, prompt });
        
        // Handle fallback response (when image generation quota is exhausted)
        if (response.fallback && response.description) {
            console.warn('Using fallback description due to API quota limits');
            console.warn(response.note);
            return ''; // Return empty string to signal fallback mode to UI
        }
        
        if (response.image) return response.image;
        throw new Error('No image returned from server proxy');

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
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    console.log("Starting Veo generation...");
    const response = await apiFetch('/api/generate-rotation', { imageBase64: cleanBase64, description });
    return response.uri;
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
        const response = await apiFetch('/api/stylist-chat', { history, newMessage });
        
        // Extract text from Gemini response - check multiple possible locations
        let text = "I'm having trouble connecting to the fashion mainframe. Please try again.";
        
        if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
            text = response.candidates[0].content.parts[0].text;
        } else if (response.text) {
            text = response.text;
        } else if (response.output?.[0]?.text) {
            text = response.output[0].text;
        }
        
        return text;

    } catch (error) {
        console.error("Stylist Chat Error:", error);
        return "I apologize, but I cannot provide advice at this moment. Please make sure the backend server is running (npm run server).";
    }
};