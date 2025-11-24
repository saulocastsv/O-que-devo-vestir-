
import React, { useState } from 'react';
import { OutfitOption } from '../types';
import { Button } from './Button';

interface OutfitCardProps {
  outfit: OutfitOption;
  onEdit?: (id: string, prompt: string) => Promise<void>;
  onSave?: (outfit: OutfitOption) => void;
  onDelete?: (id: string) => void;
  onRegenerate?: (outfit: OutfitOption) => void;
}

export const OutfitCard: React.FC<OutfitCardProps> = ({ 
  outfit, 
  onEdit, 
  onSave,
  onDelete,
  onRegenerate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleEditSubmit = async () => {
    if (!editPrompt.trim() || !onEdit) return;
    setIsProcessingEdit(true);
    await onEdit(outfit.id, editPrompt);
    setIsProcessingEdit(false);
    setIsEditing(false);
    setEditPrompt('');
  };

  const handleSave = () => {
    if (onSave) {
      onSave(outfit);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000); // Reset "Saved!" feedback
    }
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full group relative">
      
      {/* Action Buttons Overlay (Top Right) */}
      <div className="absolute top-3 right-3 z-30 flex gap-2">
        {onSave && outfit.status === 'complete' && (
          <button 
            onClick={handleSave}
            className={`p-2 rounded-full backdrop-blur-md shadow-sm transition-all duration-200 ${isSaved ? 'bg-green-100 text-green-600' : 'bg-white/90 text-gray-600 hover:text-indigo-600 hover:scale-110'}`}
            title="Salvar Look"
          >
            {isSaved ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        )}
        
        {onDelete && (
           <button 
             onClick={() => onDelete(outfit.id)}
             className="p-2 rounded-full bg-white/90 backdrop-blur-md text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm transition-all duration-200 hover:scale-110"
             title="Excluir Look"
           >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
             </svg>
           </button>
        )}
      </div>

      <div className="relative aspect-[3/4] bg-gray-50 w-full overflow-hidden">
        {outfit.status === 'generating' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
             {/* Shimmer Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 animate-shimmer bg-[length:400%_100%]"></div>
            
            <div className="relative z-10 p-6 flex flex-col items-center">
               <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-3"></div>
               <span className="text-xs font-bold tracking-widest uppercase text-gray-800 mb-1">Criando Look</span>
               <p className="text-[10px] text-gray-500">Usando Gemini Vision</p>
            </div>
          </div>
        ) : outfit.generatedImage ? (
          <div className="w-full h-full overflow-hidden">
            <img 
              src={outfit.generatedImage} 
              alt={outfit.customTitle || outfit.type} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-50 flex-col gap-3 p-4 text-center">
             <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">Imagem indisponível</span>
              {onRegenerate && outfit.status === 'error' && (
                 <Button 
                   variant="outline" 
                   onClick={() => onRegenerate(outfit)}
                   className="mt-2 text-xs py-1.5 px-3"
                 >
                   Tentar Novamente
                 </Button>
              )}
          </div>
        )}
        
        <div className="absolute top-4 left-4 z-20">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-xs font-bold tracking-wider uppercase rounded-full shadow-sm border border-gray-100">
            {outfit.customTitle || outfit.type}
          </span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow bg-white">
        <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-grow line-clamp-4">
          {outfit.description}
        </p>

        {/* Accessories Section */}
        {outfit.accessories && outfit.accessories.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              Complete o visual
            </h4>
            <ul className="space-y-2">
              {outfit.accessories.map((item, idx) => (
                <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 mt-auto">
          {outfit.status === 'complete' && onEdit ? (
            isEditing ? (
              <div className="space-y-3 animate-fade-in">
                <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wide">
                  Editar com IA
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="ex: Adicionar um filtro vintage..."
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none pr-10 transition-all"
                    autoFocus
                  />
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <Button 
                  onClick={handleEditSubmit} 
                  disabled={!editPrompt.trim() || isProcessingEdit}
                  className="w-full py-2 text-sm"
                  isLoading={isProcessingEdit}
                >
                  Aplicar Edição
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4C2.89543 4 2 4.89543 2 6V14C2 15.1046 2.89543 16 4 16H14C15.1046 16 16 15.1046 16 14V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Editar este look
                </button>
                {onRegenerate && (
                  <button 
                    onClick={() => onRegenerate(outfit)}
                    className="px-3 py-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-50"
                    title="Regenerar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            )
          ) : outfit.status === 'error' && onRegenerate ? (
              <Button variant="outline" onClick={() => onRegenerate(outfit)} className="w-full">
                  Tentar Novamente
              </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
