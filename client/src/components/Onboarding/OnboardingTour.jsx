'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { STATUS } from 'react-joyride';
import TourTooltip from './TourTooltip';

const Joyride = dynamic(() => import('react-joyride').then((mod) => mod.Joyride), {
  ssr: false,
});

function storageKey(tourKey) {
  return `envguard_tour_${tourKey}_done`;
}

export default function OnboardingTour({ tourKey, steps, autoStart = true }) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!autoStart) return;
    try {
      if (!localStorage.getItem(storageKey(tourKey))) setRun(true);
    } catch {
    }
  }, [tourKey, autoStart]);

  const handleEvent = useCallback(
    (data) => {
      if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
        try {
          localStorage.setItem(storageKey(tourKey), '1');
        } catch {
          // ignore
        }
        setRun(false);
      }
    },
    [tourKey]
  );

  if (!steps?.length) return null;

  return (
    <>
      <Joyride
        run={run}
        steps={steps}
        continuous
        scrollToFirstStep
        onEvent={handleEvent}
        tooltipComponent={TourTooltip}
        floatingOptions={{ hideArrow: true }}
        options={{
          skipBeacon: true,
          overlayColor: 'rgba(0, 0, 0, 0.75)',
          spotlightPadding: 8,
          spotlightRadius: 4,
          zIndex: 10000,
        }}
      />
      {!run && (
        <button
          onClick={() => setRun(true)}
          aria-label="Replay onboarding tour"
          className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs text-mist shadow-lg hover:border-signal/40 hover:text-paper sm:bottom-6 sm:right-6"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-signal text-[10px] font-bold text-ink">
            ?
          </span>
          Take a tour
        </button>
      )}
    </>
  );
}