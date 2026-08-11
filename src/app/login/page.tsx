"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, ChevronLeft, Code2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
    if (err) {
      setError("Wrong email or password. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#000000", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div className="animate-scale-in" style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#374151", textDecoration: "none", fontSize: 14, fontWeight: 600, marginBottom: 28 }}>
          <ChevronLeft size={16}/> Back to home
        </Link>

        <div style={{ background: "#ffffff", border: "1.5px solid #000000", borderRadius: 20, padding: "36px 32px", boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Code2 size={22} color="#ffffff"/>
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#000000", letterSpacing: "-0.5px", margin: 0 }}>Welcome back</h1>
              <p style={{ color: "#4b5563", fontSize: 13, margin: "2px 0 0", fontWeight: 500 }}>Sign in to <span style={{ color: "#000000", fontWeight: 800 }}>CodeTogether</span></p>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, color: "#111827", fontWeight: 700, display: "block", marginBottom: 6 }}>Email Address</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" required
                style={{ width: "100%", background: "#ffffff", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "11px 14px", color: "#000000", fontSize: 14, outline: "none", boxSizing: "border-box", fontWeight: 500 }}
                onFocus={e => (e.target.style.borderColor = "#000000")}
                onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: "#111827", fontWeight: 700 }}>Password</label>
                <span style={{ fontSize: 12, color: "#000000", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Forgot password?</span>
              </div>
              <div style={{ position: "relative" }}>
                <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="••••••••" required
                  style={{ width: "100%", background: "#ffffff", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "11px 44px 11px 14px", color: "#000000", fontSize: 14, outline: "none", boxSizing: "border-box", fontWeight: 500 }}
                  onFocus={e => (e.target.style.borderColor = "#000000")}
                  onBlur={e => (e.target.style.borderColor = "#d1d5db")}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#4b5563", cursor: "pointer" }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && <div style={{ background: "#fef2f2", border: "1px solid #f87171", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>}

            <button type="submit" disabled={loading}
              style={{ marginTop: 4, padding: 13, background: loading ? "#6b7280" : "#000000", border: "none", borderRadius: 10, color: "#ffffff", fontSize: 15, fontWeight: 800, cursor: loading ? "default" : "pointer", transition: "background 0.2s" }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#4b5563", fontSize: 13, marginTop: 24, fontWeight: 500 }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "#000000", fontWeight: 800, textDecoration: "underline" }}>Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
