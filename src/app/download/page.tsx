"use client";

import React from "react";
import { Monitor, Download, Apple, Terminal as TerminalIcon, Shield, ExternalLink } from "lucide-react";
import Link from "next/link";

const RELEASE_URL = "https://github.com/ramji62062/Codetogether/releases/tag/v1.0.3";

const platforms = [
  {
    name: "macOS (Apple Silicon)",
    icon: <Apple size={24} />,
    description: "M1, M2, M3, M4 Macs",
    url: "https://github.com/ramji62062/Codetogether/releases/download/v1.0.3/CodeTogether-0.1.0-arm64.dmg",
    color: "from-blue-600 to-indigo-600",
    hoverColor: "hover:from-blue-500 hover:to-indigo-500",
  },
  {
    name: "macOS (Intel)",
    icon: <Apple size={24} />,
    description: "Older Intel-based Macs",
    url: "https://github.com/ramji62062/Codetogether/releases/download/v1.0.3/CodeTogether-0.1.0.dmg",
    color: "from-sky-600 to-cyan-600",
    hoverColor: "hover:from-sky-500 hover:to-cyan-500",
  },
  {
    name: "Windows",
    icon: <Monitor size={24} />,
    description: "Windows 10/11 — coming soon",
    url: "#",
    color: "from-purple-600 to-pink-600",
    hoverColor: "hover:from-purple-500 hover:to-pink-500",
    comingSoon: true,
  },
  {
    name: "Linux",
    icon: <TerminalIcon size={24} />,
    description: "AppImage & .deb — coming soon",
    url: "#",
    color: "from-emerald-600 to-teal-600",
    hoverColor: "hover:from-emerald-500 hover:to-teal-500",
    comingSoon: true,
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <header className="border-b border-[#1e1e2e] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#e2e8f0] font-bold text-lg no-underline">
            <span className="text-[#22d3ee] font-mono">&lt;/&gt;</span> CodeTogether
          </Link>
          <Link href="/" className="text-[#94a3b8] hover:text-white text-sm transition-colors no-underline">
            Back to App
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-16">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#e2e8f0] mb-4">
            Download CodeTogether
          </h1>
          <p className="text-lg text-[#94a3b8] mb-6">
            The collaborative IDE that runs on your machine. Code together with friends, chat, share screens, and execute code locally.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-[#64748b]">
            <div className="flex items-center gap-2"><Shield size={16} className="text-emerald-400" /><span>Runs locally</span></div>
            <div className="flex items-center gap-2"><TerminalIcon size={16} className="text-sky-400" /><span>Real terminal</span></div>
            <div className="flex items-center gap-2"><Download size={16} className="text-purple-400" /><span>Free &amp; open source</span></div>
          </div>
        </div>

        {/* Browser Option */}
        <div className="max-w-2xl w-full mb-10 bg-[#12121a] border border-sky-500/30 rounded-2xl p-6 text-center">
          <h3 className="text-lg font-semibold text-sky-300 mb-2">Try in Browser (No Install)</h3>
          <p className="text-[#94a3b8] text-sm mb-4">
            Use all features directly in your browser — editor, terminal, video calls, whiteboard, AI.
          </p>
          <Link href="/signup" className="px-6 py-2.5 bg-white rounded-lg text-black text-sm font-bold no-underline hover:bg-gray-200 transition-colors inline-block">
            Open in Browser
          </Link>
        </div>

        {/* Platform Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full mb-12">
          {platforms.map((p) => (
            <a
              key={p.name}
              href={p.comingSoon ? undefined : p.url}
              target={p.comingSoon ? undefined : "_blank"}
              rel={p.comingSoon ? undefined : "noopener noreferrer"}
              className={`group relative bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 text-left transition-all hover:border-[#333] hover:shadow-lg hover:shadow-black/20 ${p.comingSoon ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                {p.icon}
              </div>
              <h3 className="text-lg font-semibold text-[#e2e8f0] mb-1">{p.name}</h3>
              <p className="text-sm text-[#94a3b8] mb-3">{p.description}</p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r ${p.color} ${p.hoverColor} text-white text-sm font-medium transition-all`}>
                {p.comingSoon ? "Coming Soon" : <><Download size={14} /> Download .dmg</>}
              </div>
            </a>
          ))}
        </div>

        {/* Install Steps */}
        <div className="max-w-2xl w-full bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8 mb-12">
          <h2 className="text-xl font-semibold text-[#e2e8f0] mb-6">How to Install</h2>
          <div className="space-y-4">
            {[
              { step: "1", text: "Download the .dmg file for your Mac" },
              { step: "2", text: "Open the downloaded .dmg file" },
              { step: "3", text: "Drag CodeTogether into your Applications folder" },
              { step: "4", text: "Open CodeTogether from Applications — done!" },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">{s.step}</div>
                <p className="text-[#94a3b8] text-sm">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="max-w-3xl w-full">
          <h2 className="text-xl font-semibold text-[#e2e8f0] text-center mb-6">What You Get</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
              <div className="text-sky-400 font-medium mb-1">Real Local Terminal</div>
              <div className="text-[#94a3b8]">Full terminal access on your machine, not a sandboxed container</div>
            </div>
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
              <div className="text-emerald-400 font-medium mb-1">File System Access</div>
              <div className="text-[#94a3b8]">Read and save files directly to your project directory</div>
            </div>
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
              <div className="text-purple-400 font-medium mb-1">Video &amp; Screen Share</div>
              <div className="text-[#94a3b8]">Built-in WebRTC video calls and screen sharing</div>
            </div>
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
              <div className="text-amber-400 font-medium mb-1">AI Integration</div>
              <div className="text-[#94a3b8]">Optional Ollama integration for local AI code assistance</div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#1e1e2e] px-6 py-4 text-center text-[#64748b] text-sm">
        CodeTogether &copy; 2026
      </footer>
    </div>
  );
}
