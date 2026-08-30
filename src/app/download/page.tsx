"use client";

import React from "react";
import { Monitor, Download, Apple, Terminal as TerminalIcon, Shield, Copy, Check } from "lucide-react";
import Link from "next/link";

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-[#94a3b8] text-sm font-mono hover:border-[#444] transition-colors cursor-pointer"
    >
      <code className="flex-1 text-left">{text}</code>
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );
}

export default function DownloadPage() {
  const platforms = [
    { name: "macOS", icon: <Apple size={24} />, desc: "Intel & Apple Silicon", cmd: "npm run electron:build:mac" },
    { name: "Windows", icon: <Monitor size={24} />, desc: "Windows 10/11 (64-bit)", cmd: "npm run electron:build:win" },
    { name: "Linux", icon: <TerminalIcon size={24} />, desc: "AppImage & .deb", cmd: "npm run electron:build:linux" },
  ];

  const steps = [
    { num: "1", title: "Clone the repo", code: "git clone https://github.com/ramji62062/Codetogether.git && cd Codetogether" },
    { num: "2", title: "Install dependencies", code: "npm install" },
    { num: "3", title: "Build the desktop app", code: "npm run electron:build:mac" },
  ];

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
            Use all features directly in your browser — editor, terminal, video calls, whiteboard, AI assistant.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/signup" className="px-6 py-2.5 bg-white rounded-lg text-black text-sm font-bold no-underline hover:bg-gray-200 transition-colors">
              Open in Browser
            </Link>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-12">
          {platforms.map((p) => (
            <div key={p.name} className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-white/[0.09] flex items-center justify-center text-gray-400 mb-4">{p.icon}</div>
              <h3 className="text-lg font-semibold text-[#e2e8f0] mb-1">{p.name}</h3>
              <p className="text-sm text-[#94a3b8] mb-3">{p.desc}</p>
              <CopyBlock text={p.cmd} />
            </div>
          ))}
        </div>

        {/* Build Instructions */}
        <div className="max-w-2xl w-full bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8 mb-12">
          <h2 className="text-xl font-semibold text-[#e2e8f0] mb-6">Build Desktop App from Source</h2>
          <div className="space-y-6">
            {steps.map((s) => (
              <div key={s.num} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">{s.num}</div>
                <div className="flex-1">
                  <h4 className="text-[#e2e8f0] font-medium mb-2">{s.title}</h4>
                  <CopyBlock text={s.code} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-[#1a1a2e] border border-amber-500/20 rounded-lg">
            <p className="text-amber-300/80 text-xs">
              Requires Node.js 18+, npm, and for macOS: Xcode Command Line Tools. The build creates a <code>.dmg</code> / <code>.exe</code> / <code>.AppImage</code> in the <code>dist-electron/</code> folder.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-3xl w-full">
          <h2 className="text-xl font-semibold text-[#e2e8f0] text-center mb-6">Desktop App Features</h2>
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
