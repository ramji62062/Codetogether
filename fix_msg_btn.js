const fs = require('fs');
let feed = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');
feed = feed.replace(/<button className="px-3 py-1 text-xs font-bold bg-indigo-100 dark:bg-indigo-500\/20 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-500\/30">\s*Message\s*<\/button>/, '<button onClick={() => alert("Open the Developer Chat widget to send Direct Messages!")} className="px-3 py-1 text-xs font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-500/30">Message</button>');
fs.writeFileSync('src/components/CommunityFeed.tsx', feed);
