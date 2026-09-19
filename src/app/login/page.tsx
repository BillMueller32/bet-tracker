"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("idle");
    setStep("code");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    router.push("/bets");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h1 className="mb-1 text-xl font-semibold text-neutral-100">
          Bet Tracker
        </h1>

        {step === "email" && (
          <>
            <p className="mb-6 text-sm text-neutral-400">
              Sign in with a one-time code — no password needed.
            </p>
            <form onSubmit={handleSendCode} className="space-y-3">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === "working"}
                className="w-full rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
              >
                {status === "working" ? "Sending..." : "Send code"}
              </button>
              {status === "error" && (
                <p className="text-sm text-red-400">{errorMessage}</p>
              )}
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <p className="mb-6 text-sm text-neutral-400">
              We sent a 6-digit code to <span className="text-neutral-200">{email}</span>.
              Enter it below.
            </p>
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-center text-lg tracking-widest text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === "working"}
                className="w-full rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
              >
                {status === "working" ? "Verifying..." : "Verify code"}
              </button>
              {status === "error" && (
                <p className="text-sm text-red-400">{errorMessage}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setStatus("idle");
                  setErrorMessage("");
                }}
                className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300"
              >
                Use a different email
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
