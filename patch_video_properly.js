const fs = require('fs');

const code = fs.readFileSync('src/components/ParticipantsCallPanel.tsx', 'utf8');

const match = code.match(/function VideoTile.*?\n.*?return.*?;/s);
// This regex won't match well.
