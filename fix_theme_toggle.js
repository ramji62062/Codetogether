const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

if (!content.includes('import { useTheme }')) {
  content = content.replace('"use client";', '"use client";\nimport { useTheme } from "next-themes";');
}

if (!content.includes('const { theme, setTheme } = useTheme();')) {
  content = content.replace('const [mounted, setMounted] = useState(false);', 'const [mounted, setMounted] = useState(false);\n  const { theme, setTheme } = useTheme();');
}

// Find the header section with the logo and user profile
const topBarRegex = /<button[\s\S]*?className="flex items-center gap-\[6px\] p-\[6px\] hover:bg-white\/5 rounded-\[8px\] transition-colors"[\s\S]*?onClick=\{\(\) => setActiveTab\("account"\)\}/;
const themeToggle = `
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
            className="flex items-center gap-[6px] p-[6px] hover:bg-white/5 rounded-[8px] transition-colors ml-4 mr-2"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
`;

if (!content.includes('setTheme(theme === "dark" ? "light" : "dark")')) {
  content = content.replace(topBarRegex, themeToggle + '\n          $&');
}

fs.writeFileSync('src/app/dashboard/page.tsx', content);
