const fs = require('fs');
let code = fs.readFileSync('src/app/api/auth/forgot-password/route.ts', 'utf8');
code = code.replace(/    \/\/ Send email using nodemailer with Gmail SMTP[\s\S]*?const smtpPass = process\.env\.SMTP_PASS;/g, '    // Send email using nodemailer with Gmail SMTP');
fs.writeFileSync('src/app/api/auth/forgot-password/route.ts', code);
