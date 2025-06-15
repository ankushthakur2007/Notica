import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ColorButtonProps extends ButtonProps {
  textColorClass?: string; // Tailwind CSS class for text color, e.g., "text-red-500"
}

const ColorButton: React.FC<ColorButtonProps> = ({
  textColorClass,
  className,
  children,
  ...props
}) => {
  return (
    <Button
      className={cn(textColorClass, className)}
      {...props}
    >
      {children}
    </Button>
  );
};

export default ColorButton;