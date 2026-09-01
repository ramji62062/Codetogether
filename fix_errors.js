const fs = require('fs');

// Fix dashboard
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
code = code.replace(/className="animate-slide-up delay-200" className="flex flex-col gap-\[20px\]"/g, 'className="animate-slide-up delay-200 flex flex-col gap-[20px]"');
fs.writeFileSync('src/app/dashboard/page.tsx', code);

// Fix feed
let feed = fs.readFileSync('src/app/feed/page.tsx', 'utf8');
feed = feed.replace(/<Lock size=\{12\} className="text-gray-400" title="Private Profile" \/>/g, '<span title="Private Profile"><Lock size={12} className="text-gray-400" /></span>');
fs.writeFileSync('src/app/feed/page.tsx', feed);
