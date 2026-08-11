"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        color: "#000000",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 24 }}>
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          style={{
            background: "#000000",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
