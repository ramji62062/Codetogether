const fs = require('fs');

const code = `
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, Video, Star, GitFork, Play, Clock, LayoutGrid, 
  Search, Filter, ChevronRight, Terminal as TerminalIcon, X
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ExploreHub() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"classes" | "coworking" | "showcase">("classes");
  const [previewProject, setPreviewProject] = useState<any | null>(null);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [coworking, setCoworking] = useState<any[]>([]);
  const [showcases, setShowcases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "classes") {
        const { data } = await supabase.from("rooms").select("*").eq("type", "masterclass").eq("is_active", true).order('viewer_count', { ascending: false });
        if (data) setClasses(data);
      } else if (activeTab === "coworking") {
        const { data } = await supabase.from("rooms").select("*").eq("type", "coworking").eq("is_active", true).order('created_at', { ascending: false });
        if (data) setCoworking(data);
      } else if (activeTab === "showcase") {
        const { data } = await supabase.from("published_workspaces").select("*").order('stars_count', { ascending: false });
        if (data) setShowcases(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const startLiveJam = async (project: any) => {
    // Fork the project and start a room
    const userRes = await supabase.auth.getUser();
    if (!userRes.data.user) {
      alert("Please log in to start a Live Jam.");
      return;
    }

    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create new room
    const { data: room, error } = await supabase.from("rooms").insert({
      host_id: userRes.data.user.id,
      room_code: newRoomCode,
      is_active: true,
      type: "coworking",
      title: \`Fork of \${project.title}\`
    }).select().single();

    if (error || !room) {
      alert("Error starting Live Jam: " + (error?.message || ""));
      return;
    }

    // Instead of a dedicated db insert for files, we could push them locally via the agent or 
    // the user will load them via localStorage. In a real app we'd bulk insert to 'files' table.
    alert(\`Live Jam created! Room Code: \${newRoomCode}\\nRedirecting...\`);
    router.push(\`/room/\${room.id}\`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-inter">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#111] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <LayoutGrid className="text-indigo-500" /> Community Hub
          </h1>
          <div className="flex bg-[#222] rounded-lg p-1 border border-white/5">
            {[
              { id: "classes", label: "Live Classes", icon: <Video size={16}/> },
              { id: "coworking", label: "Co-Working", icon: <Users size={16}/> },
              { id: "showcase", label: "Open-Source", icon: <TerminalIcon size={16}/> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={\`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all \${
                  activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                }\`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..." 
                className="bg-[#1a1a1a] border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT (MASONRY/GRID) */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-white">
            {activeTab === "classes" && "Live Masterclasses"}
            {activeTab === "coworking" && "Active Co-Working Rooms"}
            {activeTab === "showcase" && "Trending Public Projects"}
          </h2>
          <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <Filter size={16} /> Filter by Tags
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-gray-400">Loading data from Supabase...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* TAB: CLASSES */}
            {activeTab === "classes" && classes.filter(c => (c.title||"").toLowerCase().includes(searchQuery.toLowerCase())).map((cls) => (
              <div key={cls.id} onClick={() => router.push(\`/room/\${cls.id}\`)} className="bg-[#151515] border border-white/10 rounded-xl p-5 hover:border-indigo-500/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span> LIVE
                  </span>
                  <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <Users size={14} /> {cls.viewer_count || 0}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{cls.title || "Untitled Masterclass"}</h3>
                <div className="flex gap-2 mb-6 mt-3">
                  {(cls.tags || []).map((t: string) => <span key={t} className="bg-white/5 text-gray-300 text-xs px-2 py-1 rounded">{t}</span>)}
                </div>
                <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                  Join Masterclass <ChevronRight size={16} />
                </button>
              </div>
            ))}

            {/* TAB: COWORKING */}
            {activeTab === "coworking" && coworking.filter(c => (c.title||"").toLowerCase().includes(searchQuery.toLowerCase())).map((room) => (
              <div key={room.id} onClick={() => router.push(\`/room/\${room.id}\`)} className="bg-[#151515] border border-white/10 rounded-xl p-5 hover:border-emerald-500/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <Clock size={12} /> {room.pomodoro_state?.status === 'focus' ? 'Focusing' : 'Open'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{room.title || "Coworking Session"}</h3>
                <div className="flex gap-2 mb-6 mt-3">
                  {(room.tags || []).map((t: string) => <span key={t} className="bg-white/5 text-gray-300 text-xs px-2 py-1 rounded">{t}</span>)}
                </div>
                <button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                  Join Pair-Programming
                </button>
              </div>
            ))}

            {/* TAB: SHOWCASE */}
            {activeTab === "showcase" && showcases.filter(c => (c.title||"").toLowerCase().includes(searchQuery.toLowerCase())).map((proj) => (
              <div key={proj.id} className="bg-[#151515] border border-white/10 rounded-xl p-5 hover:border-sky-500/50 transition-colors cursor-pointer flex flex-col justify-between" onClick={() => setPreviewProject(proj)}>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{proj.title}</h3>
                  <p className="text-sm text-gray-400 mb-4">By <span className="text-gray-300 font-medium">{proj.author_name}</span></p>
                  <div className="flex gap-2 mb-6">
                    {(proj.tags || []).map((t: string) => <span key={t} className="bg-white/5 text-gray-300 text-xs px-2 py-1 rounded">{t}</span>)}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2">
                  <div className="flex items-center gap-4 text-sm font-semibold text-gray-400">
                    <span className="flex items-center gap-1.5 hover:text-yellow-400 transition-colors"><Star size={16}/> {proj.stars_count}</span>
                    <span className="flex items-center gap-1.5 hover:text-sky-400 transition-colors"><GitFork size={16}/> {proj.forks_count}</span>
                  </div>
                  <button className="text-sky-400 text-sm font-bold hover:text-sky-300">Preview →</button>
                </div>
              </div>
            ))}

            {/* Empty States */}
            {!loading && activeTab === "classes" && classes.length === 0 && <div className="text-gray-500 col-span-3">No live masterclasses right now.</div>}
            {!loading && activeTab === "coworking" && coworking.length === 0 && <div className="text-gray-500 col-span-3">No active coworking rooms.</div>}
            {!loading && activeTab === "showcase" && showcases.length === 0 && <div className="text-gray-500 col-span-3">No published projects yet. Check back soon!</div>}

          </div>
        )}
      </main>

      {/* PROJECT DETAIL MODAL */}
      {previewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl relative animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#151515]">
              <div>
                <h2 className="text-xl font-black text-white">{previewProject.title}</h2>
                <p className="text-sm text-gray-400">Published by {previewProject.author_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => startLiveJam(previewProject)}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Play size={16} fill="currentColor" /> Start Live Jam
                </button>
                <button onClick={() => setPreviewProject(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex p-6 gap-6 bg-[#0a0a0a]">
              {/* Fake Code Editor Preview */}
              <div className="flex-1 border border-white/10 rounded-xl bg-[#1e1e1e] flex flex-col overflow-hidden">
                <div className="px-4 py-2 border-b border-white/10 bg-[#252526] text-xs font-semibold text-gray-400">Source Preview</div>
                <div className="p-4 font-mono text-sm text-gray-300 overflow-auto">
                  {Object.keys(previewProject.files_snapshot || {}).map(filename => (
                    <div key={filename} className="mb-4">
                      <div className="text-sky-400 mb-1 border-b border-white/10 inline-block">{filename}</div>
                      <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                        {previewProject.files_snapshot[filename]?.content || "..."}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
`;

fs.writeFileSync('src/app/explore/page.tsx', code);
