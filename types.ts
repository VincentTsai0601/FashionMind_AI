export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export interface GeneratedImage {
    url: string;
    prompt: string;
    timestamp: number;
}

export enum AppTab {
    HOME = 'HOME',
    OUTFIT = 'OUTFIT',
    WARDROBE = 'WARDROBE',
    TRY_ON = 'TRY_ON'
}

export interface WardrobeItem {
    id: string;
    image: string;
    description: string;
    season: string;
    timestamp: number;
}

export interface TryOnRequest {
    image: string; // Base64
    itemDescription: string;
    categories: string[];
    season: string;
    gender: string;
    skinTone: string;
}