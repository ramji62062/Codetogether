const fs = require('fs');
let code = fs.readFileSync('src/app/api/auth/forgot-password/route.ts', 'utf8');

const newLogic = `
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      // Fallback to Supabase's built-in email service if SMTP is not configured
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });
      if (resetError) {
        console.error("[Forgot Password API] Supabase reset error:", resetError.message);
      }
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    }

    // Generate the recovery link using Supabase Admin API to send via custom SMTP
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: cleanEmail,
      options: { redirectTo },
    });
`;

code = code.replace(/    \/\/ Generate the recovery link[\s\S]*?options: \{\s*redirectTo,\s*\},\s*\}\);/g, newLogic);

fs.writeFileSync('src/app/api/auth/forgot-password/route.ts', code);
