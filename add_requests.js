const fs = require('fs');

let feed = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');

const requestsState = `
  const [followRequests, setFollowRequests] = useState<any[]>([]);

  const fetchFollowRequests = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from('follows')
      .select('*, follower:users!follows_follower_id_fkey(id, name, avatar_url)')
      .eq('following_id', currentUserId)
      .eq('status', 'pending');
    if (data) setFollowRequests(data);
  };

  useEffect(() => {
    if (activeTab === "requests") fetchFollowRequests();
  }, [activeTab]);

  const handleAcceptRequest = async (followerId: string) => {
    await supabase.from('follows').update({ status: 'approved' }).eq('follower_id', followerId).eq('following_id', currentUserId);
    fetchFollowRequests();
  };

  const handleRejectRequest = async (followerId: string) => {
    await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', currentUserId);
    fetchFollowRequests();
  };
`;

if (!feed.includes('handleAcceptRequest')) {
  feed = feed.replace('const [isPosting, setIsPosting] = useState(false);', 'const [isPosting, setIsPosting] = useState(false);\n' + requestsState);

  const tabsReplace = `
      <div className="flex gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab("feed")}
          className={\`px-6 py-2 rounded-xl font-bold transition-all \${activeTab === "feed" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"}\`}
        >
          Developer Feed
        </button>
        <button 
          onClick={() => setActiveTab("live")}
          className={\`px-6 py-2 rounded-xl font-bold transition-all \${activeTab === "live" ? "bg-sky-600 text-white shadow-lg shadow-sky-500/30" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"}\`}
        >
          Live Hub
        </button>
        <button 
          onClick={() => setActiveTab("requests" as any)}
          className={\`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 \${activeTab === "requests" ? "bg-pink-600 text-white shadow-lg shadow-pink-500/30" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"}\`}
        >
          Requests {followRequests.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{followRequests.length}</span>}
        </button>
      </div>
  `;
  
  feed = feed.replace(/<div className="flex gap-4 border-b border-gray-200 dark:border-white\/10 pb-4">[\s\S]*?<\/div>/, tabsReplace);
  
  const requestsTabUi = `
      {/* ── FOLLOW REQUESTS VIEW ── */}
      {activeTab === "requests" && (
        <div className="flex flex-col gap-6 animate-fade-in w-full max-w-2xl mx-auto">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">Follow Requests</h3>
          {followRequests.length === 0 ? (
            <div className="py-10 text-center text-gray-500 bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10">
              No pending follow requests.
            </div>
          ) : (
            followRequests.map(req => {
               const follower = Array.isArray(req.follower) ? req.follower[0] : req.follower;
               return (
                <div key={req.follower_id} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold overflow-hidden">
                      {follower?.avatar_url ? (
                        <img src={follower.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        (follower?.name || "U").charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{follower?.name || "Unknown"}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAcceptRequest(follower?.id)} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full text-sm">Accept</button>
                    <button onClick={() => handleRejectRequest(follower?.id)} className="px-4 py-1.5 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold rounded-full text-sm">Delete</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
  `;
  
  feed = feed.replace('</div>\n  );\n}\n', requestsTabUi + '\n    </div>\n  );\n}\n');
  
  fs.writeFileSync('src/components/CommunityFeed.tsx', feed);
}
