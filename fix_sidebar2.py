import re

with open('src/components/LeftSidebar.tsx', 'r') as f:
    content = f.read()

# Add chat to FULLSCREEN_PANELS
content = re.sub(
    r'const FULLSCREEN_PANELS = \["whiteboard", "ai", "notes", "timer"\];',
    'const FULLSCREEN_PANELS = ["whiteboard", "ai", "notes", "timer", "chat"];',
    content
)

# Remove the old ChatPanel carefully FIRST
pattern = r'<ChatPanel\s+roomId=\{props\.roomId\}[\s\S]*?isDocked=\{props\.activePanel === "chat"\}\s*/>'
content = re.sub(pattern, '', content)

# Then insert new one
chat_node = """
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
"""

content = content.replace('{props.activePanel === "notes" &&', chat_node.strip() + '\n            {props.activePanel === "notes" &&')

with open('src/components/LeftSidebar.tsx', 'w') as f:
    f.write(content)

