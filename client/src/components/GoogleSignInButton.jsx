'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export default function GoogleSignInButton({ onCredential, onError }) {
  const containerRef = useRef(null);
  const [desiredWidth, setDesiredWidth] = useState(320);
  const initializedRef = useRef(false);

  const renderButton = useCallback((width) => {
    const container = containerRef.current;
    if (!container || !window.google?.accounts?.id) return;

    container.innerHTML = '';
    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      width: width,
      text: 'continue_with',
    });
  }, []);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');
      return;
    }

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;
      // Prevent multiple initializations
      if (initializedRef.current) return;
      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            onCredential(response.credential);
          } else {
            onError?.('Google sign-in did not return a credential');
          }
        },
      });

      renderButton(desiredWidth);
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    }

    return () => {
    };
  }, [onCredential, onError, renderButton, desiredWidth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const rect = container.getBoundingClientRect();
      const newWidth = Math.min(Math.max(rect.width - 16, 200), 400);
      setDesiredWidth(newWidth);
      if (window.google?.accounts?.id) {
        renderButton(newWidth);
      }
    };

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    requestAnimationFrame(updateWidth);

    return () => resizeObserver.disconnect();
  }, [renderButton]);

  return <div ref={containerRef} className="flex justify-center w-full" />;
}