"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Code2, Users, Zap, Play, BookOpen, Tv, Briefcase,
  GraduationCap, ChevronRight, Star, Terminal,
  GitBranch, Video, ArrowRight, CheckCircle2, Menu, X
} from "lucide-react";

const FEATURES = [
  { icon: <Code2 size={22}/>, title: "Monaco Editor", desc: "Full VS Code editor with syntax highlighting, IntelliSense & multi-file tabs." },
  { icon: <Users size={22}/>, title: "Real-time Collaboration", desc: "Live cursor sync, presence indicators, and instant code sharing via Supabase." },
  { icon: <Video size={22}/>, title: "Video & Audio", desc: "Built-in WebRTC video calls and screen share, powered by this project." },
  { icon: <Terminal size={22}/>, title: "Interactive Terminal", desc: "Run code live in an xterm.js terminal. Python, JS, Java, C++ & more." },
  { icon: <GitBranch size={22}/>, title: "Multi-file Projects", desc: "Full VS Code-style file explorer with folders, rename, drag-drop." },
  { icon: <Zap size={22}/>, title: "AI Code Assistant", desc: "AI assistant that explains, debugs, and optimizes your code in real time." },
];

const ACCOUNT_TYPES = [
  { id: "student", icon: <GraduationCap size={28}/>, label: "Student",
    desc: "Join live sessions, learn from peers & instructors.", perks: ["Join unlimited rooms","Real-time code sync","AI explanations","Download session notes"] },
  { id: "teacher", icon: <BookOpen size={28}/>, label: "Teacher",
    desc: "Host sessions, manage classrooms & publish content.", perks: ["Create 250-seat rooms","Session timer & lifecycle","Teacher notes system","Whiteboard & annotations"] },
  { id: "youtube", icon: <Tv size={28}/>, label: "Creator / Streamer",
    desc: "Stream coding sessions and grow your audience.", perks: ["Sharable short codes","Live viewer mode","Record-ready layout","Audience join links"] },
  { id: "business", icon: <Briefcase size={28}/>, label: "Business / Team",
    desc: "Pair-program, review PRs, onboard engineers fast.", perks: ["Unlimited workspaces","Role-based access","Private rooms","Team analytics"] },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Create your account", desc: "Sign up as Student, Teacher, Creator, or Business. Setup takes under 60 seconds." },
  { step: "02", title: "Open a workspace", desc: "Create a new room or join with a 6-letter code shared by your host." },
  { step: "03", title: "Code together", desc: "Edit in real time, run code, draw on the whiteboard, and video-call — all in one window." },
];

