import React from 'react';

const AbstractGraphic = ({ className }: { className?: string }) => {
  return (
    <svg
      className={`absolute z-0 opacity-10 dark:opacity-5 ${className}`}
      width="100%"
      height="100%"
      viewBox="0 0 1200 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 200 C 300 50 600 350 900 100 C 1050 0 1200 150 1200 150"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0 600 C 250 750 500 500 750 700 C 900 800 1200 650 1200 650"
        stroke="hsl(var(--accent-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="200" r="10" fill="hsl(var(--primary))" />
      <circle cx="900" cy="100" r="10" fill="hsl(var(--primary))" />
      <circle cx="200" cy="650" r="10" fill="hsl(var(--accent-foreground))" />
      <circle cx="800" cy="700" r="10" fill="hsl(var(--accent-foreground))" />
    </svg>
  );
};

export default AbstractGraphic;