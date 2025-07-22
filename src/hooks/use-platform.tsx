import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

type Platform = 'web' | 'ios' | 'android' | 'unknown';

export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>('unknown');

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setPlatform(Capacitor.getPlatform() as Platform);
    } else {
      setPlatform('web');
    }
  }, []);

  return platform;
}