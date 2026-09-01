const fs = require('fs');
let code = fs.readFileSync('src/components/LeftSidebar.tsx', 'utf8');

// Add "chat" to FULLSCREEN_PANELS
code = code.replace(/const FULLSCREEN_PANELS = \["whiteboard", "ai", "notes", "timer"\];/, 'const FULLSCREEN_PANELS = ["whiteboard", "ai", "notes", "timer", "chat"];');

// Insert ChatPanel into fullscreen block
const chatFullscreenNode = `
            {props.activePanel === "chat" && (
              <ChatPanel
                roomId={props.roomId}
                currentUserId={props.currentUserId}
                currentUserName={props.currentUserName}
                members={props.members}
                onNewMessage={props.onNewChatMessage}
                isDocked={true}
              />
            )}
`;
code = code.replace(/\{props\.activePanel === "notes" &&/g, chatFullscreenNode.trim() + '\n            {props.activePanel === "notes" &&');

// Remove ChatPanel from half-screen block
code = code.replace(/<ChatPanel\s+roomId=\{props\.roomId\}[\s\S]*?isDocked=\{props\.activePanel === "chat"\}\s+\/>/g, '');

fs.writeFileSync('src/components/LeftSidebar.tsx', code);
