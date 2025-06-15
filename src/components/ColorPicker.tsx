import React from 'react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  onSelectColor: (color: string) => void;
  currentColor?: string;
}

const colors = [
  '#000000', // Black
  '#FFFFFF', // White
  '#EF4444', // Red (tailwind red-500)
  '#F97316', // Orange (tailwind orange-500)
  '#F59E0B', // Amber (tailwind amber-500)
  '#22C55E', // Green (tailwind green-500)
  '#3B82F6', // Blue (tailwind blue-500)
  '#6366F1', // Indigo (tailwind indigo-500)
  '#8B5CF6', // Violet (tailwind violet-500)
  '#EC4899', // Pink (tailwind pink-500)
  '#64748B', // Slate (tailwind slate-500)
  '#A1A1AA', // Gray (tailwind gray-400)
  '#FACC15', // Yellow (tailwind yellow-400)
  '#A78BFA', // Violet (tailwind violet-400)
  '#F472B6', // Pink (tailwind pink-400)
];

const ColorPicker = ({ onSelectColor, currentColor }: ColorPickerProps) => {
  return (
    <div className="grid grid-cols-5 gap-1 p-2">
      {colors.map((color) => (
        <button
          key={color}
          className={cn(
            "w-6 h-6 rounded-full border border-gray-300 dark:border-gray-700 cursor-pointer transition-all",
            currentColor === color && "ring-2 ring-offset-2 ring-primary" // Highlight selected color
          )}
          style={{ backgroundColor: color }}
          onClick={() => onSelectColor(color)}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
};

export default ColorPicker;