const TESTIMONIALS = [
  { name: "Priya S.", role: "CS Student", avatar: "P", quote: "CodeTogether replaced my screen-share setup completely. My study group lives in it now." },
  { name: "Arjun M.", role: "Coding Instructor", avatar: "A", quote: "The whiteboard + session timer combo is exactly what I needed for live classes. Game-changer." },
  { name: "Dev K.", role: "Tech YouTuber", avatar: "D", quote: "My viewers can follow along and even join my room. Engagement went through the roof." },
];

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    supabase.auth.getSession().then(({ data }) => setAuthUser(data.session?.user ?? null));
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleJoin() {
    const code = roomCode.trim().toUpperCase();
    if (!code) { setJoinError("Enter a room code"); return; }
    setJoining(true); setJoinError("");
    const { data } = await supabase.from("rooms").select("id, is_active").eq("room_code", code).maybeSingle();
    if (data?.is_active === false) { setJoinError("This session has ended. Ask the owner to create a new room."); setJoining(false); }
    else if (data) router.push(`/room/${data.id}`);
    else { setJoinError("Room not found. Check the code."); setJoining(false); }
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#000000", fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>

      {/* ── NAVBAR ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? "rgba(255,255,255,0.95)" : "#ffffff",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: "1px solid #e5e7eb",
        transition: "all 0.2s", padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ fontSize: 22, fontWeight: 900, color: "#000000", textDecoration: "none", letterSpacing: "-0.5px" }}>
            Code<span style={{ color: "#000000" }}>Together</span>
          </Link>
          {/* Desktop nav */}
          <nav style={{ display: "flex", gap: 28, alignItems: "center" }} className="desk-nav">
            {["features","how-it-works","account-types","testimonials"].map((id) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>
                {id.replace(/-/g, " ")}
              </button>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {authUser ? (
              <Link href="/dashboard" style={{ padding: "9px 20px", background: "#000000", borderRadius: 8, color: "#ffffff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" style={{ padding: "8px 18px", border: "1px solid #d1d5db", borderRadius: 8, color: "#000000", fontSize: 14, fontWeight: 600, textDecoration: "none", background: "#ffffff" }}>Login</Link>
                <Link href="/signup" style={{ padding: "8px 20px", background: "#000000", borderRadius: 8, color: "#ffffff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Get Started</Link>
              </>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="mob-menu-btn" style={{ background: "none", border: "none", color: "#000000", cursor: "pointer", display: "none" }}>
              {menuOpen ? <X size={22}/> : <Menu size={22}/>}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: "#ffffff", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            {["features","how-it-works","account-types","testimonials"].map(id => (
              <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", color: "#111827", cursor: "pointer", textAlign: "left", fontSize: 15, fontWeight: 600, textTransform: "capitalize" }}>
                {id.replace(/-/g, " ")}
              </button>
            ))}
            <Link href="/login" style={{ color: "#000000", fontWeight: 600, textDecoration: "none" }}>Login</Link>
            <Link href="/signup" style={{ color: "#000000", fontWeight: 800, textDecoration: "none" }}>Get Started →</Link>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section style={{ minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", position: "relative", background: "#ffffff" }}>

        <div className="animate-slide-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f3f4f6", border: "1px solid #000000", borderRadius: 999, padding: "6px 18px", fontSize: 13, color: "#000000", marginBottom: 28, fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#000000", display: "inline-block" }} />
          Code together Live — Whiteboard · AI Assistant · Session Timer
        </div>

        <h1 className="animate-slide-up delay-100" style={{ fontSize: "clamp(38px, 7vw, 76px)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-2px", maxWidth: 860, marginBottom: 24, color: "#000000" }}>
          Real-Time Code Collaboration<br/>
          <span style={{ color: "#000000", background: "none", WebkitTextFillColor: "#000000" }}>
            Code together instantly.
          </span>
        </h1>

        <p className="animate-slide-up delay-200" style={{ fontSize: "clamp(16px, 2.2vw, 20px)", color: "#374151", maxWidth: 640, lineHeight: 1.6, marginBottom: 44, fontWeight: 500 }}>
          Real-time code editor, video calls, interactive terminal, whiteboard, and AI assistant — all in one browser tab. No setup. No installs.
        </p>

        <div className="animate-slide-up delay-300" style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 44 }}>
          <Link href="/signup" style={{ padding: "16px 36px", background: "#000000", borderRadius: 12, color: "#ffffff", fontSize: 16, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 14px rgba(0,0,0,0.15)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            Start for Free 
            <ArrowRight size={18}/>
          </Link>
          <button onClick={() => scrollTo("how-it-works")} style={{ padding: "16px 30px", background: "#ffffff", border: "1.5px solid #000000", borderRadius: 12, color: "#000000", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Play size={16}/> See how it works
          </button>
        </div>

        {/* Room join */}
        <div className="animate-scale-in delay-400" style={{ background: "#ffffff", border: "1.5px solid #000000", borderRadius: 16, padding: 24, maxWidth: 480, width: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 13, color: "#374151", marginBottom: 12, fontWeight: 700 }}>Have a room code? Join instantly:</p>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={roomCode} onChange={e => { setRoomCode(e.target.value.toUpperCase()); setJoinError(""); }}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              placeholder="ENTER CODE E.G. XK9P2M"
              style={{ flex: 1, background: "#ffffff", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "11px 14px", color: "#000000", fontSize: 14, outline: "none", letterSpacing: 2, fontWeight: 800, textTransform: "uppercase" }}
              onFocus={e => e.target.style.borderColor = "#000000"}
              onBlur={e => e.target.style.borderColor = "#d1d5db"}
            />
            <button onClick={handleJoin} disabled={joining}
              style={{ padding: "11px 22px", background: "#000000", border: "none", borderRadius: 10, color: "#ffffff", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              {joining ? "..." : "Join →"}
            </button>
          </div>
          {joinError && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 10, fontWeight: 600 }}>{joinError}</p>}
        </div>

        {/* Trust bar */}
        <div style={{ marginTop: 64, display: "flex", gap: 36, flexWrap: "wrap", justifyContent: "center", opacity: 0.8 }}>
          {["🖥 Interactive Terminal","⚡ Realtime","🎥 Built-in Video Calls","🤖 AI Coding Assistant","⚡ xterm.js"].map(t => (
            <span key={t} style={{ fontSize: 13, color: "#4b5563", fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto", background: "#ffffff" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 className="animate-slide-up" style={{ fontSize: "clamp(30px,5vw,52px)", fontWeight: 900, letterSpacing: "-1.5px", color: "#000000" }}>Everything you need to code together</h2>
          <p className="animate-slide-up delay-100" style={{ color: "#4b5563", marginTop: 14, fontSize: 18, fontWeight: 500 }}>No tab switching. No plugins. Everything ships in one room.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 24 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="animate-slide-up" style={{ animationDelay: `${150 + i * 50}ms`, background: "#ffffff", border: "1.5px solid #e5e7eb", borderRadius: 16, padding: 32, transition: "all 0.2s", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "#000000"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.08)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.03)"; }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", marginBottom: 20 }}>{f.icon}</div>
              <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 10, color: "#000000" }}>{f.title}</h3>
              <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: "100px 24px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <h2 className="animate-slide-up" style={{ fontSize: "clamp(30px,5vw,52px)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 14, color: "#000000" }}>Up and running in 3 steps</h2>
          <p className="animate-slide-up delay-100" style={{ color: "#4b5563", fontSize: 18, marginBottom: 64, fontWeight: 500 }}>Seriously — under a minute from signup to coding together.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 28 }}>
            {HOW_IT_WORKS.map((s, i) => (
              <div key={i} className="animate-slide-up" style={{ animationDelay: `${150 + i * 100}ms`, textAlign: "left", position: "relative", background: "#ffffff", padding: "28px", borderRadius: 16, border: "1.5px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: "#000000", lineHeight: 1, marginBottom: 16 }}>{s.step}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: "#000000" }}>{s.title}</h3>
                <p style={{ color: "#4b5563", fontSize: 15, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACCOUNT TYPES ── */}
      <section id="account-types" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto", background: "#ffffff" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 className="animate-slide-up" style={{ fontSize: "clamp(30px,5vw,52px)", fontWeight: 900, letterSpacing: "-1.5px", color: "#000000" }}>Built for every kind of coder</h2>
          <p className="animate-slide-up delay-100" style={{ color: "#4b5563", marginTop: 14, fontSize: 18, fontWeight: 500 }}>Pick your account type — your dashboard and features adapt to you.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 24 }}>
          {ACCOUNT_TYPES.map((a, i) => (
            <Link key={a.id} href={`/signup?role=${a.id}`} style={{ textDecoration: "none", display: "block" }}>
              <div className="animate-slide-up" style={{ animationDelay: `${150 + i * 50}ms`, background: "#ffffff", border: "1.5px solid #000000", borderRadius: 20, padding: 28, height: "100%", boxSizing: "border-box", transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.08)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ color: "#000000", marginBottom: 16 }}>{a.icon}</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: "#000000", marginBottom: 8 }}>{a.label}</h3>
                <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6, marginBottom: 24 }}>{a.desc}</p>
                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {a.perks.map(p => (
                    <li key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#111827", fontWeight: 600 }}>
                      <CheckCircle2 size={16} color="#000000"/> {p}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 6, color: "#000000", fontSize: 14, fontWeight: 800 }}>
                  Get started <ChevronRight size={16}/>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: "100px 24px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 className="animate-slide-up" style={{ fontSize: "clamp(30px,5vw,52px)", fontWeight: 900, letterSpacing: "-1.5px", textAlign: "center", marginBottom: 64, color: "#000000" }}>Loved by coders worldwide</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="animate-slide-up" style={{ animationDelay: `${100 + i * 100}ms`, background: "#ffffff", border: "1.5px solid #e5e7eb", borderRadius: 16, padding: 28 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  {[...Array(5)].map((_, j) => <Star key={j} size={16} fill="#000000" color="#000000"/>)}
                </div>
                <p style={{ color: "#111827", fontSize: 15, lineHeight: 1.7, marginBottom: 20, fontWeight: 500 }}>&quot;{t.quote}&quot;</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#ffffff" }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#000000" }}>{t.name}</div>
                    <div style={{ color: "#6b7280", fontSize: 13 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "100px 24px", textAlign: "center", background: "#ffffff" }}>
        <div className="animate-scale-in" style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(32px,5vw,54px)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 20, color: "#000000" }}>Ready to code together?</h2>
          <p style={{ color: "#4b5563", fontSize: 18, marginBottom: 40, fontWeight: 500 }}>Join thousands of students, teachers, and teams already using CodeTogether.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" style={{ padding: "16px 36px", background: "#000000", borderRadius: 14, color: "#ffffff", fontSize: 17, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 18px rgba(0,0,0,0.15)" }}>
              Create Free Account
            </Link>
            <Link href="/login" style={{ padding: "16px 30px", background: "#ffffff", border: "1.5px solid #000000", borderRadius: 14, color: "#000000", fontSize: 17, fontWeight: 700, textDecoration: "none" }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "48px 24px", textAlign: "center", background: "#ffffff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#000000" }}>Code<span style={{ color: "#000000" }}>Together</span></div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center" }}>
            {["Features","How it Works","Account Types","Login","Sign Up"].map(l => (
              <span key={l} style={{ color: "#4b5563", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{l}</span>
            ))}
          </div>
          <p style={{ color: "#6b7280", fontSize: 13 }}>© 2026 CodeTogether. Built with Next.js · Supabase · WebRTC </p>
        </div>
      </footer>

    </div>
  );
}
