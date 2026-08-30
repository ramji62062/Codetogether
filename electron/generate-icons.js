#!/usr/bin/env node
// Script to generate placeholder icons for development
// Run: node electron/generate-icons.js

const fs = require("fs");
const path = require("path");

const buildResourcesDir = path.join(__dirname, "build-resources");

if (!fs.existsSync(buildResourcesDir)) {
  fs.mkdirSync(buildResourcesDir, { recursive: true });
}

// Create a simple SVG as placeholder
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#0a0a0a"/>
  <rect x="40" y="40" width="432" height="432" rx="60" fill="#1a1a2e"/>
  <rect x="60" y="60" width="392" height="392" rx="40" fill="#16213e"/>
  <text x="256" y="220" text-anchor="middle" font-family="monospace" font-size="64" font-weight="bold" fill="#22d3ee">&lt;/&gt;</text>
  <text x="256" y="320" text-anchor="middle" font-family="monospace" font-size="48" fill="#34d399">Code</text>
  <text x="256" y="380" text-anchor="middle" font-family="monospace" font-size="48" fill="#818cf8">Together</text>
</svg>`;

const svgPath = path.join(buildResourcesDir, "icon.svg");
fs.writeFileSync(svgPath, svgIcon);
console.log(`Created placeholder SVG icon at ${svgPath}`);

// Note: For production builds, you need to provide proper icons
// Mac: icon.icns (1024x1024 recommended)
// Windows: icon.ico (256x256 recommended)
// Linux: icon.png (512x512 recommended)

console.log("\nTo create proper icons for production:");
console.log("1. Create a 1024x1024 PNG of your logo");
console.log("2. Use online tools to convert:");
console.log("   - PNG → ICNS: https://cloudconvert.com/png-to-icns");
console.log("   - PNG → ICO: https://cloudconvert.com/png-to-ico");
console.log("3. Place them in electron/build-resources/");
console.log("   - icon.icns (for Mac)");
console.log("   - icon.ico (for Windows)");
console.log("   - icon.png (for Linux, will be resized automatically)");
