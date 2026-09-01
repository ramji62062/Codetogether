"use client";

import { useState } from "react";
import { 
  Home, Video, Folder, Settings, Search, Bell, MessageSquare, Heart, 
  Share2, MoreVertical, Play, Plus, Clock, Users, Globe, Lock, Code2, PlayCircle, Edit3
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- DUMMY DATA ---
const MOCK_POSTS = [
  {
    id: 1,
    author: { name: "Ramji Kumar", handle: "@ramji_k", avatar: "R", isPublic: true },
    content: "Just finished building the new WebRTC floating UI layout! It supports multi-track video processing natively inside the browser using canvas compositing. 🚀",
    mediaUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800",
    mediaType: "image",
    likes: 124,
    comments: 12,
    time: "2h ago"
  },
  {
    id: 2,
    author: { name: "Sarah Drasner", handle: "@sarah_edo", avatar: "S", isPublic: true },
    content: "Teaching a live masterclass on Next.js 14 App Router and Server Actions. Jump into the Live Workspace now and let's code together!",
    mediaUrl: null,
    mediaType: "workspace",
    workspaceId: "ws_next14",
    likes: 890,
    comments: 45,
    time: "4h ago"
  },
  {
    id: 3,
    author: { name: "DevTutor", handle: "@dev_tutor", avatar: "D", isPublic: false },
    content: "Quick tip: Use Tailwind's 'dark:' variant explicitly across all your components to prepare for multi-theme architecture.",
    mediaUrl: null,
    mediaType: "text",
    likes: 56,
    comments: 3,
    time: "6h ago"
  }
];

const MOCK_LIVE_ROOMS = [
  { id: "room1", title: "Advanced Node.js Scaling", host: "Ramji Kumar", viewers: 145, type: "masterclass", tags: ["Node.js", "Backend"] },
  { id: "room2", title: "Late Night Co-working", host: "Sarah D.", viewers: 12, type: "coworking", tags: ["React", "Focus"] },
  { id: "room3", title: "Open Source Bug Bash", host: "CodeTogether", viewers: 67, type: "coworking", tags: ["TypeScript", "Community"] },
];

export default function SocialDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"feed" | "live" | "library" | "settings">("feed");
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-inter transition-colors duration-300 flex">
      
      {/* ── SIDEBAR NAVIGATION ── */}
      <aside className="w-64 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] flex flex-col sticky top-0 h-screen transition-colors duration-300">
        <div className="p-6 border-b border-gray-200 dark:border-white/10">
          <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent flex items-center gap-2">
            <Code2 className="text-indigo-500" /> CodeTogether
          </h1>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab("feed")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === "feed" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <Home size={20} /> Developer Feed
          </button>
          <button 
            onClick={() => setActiveTab("live")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === "live" ? "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <Video size={20} /> Live Hub
          </button>
          <button 
            onClick={() => setActiveTab("library")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === "library" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <Folder size={20} /> My Library
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === "settings" ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <Settings size={20} /> Settings
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-white/10">
          <button onClick={toggleTheme} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg font-semibold text-sm transition-colors hover:bg-gray-300 dark:hover:bg-gray-700">
            {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-[#111]/80 backdrop-blur-lg flex items-center justify-between px-8 sticky top-0 z-40 transition-colors duration-300">
          <h2 className="text-2xl font-black">
            {activeTab === "feed" && "Your Feed"}
            {activeTab === "live" && "Community Live Hub"}
            {activeTab === "library" && "My Library"}
            {activeTab === "settings" && "Account & Privacy"}
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search posts, users, rooms..." 
                className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#1a1a1a] border-none rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 text-sm transition-colors"
              />
            </div>
            <button className="relative text-gray-600 dark:text-gray-300 hover:text-indigo-500 transition-colors">
              <Bell size={24} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">3</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white font-bold cursor-pointer shadow-lg">
              Me
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            
            {/* ── TAB: FEED ── */}
            {activeTab === "feed" && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {/* Create Post Box */}
                <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm transition-colors">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      Me
                    </div>
                    <textarea 
                      placeholder="What's happening? Share a project, snippet, or ask a question..." 
                      className="w-full bg-transparent border-none resize-none focus:outline-none text-lg placeholder-gray-400 dark:placeholder-gray-600 pt-2 min-h-[80px]"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <div className="flex gap-2">
                      <button className="p-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-full transition-colors" title="Upload Video/Image">
                        <Video size={20} />
                      </button>
                      <button className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors" title="Attach Live Workspace">
                        <Folder size={20} />
                      </button>
                    </div>
                    <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-colors shadow-md">
                      Post
                    </button>
                  </div>
                </div>

                {/* Posts Feed */}
                {MOCK_POSTS.map(post => (
                  <div key={post.id} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold">
                          {post.author.avatar}
                        </div>
                        <div>
                          <h4 className="font-bold flex items-center gap-2">
                            {post.author.name}
                            {!post.author.isPublic && <span title="Private Profile"><Lock size={12} className="text-gray-400" /></span>}
                          </h4>
                          <span className="text-sm text-gray-500">{post.author.handle} · {post.time}</span>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                    
                    <p className="text-[15px] leading-relaxed mb-4">{post.content}</p>

                    {post.mediaType === "image" && post.mediaUrl && (
                      <div className="rounded-xl overflow-hidden mb-4 border border-gray-100 dark:border-white/5 bg-gray-100 dark:bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.mediaUrl} alt="Post media" className="w-full h-auto object-cover max-h-[400px]" />
                      </div>
                    )}

                    {post.mediaType === "workspace" && (
                      <div className="rounded-xl p-6 bg-gradient-to-br from-gray-900 to-black text-white mb-4 border border-gray-800 shadow-inner flex flex-col items-center justify-center gap-3">
                        <Code2 size={48} className="text-sky-400" />
                        <h3 className="font-bold text-lg">Interactive Live Workspace</h3>
                        <button className="px-6 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-transform hover:scale-105">
                          <Play size={16} fill="currentColor" /> Launch in Browser
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4 text-gray-500 dark:text-gray-400">
                      <div className="flex gap-6">
                        <button className="flex items-center gap-2 hover:text-pink-500 transition-colors">
                          <Heart size={20} /> <span>{post.likes}</span>
                        </button>
                        <button className="flex items-center gap-2 hover:text-sky-500 transition-colors">
                          <MessageSquare size={20} /> <span>{post.comments}</span>
                        </button>
                      </div>
                      <button className="flex items-center gap-2 hover:text-indigo-500 transition-colors">
                        <Share2 size={20} /> <span>Share</span>
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="py-6 flex justify-center">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            )}

            {/* ── TAB: LIVE HUB ── */}
            {activeTab === "live" && (
              <div className="flex flex-col gap-8 animate-fade-in max-w-5xl mx-auto w-full">
                {/* Creation Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 shadow-xl shadow-indigo-900/20 text-white cursor-pointer hover:-translate-y-1 transition-transform border border-indigo-500/50">
                    <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                      <PlayCircle size={24} />
                    </div>
                    <h3 className="text-xl font-black mb-2">Schedule Masterclass</h3>
                    <p className="text-indigo-100 text-sm mb-4">Start a 1-to-many broadcast teaching session with synchronized code.</p>
                    <button className="flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm">
                      <Plus size={16} /> New Masterclass
                    </button>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 shadow-xl shadow-emerald-900/20 text-white cursor-pointer hover:-translate-y-1 transition-transform border border-emerald-500/50">
                    <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                      <Users size={24} />
                    </div>
                    <h3 className="text-xl font-black mb-2">Start Co-Working</h3>
                    <p className="text-emerald-100 text-sm mb-4">Open a casual P2P room with pomodoro timers and collaborative editing.</p>
                    <button className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm">
                      <Plus size={16} /> New Jam Session
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    Happening Now
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MOCK_LIVE_ROOMS.map(room => (
                      <div key={room.id} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden hover:border-sky-500/50 transition-all cursor-pointer group shadow-sm hover:shadow-md">
                        <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 relative">
                          <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-lg shadow-red-500/30">
                            LIVE <Users size={10}/> {room.viewers}
                          </div>
                          {room.type === 'masterclass' && (
                            <div className="absolute top-3 right-3 bg-indigo-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded">
                              MASTERCLASS
                            </div>
                          )}
                        </div>
                        <div className="p-4 relative">
                          <div className="w-10 h-10 rounded-full bg-white dark:bg-black border-2 border-gray-100 dark:border-[#151515] absolute -top-5 flex items-center justify-center font-bold shadow-sm">
                            {room.host.charAt(0)}
                          </div>
                          <h4 className="font-bold text-lg mt-4 mb-1 group-hover:text-sky-500 transition-colors">{room.title}</h4>
                          <p className="text-sm text-gray-500 mb-3">Host: {room.host}</p>
                          <div className="flex gap-2">
                            {room.tags.map(tag => (
                              <span key={tag} className="text-[11px] bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: SETTINGS (Privacy Controls) ── */}
            {activeTab === "settings" && (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xl font-black mb-6 border-b border-gray-200 dark:border-white/10 pb-4">Privacy & Social Graph</h3>
                  
                  <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-white/5">
                    <div>
                      <h4 className="font-bold flex items-center gap-2"><Globe size={18} className="text-sky-500"/> Public Profile</h4>
                      <p className="text-sm text-gray-500 mt-1">Anyone can see your posts and join your public live rooms.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-sky-500"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <h4 className="font-bold flex items-center gap-2"><Lock size={18} className="text-pink-500"/> Private Account</h4>
                      <p className="text-sm text-gray-500 mt-1">Only approved followers can see your feed and activity.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-pink-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
