import React, { useMemo } from 'react';
import { Recipe } from '../types';

interface DrinkVisualizerProps {
  recipe: Recipe;
  label: string;
  animate?: boolean;
}

export const DrinkVisualizer: React.FC<DrinkVisualizerProps> = ({ recipe, label, animate = false }) => {
  
  const color = useMemo(() => {
    const { sweetness, sourness, bitterness } = recipe;
    const total = sweetness + sourness + bitterness || 1;
    
    // Color blending logic
    // Sweet = Pink (236, 72, 153)
    // Sour = Yellow (250, 204, 21)
    // Bitter = Cyan (45, 212, 191)
    
    const r = Math.round((sweetness * 236 + sourness * 250 + bitterness * 45) / total);
    const g = Math.round((sweetness * 72 + sourness * 204 + bitterness * 212) / total);
    const b = Math.round((sweetness * 153 + sourness * 21 + bitterness * 191) / total);
    
    // Opacity based on intensity
    const intensity = Math.min(1, (sweetness + sourness + bitterness) / 150);
    
    return `rgba(${r}, ${g}, ${b}, ${0.6 + intensity * 0.4})`;
  }, [recipe]);

  const liquidHeight = useMemo(() => {
    const avg = (recipe.sweetness + recipe.sourness + recipe.bitterness) / 3;
    // Map 0-100 to roughly 20%-90% height
    return 20 + (avg / 100) * 70;
  }, [recipe]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative">
      <div className="text-center font-pixel text-xs mb-2 tracking-widest text-white drop-shadow-md z-10 bg-black/50 px-2 py-1 rounded">
        {label}
      </div>
      
      {/* Pixel Art Glass Container */}
      <div className="relative w-32 h-48 md:w-40 md:h-56">
        
        {/* Glass Reflection/Glare */}
        <div className="absolute top-4 right-4 w-2 h-32 bg-white opacity-20 z-20 rounded-full"></div>
        
        {/* Liquid */}
        <div 
          className="absolute bottom-4 left-2 right-2 bg-current transition-all duration-500 ease-out z-10 rounded-b-lg"
          style={{ 
            height: `${liquidHeight}%`, 
            backgroundColor: color,
            boxShadow: `0 0 20px ${color}`
          }}
        >
          {/* Bubbles */}
          {animate && (
            <>
              <div className="absolute bottom-0 left-1/4 w-2 h-2 bg-white rounded-full opacity-50 animate-[bounce_3s_infinite]"></div>
              <div className="absolute bottom-2 left-1/2 w-1 h-1 bg-white rounded-full opacity-60 animate-[bounce_2s_infinite]"></div>
              <div className="absolute bottom-0 right-1/3 w-3 h-3 bg-white rounded-full opacity-40 animate-[bounce_4s_infinite]"></div>
            </>
          )}
          
          {/* Surface Line */}
          <div className="absolute top-0 left-0 w-full h-2 bg-white opacity-30"></div>
        </div>

        {/* Glass Outline (SVG overlay) */}
        <svg className="absolute inset-0 w-full h-full z-30 pointer-events-none overflow-visible" viewBox="0 0 100 140">
          <path 
            d="M10,10 L10,130 Q10,140 50,140 Q90,140 90,130 L90,10" 
            fill="none" 
            stroke="white" 
            strokeWidth="4" 
            strokeLinecap="round"
          />
          <ellipse cx="50" cy="10" rx="40" ry="5" fill="none" stroke="white" strokeWidth="2" opacity="0.5" />
        </svg>
        
        {/* Straw */}
        <div 
          className="absolute top-[-20px] right-8 w-2 h-40 bg-pink-500 rotate-12 z-0 border-l border-black opacity-80"
          style={{ display: liquidHeight > 20 ? 'block' : 'none' }}
        ></div>
      </div>
    </div>
  );
};
