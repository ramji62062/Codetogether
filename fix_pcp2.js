const fs = require('fs');
let content = fs.readFileSync('src/components/ParticipantsCallPanel.tsx', 'utf8');

// Use a more robust replace loop
let prev = '';
while (prev !== content) {
  prev = content;
  content = content.replace(/className="pcp-dropdown-item"([\s\S]*?)className="([^"]*)"/g, 'className="pcp-dropdown-item $2" $1');
}

fs.writeFileSync('src/components/ParticipantsCallPanel.tsx', content);
