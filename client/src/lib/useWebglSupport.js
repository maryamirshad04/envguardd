'use client';
import { useEffect, useState } from 'react';

let cachedResult = null;

export function useWebglSupported() {
  const [supported, setSupported] = useState(cachedResult ?? true);

  useEffect(() => {
    if (cachedResult !== null) {
      setSupported(cachedResult);
      return;
    }
    let ok = false;
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      ok = !!gl;
    } catch {
      ok = false;
    }
    cachedResult = ok;
    setSupported(ok);
  }, []);

  return supported;
}