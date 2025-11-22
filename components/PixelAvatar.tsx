
import React, { useMemo } from 'react';

interface PixelAvatarProps {
  seed: number;
  className?: string;
}

// 12x12 Bitmap Strings (144 chars)
// 1 = Fill, 0 = Empty
const CHAR_MAPS = [
  // Punk
  "000011100000000011100000000111110000001111111000001100011000001100011000001111111000001111111000000111110000000011100000000011100000001111111000",
  // Alien
  "000011000000000111100000001111110000011111111000011011011000011011011000011111111000001100110000000100100000000111100000001111110000001100110000",
  // Robot
  "000011100000000111110000001111111000001011101000001011101000001111111000001111111000000111110000000110110000000111110000001111111000011000001100",
  // Skull
  "000011110000000111111000001111111100001100110000001100110000001111111100000111111000000101101000000101101000000000000000000011110000000111111000",
  // Cat
  "001000001000011100011100011111111100011011101100011111111100001110111000000111110000000011100000000011100000000111110000000111110000001100011000",
  // Weirdo
  "001111111100011111111110111111111111111001100111111001100111111111111111111111111111011000000110011000000110001111111100000111111000000011110000"
];

const COLORS = [
  "#F87171", // Red
  "#60A5FA", // Blue
  "#34D399", // Green
  "#F472B6", // Pink
  "#A78BFA", // Purple
  "#FBBF24", // Yellow
  "#9CA3AF", // Gray
];

export const PixelAvatar: React.FC<PixelAvatarProps> = ({ seed, className }) => {
  const { mapIndex, color, secondaryColor } = useMemo(() => {
    // Pseudo-random based on seed
    const rand = (n: number) => Math.abs(Math.sin(seed * 9999 + n) * 10000) % 1;
    
    const mapIndex = Math.floor(rand(1) * CHAR_MAPS.length);
    const colorIndex = Math.floor(rand(2) * COLORS.length);
    const secColorIndex = Math.floor(rand(3) * COLORS.length);
    
    return {
      mapIndex,
      color: COLORS[colorIndex],
      secondaryColor: COLORS[secColorIndex]
    };
  }, [seed]);

  const mapString = CHAR_MAPS[mapIndex];
  const size = 12;
  const pixelSize = 10; 

  return (
    <div className={`relative ${className}`} style={{ width: size * 4, height: size * 4 }}>
       <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]">
          {Array.from({ length: 144 }).map((_, i) => {
             const x = i % size;
             const y = Math.floor(i / size);
             const val = mapString[i];
             if (val === '0') return null;
             return (
               <rect 
                 key={i} 
                 x={x} 
                 y={y} 
                 width={1.05} 
                 height={1.05} 
                 fill={color} 
               />
             );
          })}
          {/* Eyes/Details often in specific spots, simplified here to just base map */}
       </svg>
    </div>
  );
};
