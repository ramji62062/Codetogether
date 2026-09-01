"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Video, Folder, Search, MessageSquare, Heart, 
  Share2, MoreVertical, Play, Plus, Users, Lock, Code2, PlayCircle, Send
} from "lucide-react";




const MOCK_LIVE_ROOMS = [
  { id: "room1", title: "Advanced Node.js Scaling", host: "Ramji Kumar", viewers: 145, type: "masterclass", tags: ["Node.js", "Backend"] },
  { id: "room2", title: "Late Night Co-working", host: "Sarah D.", viewers: 12, type: "coworking", tags: ["React", "Focus"] },
  { id: "room3", title: "Open Source Bug Bash", host: "CodeTogether", viewers: 67, type: "coworking", tags: ["TypeScript", "Community"] },
];

export default function CommunityFeed({ currentUserId }: { currentUserId: string }) {
  const [activeTab, setActiveTab] = useState<"feed" | "live" | "requests">("feed");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);

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


  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});

  const handlePostComment = async (postId: string) => {
    const text = commentText[postId];
    if (!text?.trim() || !currentUserId) return;
    
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: currentUserId, content: text })
      .select('*, author:users(name, avatar_url)')
      .single();

    if (!error && data) {
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comments: [...(p.comments || []), data] };
        }
        return p;
      }));
      setCommentText(prev => ({ ...prev, [postId]: "" }));
    }
  };


  useEffect(() => {
    fetchPosts();
  }, [activeTab]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // Because of RLS, this will automatically ONLY return posts the user is allowed to see!
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id, content_text, media_url, media_type, created_at, author_id,
          author:users(id, name, avatar_url, is_public),
          likes(id, user_id),
          comments(id, content, created_at, author:users(name, avatar_url))
        `)
        .order("created_at", { ascending: false });

      if (error) { console.error("Fetch posts error:", error); } else if (data) { setPosts(data); }
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
    setLoading(false);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !currentUserId) return;
    setIsPosting(true);
    const { data, error } = await supabase
      .from("posts")
      .insert({ author_id: currentUserId, content_text: newPostContent, media_type: "text" })
      .select()
      .single();
    
    if (!error && data) {
      setNewPostContent("");
      fetchPosts(); // Refresh feed
    } else {
      alert("Database Error: " + (error?.message || "Unknown error creating post. Check Supabase RLS.")); console.error("Post error:", error);
    }
    setIsPosting(false);
  };

  const toggleLike = async (postId: string, hasLiked: boolean) => {
    if (!currentUserId) return;
    
    // Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const newLikes = hasLiked 
          ? p.likes.filter((l: any) => l.user_id !== currentUserId)
          : [...p.likes, { user_id: currentUserId }];
        return { ...p, likes: newLikes };
      }
      return p;
    }));

    if (hasLiked) {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", currentUserId);
    } else {
      await supabase.from("likes").insert({ post_id: postId, user_id: currentUserId });
    }
  };

  const handleFollow = async (authorId: string, isPublic: boolean) => {
    if (!currentUserId) return;
    const status = isPublic ? 'approved' : 'pending';
    const { error } = await supabase.from("follows").insert({ follower_id: currentUserId, following_id: authorId, status });
    if (!error) {
      alert(isPublic ? "Followed successfully!" : "Follow request sent!");
    } else {
      alert("Already following or request pending.");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      
      {/* ── Tabs ── */}
      
      <div className="flex gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab("feed")}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === "feed" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"}`}
        >
          Developer Feed
        </button>
        <button 
          onClick={() => setActiveTab("live")}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === "live" ? "bg-sky-600 text-white shadow-lg shadow-sky-500/30" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"}`}
        >
          Live Hub
        </button>
        <button 
          onClick={() => setActiveTab("requests" as any)}
          className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === "requests" ? "bg-pink-600 text-white shadow-lg shadow-pink-500/30" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"}`}
        >
          Requests {followRequests.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{followRequests.length}</span>}
        </button>
      </div>
  

      {/* ── FEED VIEW ── */}
      {activeTab === "feed" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Create Post Box */}
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm transition-colors">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                You
              </div>
              <textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share a project, snippet, or ask a question to the community..." 
                className="w-full bg-transparent border-none resize-none focus:outline-none text-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 pt-2 min-h-[80px]"
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
              <button 
                onClick={handleCreatePost}
                disabled={isPosting || !newPostContent.trim()}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-full transition-colors shadow-md"
              >
                {isPosting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading feed...</div>
          ) : posts.length === 0 ? (
<div className="py-10 text-center text-gray-500 bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10">No posts yet. Be the first to share something!</div>
) : posts.map(post => {
              const author = Array.isArray(post.author) ? post.author[0] : post.author;
              const hasLiked = post.likes?.some((l: any) => l.user_id === currentUserId);
              
              return (
                <div key={post.id} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold overflow-hidden">
                        {author?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={author.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          (author?.name || "U").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                          {author?.name || "Unknown User"}
                          {!author?.is_public && <span title="Private Profile"><Lock size={12} className="text-gray-400" /></span>}
                        </h4>
                        <span className="text-sm text-gray-500">{new Date(post.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {author?.id !== currentUserId && (
                        <>
                          <button onClick={() => handleFollow(author?.id, author?.is_public)} className="px-3 py-1 text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white rounded-full hover:bg-gray-200 dark:hover:bg-white/20">
                            Follow
                          </button>
                          <button onClick={() => alert("Open the Developer Chat widget to send Direct Messages!")} className="px-3 py-1 text-xs font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-500/30">Message</button>
                        </>
                      )}
                      <button className="text-gray-400 hover:text-gray-700 dark:hover:text-white ml-2">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-[15px] leading-relaxed mb-4 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post.content_text}</p>

                  {post.media_type === "image" && post.media_url && (
                    <div className="rounded-xl overflow-hidden mb-4 border border-gray-100 dark:border-white/5 bg-gray-100 dark:bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.media_url} alt="Post media" className="w-full h-auto object-cover max-h-[400px]" />
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4 text-gray-500 dark:text-gray-400">
                    <div className="flex gap-6">
                      <button onClick={() => toggleLike(post.id, hasLiked)} className={`flex items-center gap-2 transition-colors ${hasLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}>
                        <Heart size={20} fill={hasLiked ? "currentColor" : "none"} /> <span>{post.likes?.length || 0}</span>
                      </button>
                      <button className="flex items-center gap-2 hover:text-sky-500 transition-colors">
                        <MessageSquare size={20} /> <span>{post.comments?.length || 0}</span>
                      </button>
                    </div>
                    <button className="flex items-center gap-2 hover:text-indigo-500 transition-colors">
                      <Share2 size={20} /> <span>Share</span>
                    </button>
                  </div>
                  
                  
                  {/* Comments Preview */}
                  {post.comments && post.comments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                      {post.comments.map((c: any) => {
                        const cAuthor = Array.isArray(c.author) ? c.author[0] : c.author;
                        return (
                          <div key={c.id} className="flex gap-2 mb-2 text-sm">
                            <span className="font-bold text-gray-900 dark:text-white">{cAuthor?.name || "User"}</span>
                            <span className="text-gray-600 dark:text-gray-300">{c.content}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Comment Input */}
                  <div className="mt-3 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add a comment..."
                      value={commentText[post.id] || ""}
                      onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handlePostComment(post.id)}
                      className="flex-1 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-indigo-500 rounded-full px-4 py-2 text-sm focus:outline-none dark:text-white transition-colors"
                    />
                    <button 
                      onClick={() => handlePostComment(post.id)}
                      disabled={!commentText[post.id]?.trim()}
                      className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full disabled:opacity-50 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </div>
</div>
              );
            })}
        </div>
      )}

      {/* ── LIVE HUB VIEW ── */}
      {activeTab === "live" && (
        <div className="flex flex-col gap-8 animate-fade-in w-full">
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
            <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
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
  
    </div>
  );
}
