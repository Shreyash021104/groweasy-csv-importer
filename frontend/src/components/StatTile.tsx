interface StatTileProps {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning";
}

const TONE_CLASSES: Record<NonNullable<StatTileProps["tone"]>, string> = {
  neutral: "text-neutral-900 dark:text-neutral-100",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
};

export function StatTile({ label, value, tone = "neutral" }: StatTileProps) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${TONE_CLASSES[tone]}`}>{value.toLocaleString()}</p>
    </div>
  );
}
