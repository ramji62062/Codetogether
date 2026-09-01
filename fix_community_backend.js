const fs = require('fs');
let code = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');

// 1. Remove MOCK_POSTS fallback
code = code.replace(/\) : \(posts\.length === 0 \? MOCK_POSTS : posts\)\.map\(post => \{/g, ') : posts.length === 0 ? (\n<div className="py-10 text-center text-gray-500 bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10">No posts yet. Be the first to share something!</div>\n) : posts.map(post => {');

// 2. Remove explicit !fkey which often breaks on different Postgres versions / migrations
code = code.replace(/author:users!posts_author_id_fkey/g, 'author:users');
code = code.replace(/author:users!comments_author_id_fkey/g, 'author:users');

// Wait, the follows table has TWO foreign keys to users (follower_id and following_id).
// If we don't specify the fkey, PostgREST will throw an error: "Could not embed because more than one relationship was found"
// The user's Supabase schema might have named it 'follows_follower_id_fkey'. We have to keep it or hope it's correct.
// But let's check fetchFollowRequests
code = code.replace(/follower:users!follows_follower_id_fkey/g, 'follower:users!follows_follower_id_fkey');

// Let's add alert logs to handleCreatePost
code = code.replace(/alert\("Error creating post[^"]*"\);/g, 'alert("Database Error: " + (error?.message || "Unknown error creating post. Check Supabase RLS.")); console.error("Post error:", error);');

// Let's add alert logs to fetchPosts
code = code.replace(/if \(data\) setPosts\(data\);/g, 'if (error) { console.error("Fetch posts error:", error); } else if (data) { setPosts(data); }');

fs.writeFileSync('src/components/CommunityFeed.tsx', code);
