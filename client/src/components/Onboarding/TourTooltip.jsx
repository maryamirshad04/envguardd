'use client';

export default function TourTooltip({
  index,
  size,
  step,
  isLastStep,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
}) {
  return (
    <div
      {...tooltipProps}
      className="max-h-[70vh] w-[88vw] max-w-sm overflow-y-auto rounded-sm border border-line bg-surface p-5 shadow-xl sm:max-w-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          <p className="font-mono text-[10px] uppercase tracking-wider text-signal">
            Step {index + 1} of {size}
          </p>
        </div>
        <button
          {...closeProps}
          aria-label="Close tour"
          className="text-lg leading-none text-mist hover:text-paper"
        >
          &times;
        </button>
      </div>

      {step.title && <h3 className="mt-3 text-base font-semibold text-paper">{step.title}</h3>}
      <div className="mt-1.5 text-sm leading-relaxed text-mist">{step.content}</div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button {...skipProps} className="text-xs text-mist hover:text-paper">
          Skip tour
        </button>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
            >
              Back
            </button>
          )}
          <button
            {...primaryProps}
            className="rounded-sm bg-signal px-4 py-1.5 text-xs font-medium text-ink hover:bg-signal/90"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {Array.from({ length: size }).map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all ${i === index ? 'w-4 bg-signal' : 'w-1 bg-line'}`}
          />
        ))}
      </div>
    </div>
  );
}