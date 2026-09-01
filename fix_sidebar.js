const fs = require('fs');
let code = fs.readFileSync('src/components/LeftSidebar.tsx', 'utf8');

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

code = code.replace(/\{props.activePanel === "notes" && <TeacherNotes/g, fullscreenChat.trim() + '\n            {props.activePanel === "notes" && <TeacherNotes');

const regex = /<ChatPanel[\s\S]*?isDocked=\{props\.activePanel === "chat"\}\s*\/>/;
code = code.replace(regex, '');

fs.writeFileSync('src/components/LeftSidebar.tsx', code);
