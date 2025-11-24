
import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from '../components/ImageUploader';
import { OutfitCard } from '../components/OutfitCard';
import { Button } from '../components/Button';
import { analyzeClothingItem, generateOutfitImage, editOutfitImage, getTrendingInfo } from '../services/geminiService';
import { saveOutfitToDB } from '../services/storageService';
import { OutfitOption, OutfitType, StylingAnalysis } from '../types';

export const StylistView: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [customOccasion, setCustomOccasion] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<StylingAnalysis | null>(null);
  const [outfits, setOutfits] = useState<OutfitOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Analisando sua peça de roupa...');

  useEffect(() => {
    if (isAnalyzing) {
      const messages = [
        'Analisando tecido e padrões...',
        'Identificando paleta de cores...',
        'Buscando acessórios que combinam...',
        'Curando recomendações de estilo...',
        'Criando composições de looks...'
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const handleReset = useCallback(() => {
    setUploadedImage(null);
    setAnalysis(null);
    setOutfits([]);
    setError(null);
    setCustomOccasion('');
  }, []);

  const handleImageSelect = (base64: string) => {
    setUploadedImage(base64);
    setAnalysis(null);
    setOutfits([]);
    setError(null);
    setCustomOccasion('');
  };

  const handleStartAnalysis = () => {
    if (uploadedImage) {
      startStylingProcess(uploadedImage, customOccasion);
    }
  };

  const startStylingProcess = async (base64: string, customOccasionInput?: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await analyzeClothingItem(base64, customOccasionInput);
      const trendingResult = await getTrendingInfo(analysisResult.itemName);
      
      setAnalysis({
        ...analysisResult,
        trendingInfo: trendingResult
      });

      const createOutfit = (id: string, type: OutfitType, desc: string, acc: string[], title?: string): OutfitOption => ({
        id,
        type,
        customTitle: title,
        description: desc,
        accessories: acc,
        items: [],
        status: 'generating',
        originalImage: base64, // Save original for regeneration/context
      });

      const initialOutfits: OutfitOption[] = [
        createOutfit('1', OutfitType.CASUAL, analysisResult.outfitPrompts[OutfitType.CASUAL], analysisResult.outfitAccessories[OutfitType.CASUAL]),
        createOutfit('2', OutfitType.BUSINESS, analysisResult.outfitPrompts[OutfitType.BUSINESS], analysisResult.outfitAccessories[OutfitType.BUSINESS]),
        createOutfit('3', OutfitType.NIGHT_OUT, analysisResult.outfitPrompts[OutfitType.NIGHT_OUT], analysisResult.outfitAccessories[OutfitType.NIGHT_OUT]),
      ];

      if (customOccasionInput && analysisResult.outfitPrompts[OutfitType.CUSTOM]) {
        initialOutfits.push(createOutfit('4', OutfitType.CUSTOM, analysisResult.outfitPrompts[OutfitType.CUSTOM], analysisResult.outfitAccessories[OutfitType.CUSTOM], customOccasionInput));
      }

      setOutfits(initialOutfits);
      setIsAnalyzing(false);

      initialOutfits.forEach(async (outfit) => {
        try {
          const generatedImage = await generateOutfitImage(base64, outfit.description);
          setOutfits(prev => prev.map(o => 
            o.id === outfit.id 
              ? { ...o, generatedImage, status: 'complete' } 
              : o
          ));
        } catch (e) {
          console.error(`Failed to generate ${outfit.type}`, e);
          setOutfits(prev => prev.map(o => 
            o.id === outfit.id 
              ? { ...o, status: 'error', error: 'Falha ao gerar imagem' } 
              : o
          ));
        }
      });

    } catch (err) {
      console.error(err);
      setError("Não foi possível analisar a imagem. Por favor, tente novamente.");
      setIsAnalyzing(false);
    }
  };

  const handleEditOutfit = useCallback(async (id: string, instruction: string) => {
    const outfit = outfits.find(o => o.id === id);
    if (!outfit || !outfit.generatedImage) return;

    try {
      const newImage = await editOutfitImage(outfit.generatedImage, instruction);
      if (newImage) {
        setOutfits(prev => prev.map(o => 
          o.id === id 
            ? { ...o, generatedImage: newImage } 
            : o
        ));
      }
    } catch (e) {
      alert("Falha ao editar a imagem. Tente novamente.");
    }
  }, [outfits]);

  const handleSaveOutfit = async (outfit: OutfitOption) => {
    try {
      // Ensure unique ID for saved item based on timestamp
      const outfitToSave = {
        ...outfit,
        id: `${outfit.id}-${Date.now()}`,
        timestamp: Date.now()
      };
      
      await saveOutfitToDB(outfitToSave);
      // Optional: Add UI feedback like a toast here if not handled by button state
    } catch (e) {
      console.error("Save failed", e);
      alert("Não foi possível salvar o look.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
      {!uploadedImage && (
          <div className="text-center mb-12 space-y-4 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-serif font-medium text-gray-900">
              O que devo vestir?
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Carregue uma foto daquela peça difícil de combinar. 
              Nossa IA analisará e criará três looks perfeitos para qualquer ocasião.
            </p>
          </div>
      )}

      <div className={`transition-all duration-500 ease-in-out ${uploadedImage ? 'mb-12' : 'mb-0'}`}>
        {!uploadedImage ? (
          <div className="animate-slide-up">
            <ImageUploader onImageSelect={handleImageSelect} />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8 items-start animate-fade-in">
            <div className="w-full md:w-1/4 space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-24">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Sua Peça</h3>
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
                  <img src={uploadedImage} alt="Peça Original" className="w-full h-full object-cover" />
                </div>
                
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2 mb-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remover Peça
                </button>
              </div>
            </div>

            <div className="w-full md:w-3/4">
                {!isAnalyzing && outfits.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto animate-slide-up">
                    <h3 className="text-2xl font-serif font-medium text-gray-900 mb-6 text-center">Personalize seu Estilo</h3>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ocasião Específica (Opcional)
                        </label>
                        <input 
                          type="text" 
                          placeholder="ex: Home office, Encontro, Casamento de dia"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                          value={customOccasion}
                          onChange={(e) => setCustomOccasion(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                          {['Home office', 'Encontro', 'Casamento Verão', 'Entrevista'].map(occ => (
                            <button
                              key={occ}
                              onClick={() => setCustomOccasion(occ)}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 rounded-full text-xs text-gray-700 transition-all"
                            >
                              + {occ}
                            </button>
                          ))}
                      </div>
                      <div className="pt-4 flex justify-center">
                        <Button onClick={handleStartAnalysis} className="w-full md:w-auto px-12">
                          Gerar Looks
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : isAnalyzing ? (
                  <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center py-20 max-w-2xl mx-auto animate-pulse-slow">
                      <div className="relative w-20 h-20 mx-auto mb-8">
                        <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl animate-bounce">✨</span>
                        </div>
                      </div>
                      <h3 className="text-2xl font-serif font-medium text-gray-900 transition-all duration-500 min-h-[32px]">
                        {loadingMessage}
                      </h3>
                  </div>
                ) : analysis ? (
                  <div className="space-y-8 animate-slide-up">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex flex-wrap items-baseline gap-4 mb-4">
                        <h2 className="text-2xl font-serif text-gray-900">{analysis.itemName}</h2>
                        <div className="flex gap-2">
                          {analysis.styleKeywords.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {analysis.trendingInfo && (
                        <div className="bg-indigo-50 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <div>
                              <h4 className="text-sm font-bold text-indigo-900 mb-1">Tendência Atual</h4>
                              <p className="text-sm text-indigo-800">{analysis.trendingInfo.text}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6`}>
                      {outfits.map((outfit, index) => (
                        <div key={outfit.id} className="animate-slide-up">
                          <OutfitCard 
                            outfit={outfit} 
                            onEdit={handleEditOutfit}
                            onSave={handleSaveOutfit}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 text-red-800 p-6 rounded-xl text-center animate-fade-in">
                    <p>{error}</p>
                    <Button variant="secondary" className="mt-4" onClick={() => setUploadedImage(null)}>Tentar Novamente</Button>
                  </div>
                ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
