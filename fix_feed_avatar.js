const fs = require('fs');

let feed = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');
feed = feed.replace(/author:\s*users!posts_author_id_fkey\(id,\s*username,\s*avatar_url,\s*is_public\)/g, 'author:users!posts_author_id_fkey(id, name, avatar_url, is_public)');
feed = feed.replace(/author:\s*users!comments_author_id_fkey\(username,\s*avatar_url\)/g, 'author:users!comments_author_id_fkey(name, avatar_url)');
feed = feed.replace(/author\?.username \|\| "Unknown User"/g, 'author?.name || "Unknown User"');
feed = feed.replace(/author\?.username \|\| "U"/g, 'author?.name || "U"');
feed = feed.replace(/author\?.username \|\| "User"/g, 'author?.name || "User"');

fs.writeFileSync('src/components/CommunityFeed.tsx', feed);
