import React from 'react';

interface RetroSliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  color: string; // hex
  disabled?: boolean;
}

export const RetroSlider: React.FC<RetroSliderProps> = ({ label, value, onChange, color, disabled }) => {
  // Generate tick marks
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);

  return (
    <div className="mb-6 font-mono select-none group">
      <div className="flex justify-between mb-1 items-end">
        <span className="text-xs text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
        <span className="text-xl font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" style={{color: color}}>{Math.round(value)}</span>
      </div>
      
      <div className="relative w-full h-12 flex items-center">
        {/* Tick Marks Background */}
        <div className="absolute top-9 left-0 w-full flex justify-between px-1">
          {ticks.map(t => (
            <div key={t} className="flex flex-col items-center">
              <div className="h-1.5 w-px bg-gray-500"></div>
            </div>
          ))}
        </div>

        {/* Track Container */}
        <div className="absolute top-1/2 left-0 w-full h-4 bg-black/80 border border-gray-600 rounded-full -translate-y-1/2 overflow-hidden shadow-inner">
          {/* Active Glow Fill */}
          <div 
            className="h-full opacity-80 transition-all duration-75 ease-out"
            style={{ 
              width: `${value}%`, 
              backgroundColor: color,
              boxShadow: `0 0 15px ${color}`
            }}
          />
        </div>
        
        {/* Interactive Range (Invisible) */}
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
        />
        
        {/* Physical Fader Handle */}
        <div 
          className="absolute top-1/2 h-8 w-5 bg-gray-200 border-2 border-gray-400 rounded shadow-lg transition-all duration-75 ease-out z-10 pointer-events-none"
          style={{ 
            left: `calc(${value}% - 10px)`,
            background: 'linear-gradient(180deg, #ffffff 0%, #9ca3af 100%)',
            boxShadow: `0 2px 5px rgba(0,0,0,0.5), 0 0 10px ${color}`
          }}
        >
          <div className="absolute top-1/2 left-1/2 w-3 h-0.5 bg-black -translate-x-1/2 -translate-y-1/2 opacity-50"></div>
        </div>
      </div>
    </div>
  );
};
