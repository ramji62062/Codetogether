"use client";

import React from "react";
import { Monitor, Download, Apple, Terminal as TerminalIcon, Shield } from "lucide-react";

export default function DownloadPage() {
  const handleDownload = (platform: string) => {
    window.open(`https://github.com/ramji62062/Codetogether/releases/latest`, "_blank");
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
          <a href="/" className="flex items-center gap-2 text-[#e2e8f0] font-bold text-lg">
            <span className="text-[#22d3ee] font-mono">&lt;/&gt;</span> CodeTogether
          </a>
          <a href="/" className="text-[#94a3b8] hover:text-white text-sm transition-colors">
            Back to App
          </a>
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

        {/* Platform Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-12">
          {platforms.map((platform) => (
            <button
              key={platform.name}
              onClick={() => handleDownload(platform.name.toLowerCase())}
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
