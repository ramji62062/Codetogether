const fs = require('fs');

function convertStylesToTailwind(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // A few safe replacements for Dashboard
  content = content.replace(/style=\{\{ display: "flex", flexDirection: "column", gap: (\d+) \}\}/g, 'className="flex flex-col gap-[$1px]"');
  content = content.replace(/style=\{\{ display: "flex", alignItems: "center", gap: (\d+) \}\}/g, 'className="flex items-center gap-[$1px]"');
  content = content.replace(/style=\{\{ display: "flex", justifyContent: "space-between", alignItems: "center" \}\}/g, 'className="flex justify-between items-center"');
  
  fs.writeFileSync(file, content);
}

convertStylesToTailwind('src/app/dashboard/page.tsx');
