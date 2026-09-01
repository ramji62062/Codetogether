import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import nodemailer from "nodemailer";

function getAppOrigin(request: Request) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  
  if (host) {
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin.replace(/\/+$/, "");
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const redirectTo = `${getAppOrigin(request)}/reset-password`;


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


    if (error) {
      console.error("[Forgot Password API] generateLink error:", error.message);
      // Don't reveal if email exists or not
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    }

    // Extract the action link from the response
    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      console.error("[Forgot Password API] No action_link in response");
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    }

    // Send email using nodemailer with Gmail SMTP

    if (!smtpUser || !smtpPass) {
      console.error("[Forgot Password API] SMTP_USER or SMTP_PASS not configured.");
      return NextResponse.json({ error: "Email service not configured." }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"CodeTogether" <${smtpUser}>`,
      to: cleanEmail,
      subject: "Reset Your CodeTogether Password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #ffffff; background: #111; padding: 20px; border-radius: 16px; display: inline-block;">
              &lt;/&gt; CodeTogether
            </h1>
          </div>
          <h2 style="color: #333; margin-bottom: 8px;">Reset your password</h2>
          <p style="color: #666; font-size: 15px; line-height: 1.6;">
            We received a request to reset the password for your account. Click the button below to set a new password:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${actionLink}" 
               style="background: #000; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px; display: inline-block;">
              Reset Password →
            </a>
          </div>
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #bbb; font-size: 12px;">
            If the button doesn't work, copy and paste this link:<br/>
            <a href="${actionLink}" style="color: #666; word-break: break-all;">${actionLink}</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (err) {
    console.error("[Forgot Password API] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
