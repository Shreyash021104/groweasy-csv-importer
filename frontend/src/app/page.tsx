"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StepIndicator } from "@/components/StepIndicator";
import { UploadStep } from "@/components/steps/UploadStep";
import { PreviewStep } from "@/components/steps/PreviewStep";
import { ProcessingStep } from "@/components/steps/ProcessingStep";
import { ResultsStep } from "@/components/steps/ResultsStep";
import { parseCsvFile } from "@/lib/csv";
import { importCsv } from "@/lib/api";
import type { ImportResult } from "@/lib/types";

type Stage =
  | { step: "upload" }
  | { step: "preview"; file: File; headers: string[]; rows: Record<string, string>[] }
  | { step: "processing"; file: File; totalRows: number; completedBatches: number; totalBatches: number; provider?: string }
  | { step: "results"; result: ImportResult };

const STEP_NUMBER: Record<Stage["step"], number> = {
  upload: 1,
  preview: 2,
  processing: 3,
  results: 4,
};

export default function Home() {
  const [stage, setStage] = useState<Stage>({ step: "upload" });

  const handleFile = useCallback(async (file: File) => {
    try {
      const { headers, rows } = await parseCsvFile(file);
      setStage({ step: "preview", file, headers, rows });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that CSV file.");
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (stage.step !== "preview") return;
    const { file, rows } = stage;
    setStage({ step: "processing", file, totalRows: rows.length, completedBatches: 0, totalBatches: 0 });

    try {
      await importCsv(file, (event) => {
        if (event.type === "started") {
          setStage((prev) =>
            prev.step === "processing" ? { ...prev, provider: event.provider, totalRows: event.totalRows } : prev,
          );
        } else if (event.type === "progress") {
          setStage((prev) =>
            prev.step === "processing"
              ? { ...prev, completedBatches: event.completedBatches, totalBatches: event.totalBatches }
              : prev,
          );
        } else if (event.type === "result") {
          setStage({
            step: "results",
            result: {
              imported: event.imported,
              skipped: event.skipped,
              totalRows: event.totalRows,
              totalImported: event.totalImported,
              totalSkipped: event.totalSkipped,
            },
          });
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed. Please try again.");
      setStage({ step: "preview", file, headers: stage.headers, rows: stage.rows });
    }
  }, [stage]);

  const handleReset = useCallback(() => setStage({ step: "upload" }), []);

  return (
    <div className="flex flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">GrowEasy</p>
              <p className="-mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">AI CSV Importer</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-8">
          <StepIndicator current={STEP_NUMBER[stage.step]} />
        </div>

        {stage.step === "upload" && (
          <UploadStep onFile={handleFile} onRejected={(message) => toast.error(message)} />
        )}

        {stage.step === "preview" && (
          <PreviewStep
            fileName={stage.file.name}
            headers={stage.headers}
            rows={stage.rows}
            onCancel={handleReset}
            onConfirm={handleConfirm}
          />
        )}

        {stage.step === "processing" && (
          <ProcessingStep
            totalRows={stage.totalRows}
            completedBatches={stage.completedBatches}
            totalBatches={stage.totalBatches}
            provider={stage.provider}
          />
        )}

        {stage.step === "results" && <ResultsStep result={stage.result} onReset={handleReset} />}
      </main>

      <footer className="border-t border-black/10 py-4 text-center text-xs text-neutral-400 dark:border-white/10">
        Built for the GrowEasy Software Developer assignment.
      </footer>
    </div>
  );
}
