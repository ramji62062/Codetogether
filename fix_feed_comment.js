const fs = require('fs');

let feed = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');
const commentCode = `
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});

  const handlePostComment = async (postId: string) => {
    const text = commentText[postId];
    if (!text?.trim() || !currentUserId) return;
    
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: currentUserId, content: text })
      .select('*, author:users!comments_author_id_fkey(name, avatar_url)')
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
`;

if (!feed.includes('handlePostComment')) {
    feed = feed.replace('const [isPosting, setIsPosting] = useState(false);', 'const [isPosting, setIsPosting] = useState(false);\n' + commentCode);
    
    // Add comment input box UI
    const commentUi = `
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
`;
    feed = feed.replace(/\{\/\* Comments Preview \*\/\}[\s\S]*?(?=<\/div>\s*\);\s*\}\)\s*\)\s*\}\s*<\/div>)/, commentUi);
    fs.writeFileSync('src/components/CommunityFeed.tsx', feed);
}
