import { Download } from "lucide-react";
import { UploadDropzone } from "@/components/UploadDropzone";

const SAMPLE_FILES = [
  { file: "real_estate_crm_export.csv", label: "Real Estate CRM Export" },
  { file: "facebook_lead_export.csv", label: "Facebook Lead Export" },
  { file: "google_ads_export.csv", label: "Google Ads Export" },
  { file: "sales_report.csv", label: "Sales Report" },
  { file: "manual_spreadsheet.csv", label: "Manual Spreadsheet" },
];

interface UploadStepProps {
  onFile: (file: File) => void;
  onRejected: (message: string) => void;
}

export function UploadStep({ onFile, onRejected }: UploadStepProps) {
  return (
    <div className="space-y-6">
      <UploadDropzone onFile={onFile} onRejected={onRejected} />

      <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          No CSV handy? Try a sample export:
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_FILES.map((sample) => (
            <a
              key={sample.file}
              href={`/samples/${sample.file}`}
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-orange-400 hover:text-orange-600 dark:border-white/10 dark:text-neutral-300 dark:hover:text-orange-400"
            >
              <Download className="h-3.5 w-3.5" />
              {sample.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
