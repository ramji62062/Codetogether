const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

code = code.replace('const { theme, setTheme } = useTheme();', 'const { theme, setTheme } = useTheme();\n  const [mounted, setMounted] = useState(false);\n  useEffect(() => setMounted(true), []);');

code = code.replace(/\{theme === "dark" \? "☀️ Light" : "🌙 Dark"\}/g, '{mounted ? (theme === "dark" ? "☀️ Light" : "🌙 Dark") : "🌓 Theme"}');

fs.writeFileSync('src/app/dashboard/page.tsx', code);
