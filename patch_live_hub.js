const fs = require('fs');
let code = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');

// 1. We need useRouter
if (!code.includes('useRouter')) {
  code = code.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect } from "react";\nimport { useRouter } from "next/navigation";');
}

// Add state for live rooms
code = code.replace('const [activeTab, setActiveTab] = useState<"feed" | "live" | "requests">("feed");', 'const [activeTab, setActiveTab] = useState<"feed" | "live" | "requests">("feed");\n  const [liveRooms, setLiveRooms] = useState<any[]>([]);\n  const router = useRouter();');

// 2. Fetch live rooms
const fetchLiveRooms = `
  const fetchLiveRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').eq('is_public', true).order('created_at', { ascending: false });
    if (data) setLiveRooms(data);
  };

  useEffect(() => {
    if (activeTab === "live") fetchLiveRooms();
  }, [activeTab]);

  const startLiveRoom = async (type: string) => {
    const code = Math.random().toString(36).substring(2, 8);
    const { error } = await supabase.from('rooms').insert({
      name: type === 'masterclass' ? "Masterclass" : "Jam Session",
      room_code: code,
      language: "typescript",
      is_public: true
    });
    if (!error) router.push(\`/room/\${code}\`);
  };
`;
code = code.replace('useEffect(() => {', fetchLiveRooms + '\n  useEffect(() => {');

// 3. Update the UI for Live Hub
const oldLiveHub = /<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">[\s\S]*?\{MOCK_LIVE_ROOMS\.map\(room => \([\s\S]*?\}\)\}\s*<\/div>/;

const newLiveHub = `
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 shadow-xl shadow-indigo-900/20 text-white cursor-pointer hover:-translate-y-1 transition-transform border border-indigo-500/50">
              <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <PlayCircle size={24} />
              </div>
              <h3 className="text-xl font-black mb-2">Schedule Masterclass</h3>
              <p className="text-indigo-100 text-sm mb-4">Start a 1-to-many broadcast teaching session with synchronized code.</p>
              <button onClick={() => startLiveRoom('masterclass')} className="flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm cursor-pointer">
                <Plus size={16} /> New Masterclass
              </button>
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 shadow-xl shadow-emerald-900/20 text-white cursor-pointer hover:-translate-y-1 transition-transform border border-emerald-500/50">
              <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-black mb-2">Start Co-Working</h3>
              <p className="text-emerald-100 text-sm mb-4">Open a casual P2P room with collaborative editing.</p>
              <button onClick={() => startLiveRoom('jam')} className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm cursor-pointer">
                <Plus size={16} /> New Jam Session
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Happening Now
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveRooms.length === 0 ? (
                <div className="col-span-full py-10 text-center text-gray-500 bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10">No public live rooms active right now. Start one!</div>
              ) : liveRooms.map(room => (
                <div key={room.id} onClick={() => router.push(\`/room/\${room.room_code}\`)} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden hover:border-sky-500/50 transition-all cursor-pointer group shadow-sm hover:shadow-md">
                  <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 relative">
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-lg shadow-red-500/30">
                      LIVE
                    </div>
                  </div>
                  <div className="p-4 relative">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-black border-2 border-gray-100 dark:border-[#151515] absolute -top-5 flex items-center justify-center font-bold shadow-sm uppercase">
                      {(room.name || "R").charAt(0)}
                    </div>
                    <h4 className="font-bold text-lg mt-4 mb-1 group-hover:text-sky-500 transition-colors">{room.name || "Public Room"}</h4>
                    <p className="text-sm text-gray-500 mb-3">Language: {room.language || "TypeScript"}</p>
                    <div className="flex gap-2">
                      <span className="text-[11px] bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                        #{room.room_code}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
`;

code = code.replace(oldLiveHub, newLiveHub);

fs.writeFileSync('src/components/CommunityFeed.tsx', code);
