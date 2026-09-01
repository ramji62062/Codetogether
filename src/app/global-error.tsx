"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg = error?.message || "";
  if (msg.includes("chrome:") || msg.includes("window message") || msg.includes("call method")) {
    reset();
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] font-sans text-white">
      <div className="max-w-[420px] text-center">
        <h2 className="mb-2 text-[22px] font-bold">Something went wrong</h2>
        <p className="mb-6 text-sm text-[#999]">{msg || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          className="cursor-pointer rounded-lg border-0 bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
