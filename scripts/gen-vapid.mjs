// Генерация VAPID-ключей (ECDSA P-256) в формате base64url для Web Push.
import { generateKeyPairSync } from "node:crypto";

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});

const pubJwk = publicKey.export({ format: "jwk" });
const privJwk = privateKey.export({ format: "jwk" });

// Публичный ключ применения (applicationServerKey): 0x04 || X || Y, base64url.
const x = Buffer.from(pubJwk.x, "base64url");
const y = Buffer.from(pubJwk.y, "base64url");
const pub = Buffer.concat([Buffer.from([0x04]), x, y]);

const d = Buffer.from(privJwk.d, "base64url");

console.log("VAPID_PUBLIC_KEY=" + b64url(pub));
console.log("VAPID_PRIVATE_KEY=" + b64url(d));
