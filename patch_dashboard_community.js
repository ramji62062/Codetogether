const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// Add import if missing
if (!code.includes('import CommunityFeed')) {
  code = code.replace(/import \{ \n  Folder, LogOut,/g, 'import CommunityFeed from "@/components/CommunityFeed";\nimport { \n  Folder, LogOut,');
}

// Find the start and end of the community tab rendering
const startIndex = code.indexOf('{activeTab === "community" && (');
const nextTabMatch = /\{activeTab === "account" && \(/;
const nextTabMatchObj = code.match(nextTabMatch);
const endIndex = nextTabMatchObj ? nextTabMatchObj.index : -1;

if (startIndex !== -1 && endIndex !== -1) {
  const newCommunityTab = `{activeTab === "community" && (
          <div className="animate-slide-up delay-200">
            {/* The new unified Community Feed & Live Hub Component */}
            <CommunityFeed currentUserId={user?.id || ""} />
          </div>
        )}\n\n        `;
  
  const before = code.slice(0, startIndex);
  const after = code.slice(endIndex);
  
  fs.writeFileSync('src/app/dashboard/page.tsx', before + newCommunityTab + after);
}
