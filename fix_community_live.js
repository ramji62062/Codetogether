const fs = require('fs');
let code = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');

const regexLive = /\{MOCK_LIVE_ROOMS\.map\(room => \([\s\S]*?\}\)\}/;

const newLiveUi = `{[]}
              {/* Removed MOCK_LIVE_ROOMS */}`;

code = code.replace(regexLive, newLiveUi);

// Actually, I should just replace the whole grid section with an empty state
code = code.replace(/<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">[\s\S]*?<\/div>\s*<\/div>/, '<div className="py-10 text-center text-gray-500 bg-white dark:bg-[#151515] rounded-xl border border-gray-200 dark:border-white/10">No public live rooms active right now. Start one!</div>\n</div>');

fs.writeFileSync('src/components/CommunityFeed.tsx', code);
