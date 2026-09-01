const fs = require('fs');
let code = fs.readFileSync('src/app/layout.tsx', 'utf8');
code = code.replace(/<html lang="en">/, '<html lang="en" className="dark">');
fs.writeFileSync('src/app/layout.tsx', code);
