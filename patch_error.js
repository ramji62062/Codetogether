const fs = require('fs');
let code = fs.readFileSync('src/components/ParticipantsCallPanel.tsx', 'utf8');
code = code.replace(/pc\.addTrack\(screenTrack, localStreamRef\.current\)/g, 'pc.addTrack(screenTrack, localStreamRef.current!)');
fs.writeFileSync('src/components/ParticipantsCallPanel.tsx', code);
