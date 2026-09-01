const fs = require('fs');

let feed = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');

const mockData = `
// --- FALLBACK MOCK DATA ---
const MOCK_POSTS = [
  {
    id: "mock1",
    author: { name: "Ramji Kumar", handle: "@ramji_k", avatar_url: null, is_public: true },
    content_text: "Just finished building the new WebRTC floating UI layout! It supports multi-track video processing natively inside the browser using canvas compositing. 🚀",
    media_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800",
    media_type: "image",
    likes: Array(124).fill({}),
    comments: Array(12).fill({ author: { name: "User" }, content: "Awesome work!" }),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "mock2",
    author: { name: "Sarah Drasner", handle: "@sarah_edo", avatar_url: null, is_public: true },
    content_text: "Teaching a live masterclass on Next.js 14 App Router and Server Actions. Jump into the Live Workspace now and let's code together!",
    media_url: null,
    media_type: "workspace",
    workspaceId: "ws_next14",
    likes: Array(890).fill({}),
    comments: Array(45).fill({ author: { name: "Student" }, content: "Can't wait!" }),
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "mock3",
    author: { name: "DevTutor", handle: "@dev_tutor", avatar_url: null, is_public: false },
    content_text: "Quick tip: Use Tailwind's 'dark:' variant explicitly across all your components to prepare for multi-theme architecture.",
    media_url: null,
    media_type: "text",
    likes: Array(56).fill({}),
    comments: Array(3).fill({ author: { name: "User" }, content: "Thanks for the tip!" }),
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  }
];

const MOCK_LIVE_ROOMS = [
  { id: "room1", title: "Advanced Node.js Scaling", host: "Ramji Kumar", viewers: 145, type: "masterclass", tags: ["Node.js", "Backend"] },
  { id: "room2", title: "Late Night Co-working", host: "Sarah D.", viewers: 12, type: "coworking", tags: ["React", "Focus"] },
  { id: "room3", title: "Open Source Bug Bash", host: "CodeTogether", viewers: 67, type: "coworking", tags: ["TypeScript", "Community"] },
];
`;

if (!feed.includes('MOCK_POSTS')) {
    feed = feed.replace('export default function CommunityFeed', mockData + '\nexport default function CommunityFeed');
    
    // Replace the empty check to use mock data
    feed = feed.replace(/posts\.length === 0 \? \([\s\S]*?\) : \(/, 'posts.length === 0 ? MOCK_POSTS : posts).map(post => {');
    // Remove the extra closing parens that would be left behind by the ternary replacement
    feed = feed.replace(/}\)\s*\)\s*\}\s*<\/div>\s*\)\}/, '})}\n        </div>\n      )}');
    
    // Replace live rooms empty check
    const newLiveUi = `
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
    `;
    feed = feed.replace(/<div className="py-10 text-center text-gray-500 bg-white dark:bg-\[#151515\] rounded-xl border border-gray-200 dark:border-white\/10">\s*No public live rooms active right now. Start one!\s*<\/div>/, newLiveUi);
    
    fs.writeFileSync('src/components/CommunityFeed.tsx', feed);
}
