"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Video, Folder, Search, MessageSquare, Heart, 
  Share2, MoreVertical, Play, Plus, Users, Lock, Code2, PlayCircle, Send, Radio
} from "lucide-react";

export default function CommunityFeed({ currentUserId }: { currentUserId: string }) {
  const [activeTab, setActiveTab] = useState<"feed" | "live" | "requests">("feed");
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [followRequests, setFollowRequests] = useState<any[]>([]);
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});

  const fetchFollowRequests = async () => {
    if (!currentUserId) return;
    try {
      const { data } = await supabase
        .from('follows')
        .select('*, follower:users!follows_follower_id_fkey(id, name, avatar_url)')
        .eq('following_id', currentUserId)
        .eq('status', 'pending');
      if (data) setFollowRequests(data);
    } catch (err) {
      console.error("fetchFollowRequests error:", err);
    }
  };

  const fetchLiveRooms = async () => {
    setLoadingRooms(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, room_code, created_by, is_active, type, tags, viewer_count, created_at, language, creator:users(id, name, avatar_url)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("fetchLiveRooms error:", error);
      } else if (data) {
        const parsed = data.map((r: any) => {
          let meta: any = {};
          if (r.name && r.name.startsWith('{')) {
            try {
              meta = JSON.parse(r.name);
            } catch {
              meta = { title: r.name };
            }
          } else {
            meta = { title: r.name || "Live Coding Room", isPrivate: false };
          }
          return { ...r, meta };
        }).filter((r: any) => !r.meta?.isPrivate && !r.meta?.isLibrary);
        setLiveRooms(parsed);
      }
    } catch (err) {
      console.error("fetchLiveRooms catch:", err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (activeTab === "live") {
      fetchLiveRooms();
    }
  }, [activeTab]);

  const startLiveRoom = async (type: string) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const title = type === 'masterclass' ? "Live Masterclass" : "Co-Working Jam Session";
    
    try {
      const { data, error } = await supabase.from('rooms').insert({
        name: title,
        room_code: code,
        language: "typescript",
        is_active: true,
        type: type,
        created_by: currentUserId || null,
        viewer_count: 1
      }).select().single();

      if (!error && data) {
        router.push(`/room/${data.room_code || code}`);
      } else {
        router.push(`/room/${code}`);
      }
    } catch (err) {
      console.error("Error creating room:", err);
      router.push(`/room/${code}`);
    }
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

  // Realtime subscription for posts and rooms
  useEffect(() => {
    const channel = supabase
      .channel("community_live_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchPosts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        if (activeTab === "live") fetchLiveRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id, content_text, media_url, media_type, created_at, author_id,
          author:users(id, name, avatar_url, is_public),
          likes(id, user_id),
          comments(id, content, created_at, author:users(name, avatar_url))
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch posts error:", error);
      } else if (data) {
        setPosts(data);
      }
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
      fetchPosts();
    } else {
      alert("Error creating post: " + (error?.message || "Check your connection and permissions."));
      console.error("Post error:", error);
    }
    setIsPosting(false);
  };

  const toggleLike = async (postId: string, hasLiked: boolean) => {
    if (!currentUserId) return;
    
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const newLikes = hasLiked 
          ? (p.likes || []).filter((l: any) => l.user_id !== currentUserId)
          : [...(p.likes || []), { user_id: currentUserId }];
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
      
      {/* Tabs */}
      <div className="flex gap-3 border-b border-gray-200 dark:border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab("feed")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === "feed" 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" 
              : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
          }`}
        >
          <MessageSquare size={16} /> Developer Feed
        </button>
        <button 
          onClick={() => setActiveTab("live")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === "live" 
              ? "bg-sky-600 text-white shadow-lg shadow-sky-500/25" 
              : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
          }`}
        >
          <Radio size={16} /> Live Hub {liveRooms.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{liveRooms.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab("requests")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === "requests" 
              ? "bg-pink-600 text-white shadow-lg shadow-pink-500/25" 
              : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
          }`}
        >
          <Users size={16} /> Requests {followRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{followRequests.length}</span>}
        </button>
      </div>

      {/* FEED VIEW */}
      {activeTab === "feed" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Create Post Box */}
          <div className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm transition-colors">
            <div className="flex gap-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm shadow-md">
                You
              </div>
              <textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share a project, snippet, or ask a question to the community..." 
                className="w-full bg-transparent border-none resize-none focus:outline-none text-[15px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 pt-1 min-h-[70px]"
              />
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
              <div className="flex gap-2">
                <button onClick={() => { const url = prompt("Enter video or image URL:"); if (url) setNewPostContent(p => p + "\n" + url); }} className="p-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-full transition-colors cursor-pointer" title="Upload Video/Image">
                  <Video size={18} />
                </button>
                <button onClick={() => { const url = prompt("Enter workspace link:"); if (url) setNewPostContent(p => p + "\n[Workspace Attachment](" + url + ")"); }} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors cursor-pointer" title="Attach Live Workspace">
                  <Folder size={18} />
                </button>
              </div>
              <button 
                onClick={handleCreatePost}
                disabled={isPosting || !newPostContent.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-full transition-colors shadow-md flex items-center gap-1.5"
              >
                <Send size={14} />
                {isPosting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading developer feed...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 p-8">
              <Code2 size={32} className="mx-auto mb-2 opacity-40 text-indigo-500" />
              <p className="font-semibold text-gray-300">No posts yet</p>
              <p className="text-xs text-gray-500 mt-1">Be the first to share a coding update, question, or project with the community!</p>
            </div>
          ) : posts.map(post => {
            const author = Array.isArray(post.author) ? post.author[0] : post.author;
            const hasLiked = (post.likes || []).some((l: any) => l.user_id === currentUserId);
            
            return (
              <div key={post.id} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold overflow-hidden text-sm">
                      {author?.avatar_url ? (
                        <img src={author.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        (author?.name || "U").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                        {author?.name || "Developer"}
                        {!author?.is_public && <span title="Private Profile"><Lock size={12} className="text-gray-400" /></span>}
                      </h4>
                      <span className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {author?.id && author?.id !== currentUserId && (
                      <button onClick={() => handleFollow(author?.id, author?.is_public)} className="px-3 py-1 text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                        Follow
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-[14px] leading-relaxed mb-4 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post.content_text}</p>

                {post.media_type === "image" && post.media_url && (
                  <div className="rounded-xl overflow-hidden mb-4 border border-gray-100 dark:border-white/5 bg-gray-100 dark:bg-black">
                    <img src={post.media_url} alt="Post media" className="w-full h-auto object-cover max-h-[400px]" />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-3 text-gray-500 dark:text-gray-400 text-xs">
                  <div className="flex gap-5">
                    <button onClick={() => toggleLike(post.id, hasLiked)} className={`flex items-center gap-1.5 transition-colors cursor-pointer ${hasLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}>
                      <Heart size={16} fill={hasLiked ? "currentColor" : "none"} /> <span>{post.likes?.length || 0}</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare size={16} /> <span>{post.comments?.length || 0}</span>
                    </div>
                  </div>
                </div>
                
                {/* Comments List */}
                {post.comments && post.comments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 flex flex-col gap-2">
                    {post.comments.map((c: any) => {
                      const cAuthor = Array.isArray(c.author) ? c.author[0] : c.author;
                      return (
                        <div key={c.id} className="flex gap-2 text-xs bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                          <span className="font-bold text-gray-900 dark:text-white shrink-0">{cAuthor?.name || "User"}:</span>
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
                    placeholder="Write a comment..."
                    value={commentText[post.id] || ""}
                    onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handlePostComment(post.id)}
                    className="flex-1 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-indigo-500 rounded-full px-4 py-1.5 text-xs focus:outline-none dark:text-white transition-colors"
                  />
                  <button 
                    onClick={() => handlePostComment(post.id)}
                    disabled={!commentText[post.id]?.trim()}
                    className="p-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full disabled:opacity-30 transition-colors text-xs font-semibold"
                  >
                    Reply
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIVE HUB VIEW (REAL DATA & REAL CREATION) */}
      {activeTab === "live" && (
        <div className="flex flex-col gap-8 animate-fade-in w-full">
          {/* Action cards to start live sessions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div 
              onClick={() => startLiveRoom('masterclass')}
              className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 shadow-xl shadow-indigo-900/20 text-white cursor-pointer hover:-translate-y-1 transition-all border border-indigo-500/50 flex flex-col justify-between"
            >
              <div>
                <div className="bg-white/20 w-11 h-11 rounded-xl flex items-center justify-center mb-3">
                  <PlayCircle size={24} />
                </div>
                <h3 className="text-lg font-black mb-1.5">Start Masterclass</h3>
                <p className="text-indigo-100 text-xs mb-4">Start a 1-to-many broadcast teaching session with synchronized editor, audio, and terminal.</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); startLiveRoom('masterclass'); }}
                className="flex items-center justify-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-xl font-bold text-xs hover:bg-gray-100 transition-colors shadow"
              >
                <Plus size={15} /> Create Masterclass Room
              </button>
            </div>

            <div 
              onClick={() => startLiveRoom('coworking')}
              className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 shadow-xl shadow-emerald-900/20 text-white cursor-pointer hover:-translate-y-1 transition-all border border-emerald-500/50 flex flex-col justify-between"
            >
              <div>
                <div className="bg-white/20 w-11 h-11 rounded-xl flex items-center justify-center mb-3">
                  <Users size={24} />
                </div>
                <h3 className="text-lg font-black mb-1.5">Start Jam Session</h3>
                <p className="text-emerald-100 text-xs mb-4">Open a casual P2P room with pomodoro timer, live voice/video, and collaborative editing.</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); startLiveRoom('coworking'); }}
                className="flex items-center justify-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-xl font-bold text-xs hover:bg-gray-100 transition-colors shadow"
              >
                <Plus size={15} /> Create Jam Session Room
              </button>
            </div>
          </div>

          {/* Active Live Rooms List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black flex items-center gap-2 text-gray-900 dark:text-white">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Active Rooms ({liveRooms.length})
              </h3>
              <button 
                onClick={fetchLiveRooms} 
                className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                ↻ Refresh
              </button>
            </div>
            
            {loadingRooms ? (
              <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading active rooms...</span>
              </div>
            ) : liveRooms.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 p-8">
                <Radio size={36} className="mx-auto mb-2 opacity-30 text-sky-400" />
                <p className="font-semibold text-gray-300">No live rooms active right now</p>
                <p className="text-xs text-gray-500 mt-1 mb-4">Start your own live session above and invite peers to code together!</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => startLiveRoom('masterclass')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                    <Plus size={14} /> New Masterclass
                  </button>
                  <button onClick={() => startLiveRoom('coworking')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                    <Plus size={14} /> New Jam Session
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {liveRooms.map((room) => {
                  const title = room.meta?.title || room.name || "Live Coding Session";
                  const host = room.creator?.name || room.meta?.authorName || "CodeTogether Host";
                  const initial = host.charAt(0).toUpperCase();
                  const tags = Array.isArray(room.tags) && room.tags.length > 0 ? room.tags : [room.language || "TypeScript"];
                  const code = room.room_code || room.id;

                  return (
                    <div 
                      key={room.id} 
                      onClick={() => router.push(`/room/${code}`)}
                      className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden hover:border-sky-500/60 hover:shadow-lg transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-[#1e1e2d] dark:to-[#12121a] relative p-3 flex justify-between items-start">
                          <div className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                            LIVE <Users size={10}/> {room.viewer_count || 1}
                          </div>
                          <div className="bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                            {room.type === 'masterclass' ? "Masterclass" : "Jam Session"}
                          </div>
                        </div>
                        <div className="p-4 relative pt-5">
                          <div className="w-9 h-9 rounded-full bg-white dark:bg-[#1c1c24] border-2 border-gray-100 dark:border-[#151515] absolute -top-4.5 flex items-center justify-center font-bold shadow-sm overflow-hidden text-xs">
                            {room.creator?.avatar_url ? (
                              <img src={room.creator.avatar_url} alt={host} className="w-full h-full object-cover" />
                            ) : (
                              initial
                            )}
                          </div>
                          <h4 className="font-bold text-sm mb-1 group-hover:text-sky-400 transition-colors truncate" title={title}>
                            {title}
                          </h4>
                          <p className="text-xs text-gray-500 mb-3 truncate">Host: {host}</p>
                          <div className="flex flex-wrap gap-1">
                            {tags.map((tag: string) => (
                              <span key={tag} className="text-[10px] bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="p-3 pt-0">
                        <button className="w-full py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          Join Room →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    
      {/* FOLLOW REQUESTS VIEW */}
      {activeTab === "requests" && (
        <div className="flex flex-col gap-6 animate-fade-in w-full max-w-2xl mx-auto">
          <h3 className="text-lg font-black text-gray-900 dark:text-white">Follow Requests</h3>
          {followRequests.length === 0 ? (
            <div className="py-12 text-center text-gray-500 bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10 p-6">
              No pending follow requests.
            </div>
          ) : (
            followRequests.map(req => {
              const follower = Array.isArray(req.follower) ? req.follower[0] : req.follower;
              return (
                <div key={req.follower_id} className="bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold overflow-hidden">
                      {follower?.avatar_url ? (
                        <img src={follower.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        (follower?.name || "U").charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-bold text-sm text-gray-900 dark:text-white">{follower?.name || "Developer"}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAcceptRequest(follower?.id)} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full text-xs transition-colors">Accept</button>
                    <button onClick={() => handleRejectRequest(follower?.id)} className="px-4 py-1.5 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold rounded-full text-xs transition-colors">Delete</button>
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
