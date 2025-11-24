
import React, { useState, useEffect } from 'react';
import { OutfitCard } from '../components/OutfitCard';
import { OutfitOption } from '../types';
import { generateOutfitImage } from '../services/geminiService';
import { getSavedOutfitsFromDB, deleteOutfitFromDB, saveOutfitToDB } from '../services/storageService';

export const SavedOutfitsView: React.FC = () => {
  const [savedOutfits, setSavedOutfits] = useState<OutfitOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOutfits();
  }, []);

  const loadOutfits = async () => {
    try {
      const outfits = await getSavedOutfitsFromDB();
      setSavedOutfits(outfits);
    } catch (e) {
      console.error("Failed to load outfits", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOutfitFromDB(id);
      setSavedOutfits(prev => prev.filter(o => o.id !== id));
    } catch (e) {
      alert("Erro ao excluir o look.");
    }
  };

  const handleRegenerate = async (outfit: OutfitOption) => {
    if (!outfit.originalImage) {
      alert("Não é possível regenerar este look: Imagem original ausente.");
      return;
    }

    // Update state to show loading
    setSavedOutfits(prev => prev.map(o => 
      o.id === outfit.id ? { ...o, status: 'generating' } : o
    ));

    try {
      const newImage = await generateOutfitImage(outfit.originalImage, outfit.description);
      if (newImage) {
        const updatedOutfit = { ...outfit, generatedImage: newImage, status: 'complete' as const };
        
        // Update local state
        setSavedOutfits(prev => prev.map(o => 
          o.id === outfit.id ? updatedOutfit : o
        ));

        // Update IndexedDB
        await saveOutfitToDB(updatedOutfit);
      }
    } catch (e) {
      console.error("Regeneration failed", e);
      setSavedOutfits(prev => prev.map(o => 
        o.id === outfit.id ? { ...o, status: 'error' } : o
      ));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-12 text-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-serif font-medium text-gray-900">Looks Salvos</h2>
        <span className="text-sm text-gray-500">{savedOutfits.length} itens</span>
      </div>

      {savedOutfits.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
             </svg>
           </div>
           <p className="text-gray-500">Você ainda não salvou nenhum look.</p>
           <p className="text-sm text-gray-400 mt-1">Gere algumas ideias e salve-as para montar seu guarda-roupa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {savedOutfits.map(outfit => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              onDelete={handleDelete}
              onRegenerate={handleRegenerate}
            />
          ))}
        </div>
      )}
    </div>
  );
};
