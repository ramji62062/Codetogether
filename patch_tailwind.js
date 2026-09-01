const fs = require('fs');
let code = fs.readFileSync('tailwind.config.ts', 'utf8');
if (!code.includes("darkMode: 'class'")) {
  code = code.replace('const config: Config = {', 'const config: Config = {\n  darkMode: "class",');
  fs.writeFileSync('tailwind.config.ts', code);
}
