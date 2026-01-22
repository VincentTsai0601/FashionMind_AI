// Client-side proxy wrappers for Ollama service
// These functions call local server proxy endpoints under `/api/*` which perform
// the actual Ollama calls using a local Ollama instance

const apiFetch = async (path: string, body: any, retries: number = 3): Promise<any> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await fetch(path, {
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
                
                // Retry on server error (5xx)
                if (res.status >= 500) {
                    if (attempt < retries - 1) {
                        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000) + Math.random() * 1000;
                        console.log(`Server error. Retrying in ${backoffMs.toFixed(0)}ms... (Attempt ${attempt + 1}/${retries})`);
                        await new Promise(resolve => setTimeout(resolve, backoffMs));
                        continue;
                    }
                }
                
                throw lastError;
            }
            
            return res.json();
        } catch (error) {
            lastError = error as Error;
            
            if (attempt === retries - 1) {
                throw lastError;
            }
        }
    }
    
    throw lastError || new Error('Unknown error occurred');
};

/**
 * Analyzes the user's photo and suggests a suitable outfit description and advice.
 * Uses Ollama's text capabilities (llava for vision if available).
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
            1. Consider the User's Vision (if provided) and the environment.
            2. WEATHER CHECK: Ensure the outfit is practical for "${weatherContext}". (e.g., suggest breathable fabrics for heat, layers for cold, water-resistant for rain).
            3. COLOR THEORY: Choose colors that strictly complement the user's ${skinTone} skin tone.
            4. Refine the description:
               - If User Vision is present: Keep the core idea but enhance it with weather-appropriate fabrics and flattering cuts.
               - If User Vision is empty: Create a completely new, trendy look fitting the season/weather.
            5. Return a JSON response with:
               - "description": Detailed visual prompt for the image generator (include fabric textures).
               - "advice": A friendly stylist note explaining how this look adapts to the Weather and suits their Skin Tone.
            
            IMPORTANT: Return only valid JSON, no additional text.
        `;

        const response = await apiFetch('/api/ollama/suggest-outfit', { 
            imageBase64: cleanBase64, 
            userPreference, 
            categories, 
            nationality, 
            season, 
            weather: weatherContext, 
            gender, 
            skinTone, 
            prompt 
        });
        
        // Parse the response
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
 * Generates outfit description for Virtual Try-On using Ollama.
 * Since Ollama typically doesn't support image generation, we'll use text-based suggestions.
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
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        const categoriesStr = categories.length > 0 ? categories.join(', ') : 'outfit';
        const weatherContext = weather || "Standard";

        const prompt = `
            Act as a professional virtual fashion stylist.
            Generate a detailed photorealistic description for an AI image generator of the person wearing: ${itemDescription}.
            
            Subject Attributes:
            - Gender: ${gender}
            - Skin Tone: ${skinTone}
            
            Context:
            - Categories being changed: ${categoriesStr}
            - Season: ${season}
            - Weather: "${weatherContext}"
            
            Requirements:
            1. Keep the person's face, body pose, identity, and skin tone EXACTLY the same.
            2. Keep the background EXACTLY the same.
            3. ATMOSPHERE ADAPTATION: Ensure fabric weight, texture, and lighting match the weather context (e.g. heavier for cold, lighter for hot, subtle wetness if raining).
            4. Ensure the clothing fit aligns with standard ${gender} fashion tailoring.
            5. Provide a detailed visual description suitable for image generation tools.
        `;

        const response = await apiFetch('/api/ollama/generate-tryon', { 
            imageBase64: cleanBase64, 
            itemDescription, 
            categories, 
            season, 
            weather: weatherContext, 
            gender, 
            skinTone, 
            prompt 
        });
        
        return response.description || '';

    } catch (error) {
        console.error("Try-On Generation Error:", error);
        throw error;
    }
};

/**
 * Chat with the Stylist using Ollama (Text only).
 */
export const getStylistAdvice = async (
    history: { role: string; text: string }[],
    newMessage: string
): Promise<string> => {
    try {
        const response = await apiFetch('/api/ollama/stylist-chat', { history, newMessage });
        return response.text || "I'm having trouble connecting to the fashion mainframe. Please try again.";

    } catch (error) {
        console.error("Stylist Chat Error:", error);
        return "I apologize, but I cannot provide advice at this moment.";
    }
};

/**
 * Get weather information (text-based using Ollama, not real-time).
 * Note: Ollama cannot fetch real-time weather. This is a simulated response.
 */
export const getWeather = async (locationQuery: string): Promise<{ text: string; sources: { title: string; uri: string }[] }> => {
    try {
        const response = await apiFetch('/api/ollama/get-weather', { locationQuery });
        const text = response.text || 'Weather data unavailable';
        return { text, sources: [] };
    } catch (error) {
        console.error('Weather Fetch Error:', error);
        return { text: 'Unable to fetch weather. Note: Ollama cannot access real-time data.', sources: [] };
    }
};
