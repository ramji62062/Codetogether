const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

code = code.replace('const router = useRouter();', 'const router = useRouter();\n  const { theme, setTheme } = useTheme();');

fs.writeFileSync('src/app/dashboard/page.tsx', code);
