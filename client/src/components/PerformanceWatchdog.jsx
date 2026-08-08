'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function PerformanceWatchdog({ onSlow, thresholdMs = 80, sustainedFrames = 90 }) {
  const slowCount = useRef(0);
  const triggered = useRef(false);

  useFrame((_, delta) => {
    if (triggered.current) return;
    const ms = delta * 1000;
    if (ms > thresholdMs) {
      slowCount.current += 1;
    } else {
      slowCount.current = Math.max(0, slowCount.current - 2);
    }
    if (slowCount.current > sustainedFrames) {
      triggered.current = true;
      onSlow?.();
    }
  });

  return null;
}