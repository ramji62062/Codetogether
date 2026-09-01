const fs = require('fs');
let code = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');

code = code.replace(/<button onClick=\{[^}]*\} className="p-2 text-sky-500/g, '<button className="p-2 text-sky-500');
code = code.replace(/<button onClick=\{[^}]*\} className="p-2 text-indigo-500/g, '<button className="p-2 text-indigo-500');

code = code.replace(/<button className="p-2 text-sky-500[^>]*>([\s\S]*?)<\/button>/, '<button onClick={() => { const url = prompt("Enter video URL:"); if (url) setNewPostContent(p => p + "\\n" + url); }} className="p-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-full transition-colors cursor-pointer" title="Upload Video/Image">$1</button>');
code = code.replace(/<button className="p-2 text-indigo-500[^>]*>([\s\S]*?)<\/button>/, '<button onClick={() => { const url = prompt("Enter workspace link:"); if (url) setNewPostContent(p => p + "\\n[Workspace Attachment](" + url + ")"); }} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors cursor-pointer" title="Attach Live Workspace">$1</button>');

fs.writeFileSync('src/components/CommunityFeed.tsx', code);
