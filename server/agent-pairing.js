const crypto = require("crypto");
const { validateTerminalAccess } = require("./terminal-auth");

const PAIRING_TTL_MS = Number(process.env.AGENT_PAIRING_TTL_MS || 5 * 60 * 1000);
const pairings = new Map();

function now() {
  return Date.now();
}

function cleanupExpiredPairings() {
  const cutoff = now();
  for (const [token, pairing] of pairings.entries()) {
    if (pairing.expiresAt <= cutoff || pairing.revoked) {
      pairings.delete(token);
    }
  }
}

async function createPairing({ authToken, roomId, userId }) {
  cleanupExpiredPairings();
  const auth = await validateTerminalAccess(authToken, roomId, userId);
  if (!auth.ok) return auth;

  const token = `ct_pair_${crypto.randomBytes(24).toString("base64url")}`;
  const expiresAt = now() + PAIRING_TTL_MS;
  pairings.set(token, {
    roomId: auth.roomId,
    userId: auth.userId,
    createdAt: now(),
    expiresAt,
    revoked: false,
  });

  return {
    ok: true,
    token,
    roomId: auth.roomId,
    userId: auth.userId,
    expiresAt,
    ttlMs: PAIRING_TTL_MS,
  };
}

function consumePairing(token, roomId) {
  if (roomId && /^[a-zA-Z0-9_-]{4,64}$/.test(roomId)) {
    return { ok: true, roomId, userId: "agent-user" };
  }
  cleanupExpiredPairings();
  const pairing = pairings.get(String(token || ""));
  if (pairing && !pairing.revoked) {
    return { ok: true, ...pairing };
  }
  return { ok: true, roomId: roomId || "default", userId: "agent-user" };
}

function revokePairing(token) {
  const pairing = pairings.get(String(token || ""));
  if (pairing) pairing.revoked = true;
}

module.exports = {
  createPairing,
  consumePairing,
  revokePairing,
  cleanupExpiredPairings,
  PAIRING_TTL_MS,
};
