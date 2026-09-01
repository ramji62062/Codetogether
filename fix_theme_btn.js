const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

const regex = /<button onClick=\{async \(\) => \{ await supabase\.auth\.signOut\(\);/;

const toggleHtml = `
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-[6px] px-[12px] py-[6px] border border-[#222] bg-transparent text-[#aaa] rounded-[8px] cursor-pointer hover:text-white transition-colors text-[13px]"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
`;

code = code.replace(regex, toggleHtml + '\n          $&');

// Also make sure setTheme is defined
if (!code.includes('const { theme, setTheme } = useTheme();')) {
  code = code.replace('const [mounted, setMounted] = useState(false);', 'const [mounted, setMounted] = useState(false);\n  const { theme, setTheme } = useTheme();');
}

fs.writeFileSync('src/app/dashboard/page.tsx', code);
