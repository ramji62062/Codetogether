const fs = require('fs');
let content = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');

content = content.replace(
  /\) : posts\.length === 0 \? MOCK_POSTS : posts\)\.map\(post => \{\n\s*posts\.map\(post => \{/g,
  ') : (posts.length === 0 ? MOCK_POSTS : posts).map(post => {'
);

fs.writeFileSync('src/components/CommunityFeed.tsx', content);
