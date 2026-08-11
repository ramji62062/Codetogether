import Link from "next/link";

export default function NotFound() {
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
        <div style={{ fontSize: 64, fontWeight: 900, color: "#000000", marginBottom: 8 }}>404</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Page Not Found</h2>
        <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 24 }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "#000000",
            color: "#ffffff",
            borderRadius: 8,
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
