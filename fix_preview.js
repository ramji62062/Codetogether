const fs = require('fs');
let code = fs.readFileSync('src/components/TerminalPanel.tsx', 'utf8');

const oldPreview = /<div key=\{t\.id\} className=\{\`absolute inset-0 bg-white \$\{activeTabId === t\.id \? "block" : "hidden"\}\`\}>\s*<iframe src=\{previewUrl \|\| ""\} className="w-full h-full border-0 bg-white" \/>\s*<\/div>/;

const newPreview = '<div key={t.id} className={`absolute inset-0 flex flex-col bg-white ${activeTabId === t.id ? "flex" : "hidden"}`}>\n' +
'  <div className="h-8 bg-gray-100 dark:bg-[#151515] border-b border-gray-200 dark:border-white/10 flex items-center px-3 justify-between shadow-sm z-10">\n' +
'    <div className="flex items-center gap-2 flex-1 overflow-hidden">\n' +
'      <div className="w-2 h-2 rounded-full bg-green-500"></div>\n' +
'      <span className="text-[11px] text-gray-500 font-mono truncate">{previewUrl || "Waiting for port..."}</span>\n' +
'    </div>\n' +
'    <a href={previewUrl || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors no-underline">\n' +
'      Open in Browser\n' +
'    </a>\n' +
'  </div>\n' +
'  <iframe src={previewUrl || ""} className="flex-1 w-full border-0 bg-white" allow="cross-origin-isolated" />\n' +
'</div>';

code = code.replace(oldPreview, newPreview);

fs.writeFileSync('src/components/TerminalPanel.tsx', code);
