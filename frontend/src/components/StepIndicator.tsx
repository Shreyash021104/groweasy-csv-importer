const STEPS = ["Upload", "Preview", "Import", "Results"];

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const active = step === current;
        const done = step < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                done
                  ? "bg-orange-500 text-white"
                  : active
                    ? "bg-orange-500/15 text-orange-600 ring-2 ring-orange-500 dark:text-orange-400"
                    : "bg-black/5 text-neutral-500 dark:bg-white/10"
              }`}
            >
              {done ? "✓" : step}
            </span>
            <span className={active ? "font-medium text-neutral-900 dark:text-neutral-100" : "text-neutral-500"}>
              {label}
            </span>
            {step !== STEPS.length && <span className="mx-2 h-px w-6 bg-black/10 dark:bg-white/10" />}
          </li>
        );
      })}
    </ol>
  );
}
