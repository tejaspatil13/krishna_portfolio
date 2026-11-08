// Usage: npm run hash-password -- "your-strong-password"
import { randomBytes, scryptSync } from "node:crypto";
const pw = process.argv[2];
if (!pw || pw.length < 10) {
  console.error("Provide a password of at least 10 characters.");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt}:${scryptSync(pw, salt, 64).toString("hex")}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString("hex")}`);
