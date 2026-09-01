const fs = require('fs');
let code = fs.readFileSync('src/components/LeftSidebar.tsx', 'utf8');

// 1. Add "chat" to FULLSCREEN_PANELS
code = code.replace(/const FULLSCREEN_PANELS = \["whiteboard", "ai", "notes", "timer"\];/, 'const FULLSCREEN_PANELS = ["whiteboard", "ai", "notes", "timer", "chat"];');

// 2. Add ChatPanel to fullscreen area
const fullscreenChat = `
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
code = code.replace(/\{props.activePanel === "notes" &&/g, fullscreenChat.trim() + '\n            {props.activePanel === "notes" &&');

// 3. Remove ChatPanel from normal panelContent
code = code.replace(/<ChatPanel\s+roomId=\{props.roomId\}[\s\S]*?isDocked=\{props.activePanel === "chat"\}\s+\/>/, '');

fs.writeFileSync('src/components/LeftSidebar.tsx', code);
