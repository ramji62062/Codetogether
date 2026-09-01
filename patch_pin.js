const fs = require('fs');
let code = fs.readFileSync('src/components/ParticipantsCallPanel.tsx', 'utf8');
code = code.replace(/VolumeX, Trash2, UserPlus, Users, Wifi, WifiOff, GripHorizontal, Move, Minus/g, 'VolumeX, Trash2, UserPlus, Users, Wifi, WifiOff, GripHorizontal, Move, Minus, Pin');
fs.writeFileSync('src/components/ParticipantsCallPanel.tsx', code);
