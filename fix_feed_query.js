const fs = require('fs');
let code = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');

// Replace "profiles" with "users"
code = code.replace(/author:profiles!posts_author_id_fkey/g, 'author:users!posts_author_id_fkey');
code = code.replace(/author:profiles!comments_author_id_fkey/g, 'author:users!comments_author_id_fkey');
code = code.replace(/author\?.username/g, 'author?.name'); // they use name not username

fs.writeFileSync('src/components/CommunityFeed.tsx', code);
