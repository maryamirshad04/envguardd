'use client';
import { useCallback } from 'react';

/**
 * Returns an `onCreated` handler for react-three-fiber's <Canvas>.
 * WebGL context loss is a browser-level GPU event, not a JS exception —
 * it never reaches an error boundary, so it has to be listened for directly
 * on the canvas element.
 */
export function useCanvasContextLoss(onLost) {
  return useCallback(
    (state) => {
      const canvas = state.gl.domElement;
      const handleLost = (event) => {
        // preventDefault signals the browser we're handling it ourselves
        // rather than attempting its own automatic restore
        event.preventDefault();
        onLost?.();
      };
      canvas.addEventListener('webglcontextlost', handleLost, false);
    },
    [onLost]
  );
}