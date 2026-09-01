const fs = require('fs');
let code = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');

// 1. Remove MOCK data arrays completely at the top
code = code.replace(/\/\/\s*---\s*FALLBACK MOCK DATA\s*---[\s\S]*?\];/g, '');

// 2. Fix the posts mapping to not use MOCK_POSTS
code = code.replace(/\) : \(posts\.length === 0 \? MOCK_POSTS : posts\)\.map\(post => \{/g, ') : posts.length === 0 ? (\n<div className="py-10 text-center text-gray-500 bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10">No posts yet. Be the first to share something!</div>\n) : posts.map(post => {');

// 3. Fix the live rooms mapping to not use MOCK_LIVE_ROOMS
code = code.replace(/<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">[\s\S]*?\{MOCK_LIVE_ROOMS\.map\(room => \([\s\S]*?\}\)\}\s*<\/div>/g, '<div className="py-10 text-center text-gray-500 bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10">No public live rooms active right now. Start one!</div>');

// 4. Remove explicit !fkey
code = code.replace(/author:users!posts_author_id_fkey/g, 'author:users');
code = code.replace(/author:users!comments_author_id_fkey/g, 'author:users');

// 5. Add error logging
code = code.replace(/alert\("Error creating post[^"]*"\);/g, 'alert("Database Error: " + (error?.message || "Unknown error creating post. Check Supabase RLS.")); console.error("Post error:", error);');
code = code.replace(/if \(data\) setPosts\(data\);/g, 'if (error) { console.error("Fetch posts error:", error); } else if (data) { setPosts(data); }');

fs.writeFileSync('src/components/CommunityFeed.tsx', code);
