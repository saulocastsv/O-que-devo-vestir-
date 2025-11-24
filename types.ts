
export enum OutfitType {
  CASUAL = 'Casual',
  BUSINESS = 'Trabalho',
  NIGHT_OUT = 'Noite',
  CUSTOM = 'Personalizado',
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface OutfitOption {
  id: string;
  type: OutfitType;
  customTitle?: string; // For the specific occasion name
  description: string;
  items: string[];
  accessories?: string[]; // Added for accessory suggestions
  generatedImage?: string; // base64
  originalImage?: string; // base64 of the input item, needed for regeneration context
  status: 'pending' | 'generating' | 'complete' | 'error';
  error?: string;
  timestamp?: number; // For sorting saved items
}

export interface StylingAnalysis {
  itemName: string;
  colorPalette: string[];
  styleKeywords: string[];
  trendingInfo?: {
    text: string;
    sources: GroundingChunk[];
  };
}

export interface EditRequest {
  outfitId: string;
  instruction: string;
}
