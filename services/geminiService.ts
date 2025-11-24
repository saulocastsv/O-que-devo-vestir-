
import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { OutfitType, StylingAnalysis, GroundingChunk } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to strip base64 header
const stripBase64Header = (base64: string) => {
  return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

// 1. Analyze the item to get descriptions and styling advice
export const analyzeClothingItem = async (base64Image: string, customOccasion?: string): Promise<StylingAnalysis & { outfitPrompts: Record<string, string>, outfitAccessories: Record<string, string[]> }> => {
  const cleanBase64 = stripBase64Header(base64Image);

  // Base properties
  const properties: Record<string, any> = {
    itemName: { type: Type.STRING },
    colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
    styleKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    casualPrompt: { type: Type.STRING, description: "Um prompt detalhado para gerar uma imagem 'flat-lay' de um look casual com esta peça." },
    casualAccessories: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-2 recomendações específicas de acessórios ou calçados para o look casual." },
    businessPrompt: { type: Type.STRING, description: "Um prompt detalhado para gerar uma imagem 'flat-lay' de um look de trabalho/negócios com esta peça." },
    businessAccessories: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-2 recomendações específicas de acessórios ou calçados para o look de trabalho." },
    nightOutPrompt: { type: Type.STRING, description: "Um prompt detalhado para gerar uma imagem 'flat-lay' de um look para noite/festa com esta peça." },
    nightOutAccessories: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-2 recomendações específicas de acessórios ou calçados para o look de noite." },
  };

  const required = ["itemName", "colorPalette", "styleKeywords", "casualPrompt", "casualAccessories", "businessPrompt", "businessAccessories", "nightOutPrompt", "nightOutAccessories"];

  // Add custom occasion properties if requested
  if (customOccasion) {
    properties.customPrompt = { type: Type.STRING, description: `Um prompt detalhado para gerar uma imagem 'flat-lay' de um look para ${customOccasion} com esta peça.` };
    properties.customAccessories = { type: Type.ARRAY, items: { type: Type.STRING }, description: `1-2 recomendações específicas de acessórios ou calçados para o look de ${customOccasion}.` };
    required.push("customPrompt", "customAccessories");
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties,
    required,
  };

  let promptText = "Analise esta peça de roupa. Identifique seu nome, paleta de cores e estilo. Em seguida, descreva 3 looks completos distintos (Casual, Trabalho, Noite) que incluam esta peça. Responda em Português do Brasil.";
  
  if (customOccasion) {
    promptText += ` Também descreva um look distinto para a ocasião específica: "${customOccasion}".`;
  }

  promptText += " Forneça também 1-2 recomendações específicas de acessórios ou sapatos para cada look completar o visual. Retorne os dados como JSON.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Using Pro for complex reasoning/vision analysis
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
        { text: promptText }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      systemInstruction: "Você é um estilista de moda de alto nível. Seja específico sobre materiais, cores e peças complementares. Responda sempre em Português do Brasil."
    }
  });

  const data = JSON.parse(response.text || '{}');

  const outfitPrompts: Record<string, string> = {
    [OutfitType.CASUAL]: data.casualPrompt,
    [OutfitType.BUSINESS]: data.businessPrompt,
    [OutfitType.NIGHT_OUT]: data.nightOutPrompt,
  };
  
  const outfitAccessories: Record<string, string[]> = {
    [OutfitType.CASUAL]: data.casualAccessories || [],
    [OutfitType.BUSINESS]: data.businessAccessories || [],
    [OutfitType.NIGHT_OUT]: data.nightOutAccessories || [],
  };

  if (customOccasion) {
    outfitPrompts[OutfitType.CUSTOM] = data.customPrompt;
    outfitAccessories[OutfitType.CUSTOM] = data.customAccessories || [];
  }

  return {
    itemName: data.itemName,
    colorPalette: data.colorPalette,
    styleKeywords: data.styleKeywords,
    outfitPrompts,
    outfitAccessories,
  };
};

// 2. Search for trending info (Search Grounding)
export const getTrendingInfo = async (itemDescription: string): Promise<{ text: string; sources: GroundingChunk[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Quais são as tendências de moda para usar ${itemDescription} em 2024/2025? Dê uma dica curta de estilo e onde comprar peças no estilo similar. Responda em Português do Brasil.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text || "Nenhuma informação de tendência encontrada.",
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    };
  } catch (error) {
    console.error("Search grounding error:", error);
    return { text: "Não foi possível buscar tendências no momento.", sources: [] };
  }
};

// 3. Generate Outfit Image (Image Generation/Conditioned on input)
export const generateOutfitImage = async (originalItemBase64: string, prompt: string): Promise<string | undefined> => {
  const cleanBase64 = stripBase64Header(originalItemBase64);

  try {
    // Using gemini-2.5-flash-image for generation/editing
    // We pass the original image to ensure the generated outfit actually features the item
    // Prompt translation/enhancement happens here implicitly by context or we can force english prompt if needed, 
    // but the model handles multilang well.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: `Create a high-fashion flat-lay photography image based on this description (translate if needed): ${prompt}. Ensure the main clothing item from the input image is the centerpiece. White background. High quality.` }
        ]
      },
      config: {
        imageConfig: {
            aspectRatio: "3:4"
        }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image generation failed", e);
  }
  return undefined;
};

// 4. Edit Generated Image (Nano Banana feature)
export const editOutfitImage = async (imageBase64: string, instruction: string): Promise<string | undefined> => {
  const cleanBase64 = stripBase64Header(imageBase64);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: cleanBase64 } },
          { text: `Edit this image: ${instruction}` }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image editing failed", e);
    throw e;
  }
  return undefined;
};
