import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, unlink, rename, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { authSettings } from "./config";

export type Session = { kind: "session"; expiresAt: number; accessToken: string; idToken: string; subject: string; csrf: string };
export type Transaction = { kind: "transaction"; expiresAt: number; verifier: string; state: string; nonce: string };
type RecordData = Session | Transaction;
export const newId = () => randomBytes(32).toString("base64url");

function recordPath(id: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(id)) return null;
  return path.join(authSettings().directory, createHash("sha256").update(id).digest("hex") + ".json");
}

function decode(value: unknown): RecordData | null {
  if (typeof value !== "object" || value === null || !("expiresAt" in value) ||
      typeof value.expiresAt !== "number" || !Number.isFinite(value.expiresAt) || !("kind" in value)) return null;
  if (value.kind === "session" && "accessToken" in value && typeof value.accessToken === "string" &&
      "idToken" in value && typeof value.idToken === "string" && "subject" in value && typeof value.subject === "string" &&
      "csrf" in value && typeof value.csrf === "string") return { kind: "session", expiresAt: value.expiresAt,
        accessToken: value.accessToken, idToken: value.idToken, subject: value.subject, csrf: value.csrf };
  if (value.kind === "transaction" && "verifier" in value && typeof value.verifier === "string" &&
      "state" in value && typeof value.state === "string" && "nonce" in value && typeof value.nonce === "string") {
    return { kind: "transaction", expiresAt: value.expiresAt, verifier: value.verifier, state: value.state, nonce: value.nonce };
  }
  return null;
}

/** Opaque cookies reference encrypted, expiring records on a private server volume. */
export async function saveRecord(record: RecordData): Promise<string> {
  const settings = authSettings();
  await mkdir(settings.directory, { recursive: true, mode: 0o700 });
  // Bound retention without background timers; every record lives at most one hour.
  for (const name of await readdir(settings.directory)) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
    const file = path.join(settings.directory, name);
    const info = await stat(file).catch(() => null);
    if (info && Date.now() - info.mtimeMs > 3_600_000) await unlink(file).catch(() => {});
  }
  const id = newId();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", settings.key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(record), "utf8"), cipher.final()]);
  const payload = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
  await writeFile(recordPath(id)!, payload, { flag: "wx", mode: 0o600 });
  return id;
}

export async function deleteRecord(id: string | undefined) {
  const file = id && recordPath(id);
  if (file) await unlink(file).catch((error: unknown) => { if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error; });
}

export async function readRecord(id: string | undefined, consume = false): Promise<RecordData | null> {
  const file = id && recordPath(id);
  if (!file) return null;
  const source = consume ? file + "." + newId() : file;
  try {
    // Atomic rename makes an OIDC transaction single-use, including concurrent callbacks.
    if (consume) await rename(file, source);
    const payload = await readFile(source);
    const decipher = createDecipheriv("aes-256-gcm", authSettings().key, payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    const parsed: unknown = JSON.parse(Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8"));
    const record = decode(parsed);
    if (!record || record.expiresAt <= Date.now()) {
      if (!consume) await deleteRecord(id);
      return null;
    }
    return record;
  } catch { return null; }
  finally { if (consume) await unlink(source).catch(() => {}); }
}
