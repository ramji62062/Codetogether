const fs = require('fs');
let code = fs.readFileSync('src/app/api/auth/forgot-password/route.ts', 'utf8');

const oldFunc = `function getAppOrigin(request: Request) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? \`https://\${process.env.VERCEL_URL}\` : "");

  if (configuredUrl) {
    return configuredUrl.replace(/\\/+$/, "");
  }

  return new URL(request.url).origin.replace(/\\/+$/, "");
}`;

const newFunc = `function getAppOrigin(request: Request) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? \`https://\${process.env.VERCEL_URL}\` : "");

  if (configuredUrl) {
    return configuredUrl.replace(/\\/+$/, "");
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  
  if (host) {
    return \`\${proto}://\${host}\`;
  }

  return new URL(request.url).origin.replace(/\\/+$/, "");
}`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/app/api/auth/forgot-password/route.ts', code);
