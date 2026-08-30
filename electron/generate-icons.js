#!/usr/bin/env node
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const buildDir = path.join(__dirname, "build-resources");
const iconsetDir = path.join(buildDir, "icon.iconset");

// Create the icon SVG (1024x1024)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e1b4b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22d3ee"/>
      <stop offset="100%" style="stop-color:#818cf8"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>
  <rect x="60" y="60" width="904" height="904" rx="180" fill="none" stroke="url(#accent)" stroke-width="4" opacity="0.3"/>
  <text x="512" y="420" text-anchor="middle" font-family="monospace" font-size="180" font-weight="bold" fill="#22d3ee">&lt;/&gt;</text>
  <text x="512" y="580" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="100" font-weight="bold" fill="#e2e8f0">Code</text>
  <text x="512" y="700" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="100" font-weight="bold" fill="#818cf8">Together</text>
</svg>`;

async function generateIcons() {
  // Ensure directories exist
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
  }

  // Generate 1024x1024 PNG
  const png1024 = path.join(buildDir, "icon_1024x1024.png");
  await sharp(Buffer.from(iconSvg)).resize(1024, 1024).png().toFile(png1024);
  console.log("Created icon_1024x1024.png");

  // Generate all required iconset sizes for macOS .icns
  const sizes = [
    { name: "icon_16x16.png", size: 16 },
    { name: "icon_16x16@2x.png", size: 32 },
    { name: "icon_32x32.png", size: 32 },
    { name: "icon_32x32@2x.png", size: 64 },
    { name: "icon_128x128.png", size: 128 },
    { name: "icon_128x128@2x.png", size: 256 },
    { name: "icon_256x256.png", size: 256 },
    { name: "icon_256x256@2x.png", size: 512 },
    { name: "icon_512x512.png", size: 512 },
    { name: "icon_512x512@2x.png", size: 1024 },
  ];

  for (const { name, size } of sizes) {
    const outPath = path.join(iconsetDir, name);
    await sharp(Buffer.from(iconSvg)).resize(size, size).png().toFile(outPath);
    console.log(`Created ${name} (${size}x${size})`);
  }

  // Generate main icon.png for Linux
  await sharp(Buffer.from(iconSvg)).resize(512, 512).png().toFile(path.join(buildDir, "icon.png"));
  console.log("Created icon.png (512x512, for Linux)");

  // Create .icns using macOS iconutil
  try {
    execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(buildDir, "icon.icns")}"`);
    console.log("Created icon.icns");
  } catch (err) {
    console.error("Failed to create .icns:", err.message);
    console.log("You can create it manually: iconutil -c icns electron/build-resources/icon.iconset -o electron/build-resources/icon.icns");
  }

  // Clean up iconset directory
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  console.log("Cleaned up iconset directory");

  console.log("\nIcon generation complete!");
  console.log("For Windows .ico, use an online converter: https://convertio.co/png-ico/");
  console.log("Or install imagemagick: brew install imagemagick && convert icon_1024x1024.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico");
}

generateIcons().catch(console.error);
