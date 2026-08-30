"use client";

import React, { useState, useEffect } from "react";
import { Monitor, Download, Apple, Terminal as TerminalIcon, Shield, ExternalLink, Clock } from "lucide-react";
import Link from "next/link";

export default function DownloadPage() {
  const [hasRelease, setHasRelease] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/ramji62062/Codetogether/releases/latest")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setHasRelease(!!data?.tag_name))
      .catch(() => setHasRelease(false));
  }, []);

  const handleDownload = () => {
    window.open("https://github.com/ramji62062/Codetogether/releases/latest", "_blank");
  };

  const platforms = [
    {
      name: "macOS",
      icon: <Apple size={24} />,
      description: "Universal binary for Intel & Apple Silicon Macs",
      format: ".dmg",
      color: "from-blue-600 to-indigo-600",
      hoverColor: "hover:from-blue-500 hover:to-indigo-500",
    },
    {
      name: "Windows",
      icon: <Monitor size={24} />,
      description: "Installer for Windows 10/11 (64-bit)",
      format: ".exe",
      color: "from-purple-600 to-pink-600",
      hoverColor: "hover:from-purple-500 hover:to-pink-500",
    },
    {
      name: "Linux",
      icon: <TerminalIcon size={24} />,
      description: "AppImage & .deb for Ubuntu/Debian-based distros",
      format: ".AppImage",
      color: "from-emerald-600 to-teal-600",
      hoverColor: "hover:from-emerald-500 hover:to-teal-500",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
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

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#e2e8f0] mb-4">
            Download CodeTogether
          </h1>
          <p className="text-lg text-[#94a3b8] mb-6">
            The collaborative IDE that runs on your machine. Code together with friends, chat, share screens, and execute code locally.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-[#64748b]">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-emerald-400" />
              <span>Runs locally</span>
            </div>
            <div className="flex items-center gap-2">
              <TerminalIcon size={16} className="text-sky-400" />
              <span>Real terminal</span>
            </div>
            <div className="flex items-center gap-2">
              <Download size={16} className="text-purple-400" />
              <span>Free & open source</span>
            </div>
          </div>
        </div>

        {/* Coming Soon Banner */}
        {hasRelease === false && (
          <div className="max-w-2xl w-full mb-10 bg-[#12121a] border border-amber-500/30 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock size={20} className="text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-300">Desktop App — Coming Soon</h3>
            </div>
            <p className="text-[#94a3b8] text-sm mb-4">
              We&apos;re building the desktop app right now. In the meantime, use CodeTogether directly in your browser — it has all the same features.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/signup"
                className="px-6 py-2.5 bg-white rounded-lg text-black text-sm font-bold no-underline hover:bg-gray-200 transition-colors"
              >
                Try in Browser
              </Link>
              <a
                href="https://github.com/ramji62062/Codetogether"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 border border-[#333] rounded-lg text-gray-300 text-sm no-underline hover:border-gray-500 transition-colors inline-flex items-center gap-2"
              >
                View on GitHub <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {/* Platform Cards */}
        {hasRelease !== false && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-12">
            {platforms.map((platform) => (
              <button
                key={platform.name}
                onClick={handleDownload}
                className={`group relative bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 text-left transition-all hover:border-[#333] hover:shadow-lg hover:shadow-black/20 cursor-pointer`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {platform.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#e2e8f0] mb-1">{platform.name}</h3>
                <p className="text-sm text-[#94a3b8] mb-3">{platform.description}</p>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r ${platform.color} ${platform.hoverColor} text-white text-sm font-medium transition-all`}>
                  <Download size={14} />
                  Download {platform.format}
                </div>
              </button>
            ))}
          </div>
        )}

        {hasRelease === true && (
          <p className="text-[#64748b] text-xs mb-12">
            Downloads from{" "}
            <a href="https://github.com/ramji62062/Codetogether/releases" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
              GitHub Releases
            </a>
          </p>
        )}

        {/* Features */}
        <div className="max-w-3xl w-full">
          <h2 className="text-xl font-semibold text-[#e2e8f0] text-center mb-6">Features</h2>
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
              <div className="text-purple-400 font-medium mb-1">Video & Screen Share</div>
              <div className="text-[#94a3b8]">Built-in WebRTC video calls and screen sharing</div>
            </div>
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
              <div className="text-amber-400 font-medium mb-1">AI Integration</div>
              <div className="text-[#94a3b8]">Optional Ollama integration for local AI code assistance</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e1e2e] px-6 py-4 text-center text-[#64748b] text-sm">
        CodeTogether &copy; 2026
      </footer>
    </div>
  );
}
