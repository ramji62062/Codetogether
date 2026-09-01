const path = require("path");

/**
 * Notarize the Mac app after signing when Apple credentials are present.
 * Without Developer ID + notarization, downloaded apps are blocked by Gatekeeper.
 */
exports.default = async function notarizeMacApp(context) {
  if (context.electronPlatformName !== "darwin") return;

  const hasApiKey =
    process.env.APPLE_API_KEY &&
    process.env.APPLE_API_KEY_ID &&
    process.env.APPLE_API_ISSUER;
  const hasAppleId =
    process.env.APPLE_ID &&
    process.env.APPLE_APP_SPECIFIC_PASSWORD &&
    process.env.APPLE_TEAM_ID;

  if (!hasApiKey && !hasAppleId) {
    console.log(
      "[notarize] Skipping. Set Apple Developer ID credentials (APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID or APPLE_API_KEY*) so downloaded users are not blocked by Gatekeeper."
    );
    return;
  }

  const { notarize } = require("@electron/notarize");
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`[notarize] Submitting ${appPath} to Apple...`);

  const opts = {
    appPath,
    appBundleId: "com.ramji.codetogether",
    teamId: process.env.APPLE_TEAM_ID,
  };

  if (hasApiKey) {
    opts.appleApiKey = process.env.APPLE_API_KEY;
    opts.appleApiKeyId = process.env.APPLE_API_KEY_ID;
    opts.appleApiIssuer = process.env.APPLE_API_ISSUER;
  } else {
    opts.appleId = process.env.APPLE_ID;
    opts.appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  }

  await notarize(opts);
  console.log("[notarize] Stapled notarization ticket.");
};
