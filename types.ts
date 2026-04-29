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
    TRY_ON = 'TRY_ON',
    SIZE_FIT = 'SIZE_FIT',
    SOCIAL = 'SOCIAL'
}

export interface UserMeasurements {
    heightCm: number;
    weightKg: number;
    chestCm: number;
    waistCm: number;
    hipCm: number;
    shoulderCm: number;
    inseamCm: number;
    footLengthCm: number;
    fitPreference: 'slim' | 'regular' | 'loose';
}

export interface ClothingSizeOption {
    sizeLabel: string;
    category: 'top' | 'bottom' | 'dress' | 'shoes';
    chestMinCm?: number;
    chestMaxCm?: number;
    waistMinCm?: number;
    waistMaxCm?: number;
    hipMinCm?: number;
    hipMaxCm?: number;
    shoulderMinCm?: number;
    shoulderMaxCm?: number;
    inseamMinCm?: number;
    inseamMaxCm?: number;
    footLengthMinCm?: number;
    footLengthMaxCm?: number;
    fitType?: 'slim' | 'regular' | 'oversized';
}

export interface FitResult {
    recommendedSize: string;
    fitScore: number;
    fitLabel: 'Tight' | 'Good Fit' | 'Relaxed' | 'Not Recommended';
    notes: string[];
}

export interface SocialProfile {
    id: string;
    name: string;
    avatar: string;
    styleTags: string[];
    favoriteColors: string[];
    bio: string;
    matchScore: number;
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