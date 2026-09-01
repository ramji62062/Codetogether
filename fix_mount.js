const fs = require('fs');
let code = fs.readFileSync('src/components/TerminalPanel.tsx', 'utf8');
code = code.replace(
  /const tree: any = {};[\s\S]*?webcontainerRef\.current\.mount\(tree\)\.catch\(console\.error\);/,
  `const tree: any = {};
    for (const f of files) {
      if (!f.isFolder && f.name) {
        const path = f.path || f.name;
        const parts = path.split('/');
        let current = tree;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = { directory: {} };
          current = current[parts[i]].directory;
        }
        current[parts[parts.length - 1]] = { file: { contents: f.content || "" } };
      }
    }
    webcontainerRef.current.mount(tree).catch(console.error);`
);
fs.writeFileSync('src/components/TerminalPanel.tsx', code);
