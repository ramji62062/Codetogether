const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
code = code.replace(
  /"border border-white\/25 bg-white\/10 text-white"/g,
  '"border border-white/20 bg-gray-800 text-white shadow-lg"'
);
code = code.replace(
  /"border border-transparent bg-transparent text-\[#666\]"/g,
  '"border border-transparent bg-transparent text-gray-400 hover:text-white hover:bg-white/5"'
);
fs.writeFileSync('src/app/dashboard/page.tsx', code);
