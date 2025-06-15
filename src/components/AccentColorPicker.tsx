import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccentColorOption {
  label: string;
  value: string; // Corresponds to a CSS class name
}

const ACCENT_COLOR_OPTIONS: AccentColorOption[] = [
  { label: 'Default (Blue)', value: 'theme-default' },
  { label: 'Green', value: 'theme-green' },
  { label: 'Purple', value: 'theme-purple' },
];

export function AccentColorPicker() {
  const [selectedAccentColor, setSelectedAccentColor] = useState<string>(() => {
    return localStorage.getItem('app-accent-color') || 'theme-default';
  });

  useEffect(() => {
    // Get current classes, filter out old accent classes, add new one
    const currentClasses = document.documentElement.className.split(' ').filter(
      (cls) => !ACCENT_COLOR_OPTIONS.some(option => option.value === cls)
    );
    const newClasses = cn(...currentClasses, selectedAccentColor);
    document.documentElement.className = newClasses;
    localStorage.setItem('app-accent-color', selectedAccentColor);
  }, [selectedAccentColor]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Select accent color</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ACCENT_COLOR_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setSelectedAccentColor(option.value)}
            className={cn(
              "cursor-pointer",
              option.value === selectedAccentColor && "font-bold"
            )}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}