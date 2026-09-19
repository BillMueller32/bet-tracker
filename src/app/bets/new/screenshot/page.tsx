"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { uploadAndExtractBet, createBetFromReview } from "@/app/bets/actions";
import { BetForm } from "@/components/bet-form";
import type { Bet, BetLeg } from "@/lib/bets/constants";

type QueueItem = {
  previewUrl: string;
  screenshotPath: string;
  extracted: Partial<Bet>;
};

type Status = "idle" | "processing" | "reviewing";

export default function ScreenshotUploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Paste a screenshot straight from the clipboard (e.g. a Mac
  // screenshot shortcut, which copies the image without saving a file).
  useEffect(() => {
    if (status !== "idle") return;

    function handlePaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      e.preventDefault();
      const dataTransfer = new DataTransfer();
      files.forEach((f) => dataTransfer.items.add(f));
      handleFilesSelected(dataTransfer.files);
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [status]);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    setStatus("processing");
    setErrors([]);
    setProgress({ done: 0, total: files.length });

    const results: QueueItem[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("screenshot", file);
      try {
        const result = await uploadAndExtractBet(formData);
        const { legs, ...rest } = result.extracted;
        // The AI extraction is constrained to our sport/bet_type enums by
        // the tool schema (extract.ts), but that guarantee isn't visible
        // to TypeScript from this plain object literal.
        const extracted = {
          ...rest,
          bet_legs: legs?.map(
            (leg): BetLeg => ({
              sport: leg.sport,
              event_name: leg.event_name,
              participant: leg.participant ?? null,
              selection: leg.selection,
              line: leg.line ?? null,
              odds: leg.odds ?? null,
            }),
          ),
        };
        results.push({
          previewUrl: URL.createObjectURL(file),
          screenshotPath: result.screenshotPath,
          extracted: extracted as Partial<Bet>,
        });
      } catch (e) {
        setErrors((prev) => [
          ...prev,
          `${file.name}: ${e instanceof Error ? e.message : "failed to read"}`,
        ]);
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setQueue(results);
    setIndex(0);
    setStatus(results.length > 0 ? "reviewing" : "idle");
  }

  function advance() {
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
    } else {
      router.push("/bets");
    }
  }

  async function handleSaveCurrent(formData: FormData) {
    formData.set("screenshot_path", queue[index].screenshotPath);
    await createBetFromReview(formData);
    advance();
  }

  const current = queue[index];

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/bets"
        className="mb-4 inline-block text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to bets
      </Link>
      <h1 className="mb-4 text-lg font-semibold text-neutral-100">
        Add from screenshot
      </h1>

      {status === "idle" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFilesSelected(e.dataTransfer.files);
          }}
          className={`rounded-md border border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-neutral-400 bg-neutral-900"
              : "border-neutral-700"
          }`}
        >
          <p className="mb-4 text-sm text-neutral-400">
            Choose, drag in, or paste (⌘V) one or more bet slip screenshots.
            Each one will be read and queued up for you to review before
            saving.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900"
          >
            Choose screenshots
          </button>
        </div>
      )}

      {status === "processing" && (
        <p className="text-sm text-neutral-400">
          Reading screenshot {progress.done + 1} of {progress.total}...
        </p>
      )}

      {errors.length > 0 && (
        <div className="mt-3 rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-300">
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      {status === "reviewing" && current && (
        <div>
          <p className="mb-2 text-xs text-neutral-500">
            Reviewing {index + 1} of {queue.length} — check the fields
            against the screenshot before saving.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.previewUrl}
            alt="Bet slip screenshot"
            className="mb-4 max-h-64 w-full rounded-md border border-neutral-800 object-contain"
          />
          <BetForm
            key={index}
            onSubmit={handleSaveCurrent}
            defaultValues={current.extracted}
            submitLabel={index + 1 < queue.length ? "Save & next" : "Save"}
          >
            <button
              type="button"
              onClick={advance}
              className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300"
            >
              Skip this one
            </button>
          </BetForm>
        </div>
      )}
    </div>
  );
}
