"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { GraduationCap, BookOpen, Briefcase, Code2, Eye, EyeOff, ChevronLeft } from "lucide-react";

const ROLES = [
  { id: "student", label: "Student", icon: <GraduationCap size={22}/>, desc: "Learning & joining sessions" },
  { id: "tutor", label: "Tutor / Teacher", icon: <BookOpen size={22}/>, desc: "Hosting classes & mentoring" },
  { id: "business", label: "Business", icon: <Briefcase size={22}/>, desc: "Teams & pair programming" },
  { id: "freelancer", label: "Freelancer / Creator", icon: <Code2 size={22}/>, desc: "Building projects & streaming" },
];

function normalizeRole(value?: string | null) {
  const raw = (value || "").trim().toLowerCase();
  if (raw === "teacher" || raw === "tutor") return "tutor";
  if (raw === "youtube" || raw === "creator" || raw === "freelancer") return "freelancer";
  if (raw === "business") return "business";
  return "student";
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultRole = normalizeRole(params?.get("role"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName) {
      setError("Full name is required.");
      setLoading(false);
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (cleanPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanName, email: cleanEmail, password: cleanPassword, role }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = payload.error || "Could not create account.";
      setError(msg);
      setLoading(false);
      return;
    }

    const signInResult = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
    if (signInResult.error) {
      setError("Account created, but sign-in failed. Please try logging in manually.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  const selectedRole = ROLES.find(r => r.id === role) || ROLES[0];

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#000000", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "Inter, sans-serif" }}>
      <div className="animate-scale-in" style={{ width: "100%", maxWidth: 500, position: "relative" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#374151", textDecoration: "none", fontSize: 14, fontWeight: 600, marginBottom: 28 }}>
          <ChevronLeft size={16}/> Back to home
        </Link>

        <div style={{ background: "#ffffff", border: "1.5px solid #000000", borderRadius: 20, padding: "36px 32px", boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#000000", letterSpacing: "-0.5px", margin: 0 }}>Create your account</h1>
            <p style={{ color: "#4b5563", fontSize: 14, marginTop: 6, fontWeight: 500 }}>
              Join <span style={{ color: "#000000", fontWeight: 800 }}>CodeTogether</span> — free forever for core features
            </p>
          </div>

          {/* Role selector */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, color: "#111827", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 10 }}>I am a...</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {ROLES.map(r => {
                const isSelected = role === r.id;
                return (
                  <button key={r.id} onClick={() => setRole(r.id)} type="button"
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: isSelected ? "2px solid #000000" : "1.5px solid #e5e7eb",
                      background: isSelected ? "#000000" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: 10
                    }}>
                    <span style={{ color: isSelected ? "#ffffff" : "#000000" }}>{r.icon}</span>
                    <div>
                      <div style={{ color: isSelected ? "#ffffff" : "#000000", fontSize: 13, fontWeight: 800 }}>{r.label}</div>
                      <div style={{ color: isSelected ? "#d1d5db" : "#6b7280", fontSize: 11 }}>{r.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: "#111827", fontWeight: 700, display: "block", marginBottom: 6 }}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ramji Kumar" required
                style={{ width: "100%", background: "#ffffff", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "11px 14px", color: "#000000", fontSize: 14, outline: "none", transition: "border 0.2s", boxSizing: "border-box", fontWeight: 500 }}
                onFocus={e => (e.target.style.borderColor = "#000000")}
                onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#111827", fontWeight: 700, display: "block", marginBottom: 6 }}>Email Address</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" required
                style={{ width: "100%", background: "#ffffff", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "11px 14px", color: "#000000", fontSize: 14, outline: "none", transition: "border 0.2s", boxSizing: "border-box", fontWeight: 500 }}
                onFocus={e => (e.target.style.borderColor = "#000000")}
                onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#111827", fontWeight: 700, display: "block", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="Min 8 characters" required minLength={8}
                  style={{ width: "100%", background: "#ffffff", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "11px 44px 11px 14px", color: "#000000", fontSize: 14, outline: "none", transition: "border 0.2s", boxSizing: "border-box", fontWeight: 500 }}
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
              style={{ marginTop: 4, padding: "13px", background: loading ? "#6b7280" : "#000000", border: "none", borderRadius: 10, color: "#ffffff", fontSize: 15, fontWeight: 800, cursor: loading ? "default" : "pointer", transition: "all 0.2s" }}>
              {loading ? "Creating account..." : `Continue as ${selectedRole.label} →`}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#4b5563", fontSize: 13, marginTop: 24, fontWeight: 500 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#000000", fontWeight: 800, textDecoration: "underline" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}
