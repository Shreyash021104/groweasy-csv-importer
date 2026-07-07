"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud } from "lucide-react";

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  onRejected?: (message: string) => void;
}

export function UploadDropzone({ onFile, onRejected }: UploadDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (accepted[0]) {
        onFile(accepted[0]);
        return;
      }
      const message = rejections[0]?.errors[0]?.message ?? "That file could not be accepted.";
      onRejected?.(message);
    },
    [onFile, onRejected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "text/csv": [".csv"], "application/vnd.ms-excel": [".csv"] },
    maxSize: 5 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-14 text-center transition-colors ${
        isDragActive
          ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10"
          : "border-black/15 hover:border-orange-400 hover:bg-black/[0.02] dark:border-white/15 dark:hover:bg-white/[0.03]"
      }`}
    >
      <input {...getInputProps()} />
      <UploadCloud className="mx-auto mb-4 h-10 w-10 text-orange-500" strokeWidth={1.5} />
      <p className="font-medium text-neutral-800 dark:text-neutral-100">
        {isDragActive ? "Drop the CSV file here" : "Drag & drop your CSV here"}
      </p>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">or click to browse files · max 5MB</p>
    </div>
  );
}
