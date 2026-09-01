const fs = require('fs');
let content = fs.readFileSync('src/components/ParticipantsCallPanel.tsx', 'utf8');
content = content.replace(/className="pcp-dropdown-item"[^>]*?className="([^"]*)"/g, 'className="pcp-dropdown-item $1"');
fs.writeFileSync('src/components/ParticipantsCallPanel.tsx', content);
