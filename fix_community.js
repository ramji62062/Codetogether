const fs = require('fs');

let dashboard = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
if (!dashboard.includes('import CommunityFeed')) {
  dashboard = dashboard.replace('"use client";', '"use client";\nimport CommunityFeed from "@/components/CommunityFeed";');
  fs.writeFileSync('src/app/dashboard/page.tsx', dashboard);
}

let feed = fs.readFileSync('src/components/CommunityFeed.tsx', 'utf8');
feed = feed.replace(/<Lock size=\{12\} className="text-gray-400" title="Private Profile" \/>/g, '<span title="Private Profile"><Lock size={12} className="text-gray-400" /></span>');
fs.writeFileSync('src/components/CommunityFeed.tsx', feed);
