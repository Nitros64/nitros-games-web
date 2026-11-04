import "server-only";
import { revalidatePath } from "next/cache";
import { currentSession, sameOrigin, validCsrf } from "@/server/auth/session";
import { adminRequest } from "@/server/admin-http";
import { backendOrigin } from "@/server/backend";
import { parseId } from "@/features/admin-games/contracts";
import { errorMessage } from "@/features/admin-games/data";
import type { DataError } from "@/server/http";
import { adminMedia } from "./data";
import { MAX_FILE_BYTES, decodeMedia, decodeMediaList, isRecord, mediaPath, metadataValid, positiveId, uploadError } from "./contracts";

const privateHeaders = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" };
function problem(status: number, error: string) { return Response.json({ error }, { status, headers: privateHeaders }); }
function upstreamError(error: DataError) {
  const status = error.kind === "http" && [400, 401, 403, 404, 409, 413, 415, 422].includes(error.status) ? error.status : 502;
  return problem(status, status === 413 ? "The image exceeds 10 MiB or 20 megapixels." : status === 415 ? "The backend rejected the image. Only valid PNG and JPEG content is accepted." : errorMessage(error));
}

// Bound the actual stream, including requests without Content-Length, before parsing multipart.
async function readBody(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer> | Response> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > limit) return problem(413, "The request exceeds the upload limit.");
  if (!request.body) return problem(400, "Missing request body.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); return problem(413, "The request exceeds the upload limit."); }
      chunks.push(value);
    }
  } catch { return problem(400, "The upload was interrupted."); }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function mutateMedia(request: Request, rawId: string) {
  if (!sameOrigin(request.headers.get("origin"))) return problem(403, "Invalid request origin.");
  const session = await currentSession();
  if (!session) return problem(401, "Session expired. Sign in again.");
  if (!validCsrf(session, request.headers.get("x-csrf-token"))) return problem(403, "Invalid request token. Reload the page.");
  const gameId = parseId(rawId); if (!gameId) return problem(400, "Invalid game identifier.");
  // Spring Security authorizes before accepting an expensive multipart body, including for DRAFT.
  const existing = await adminMedia(session, gameId);
  if (!existing.ok) return upstreamError(existing.error);
  const multipart = request.method === "POST";
  const contentType = request.headers.get("content-type") ?? "";
  if (!(multipart ? contentType.startsWith("multipart/form-data;") : contentType.split(";")[0] === "application/json")) return problem(415, "Unsupported request format.");
  const bytes = await readBody(request, multipart ? MAX_FILE_BYTES + 64 * 1024 : 64 * 1024);
  if (bytes instanceof Response) return bytes;
  let result;
  if (multipart) {
    let form: FormData;
    try { form = await new Response(bytes, { headers: { "Content-Type": contentType } }).formData(); }
    catch { return problem(400, "Invalid multipart upload."); }
    if ([...form.keys()].some(key => !["file", "altText", "caption", "operation"].includes(key)) ||
      ["file", "altText", "caption", "operation"].some(key => form.getAll(key).length !== 1)) return problem(400, "Supply one image and its metadata per upload.");
    const file = form.get("file"), altText = form.get("altText"), caption = form.get("caption"), operation = form.get("operation");
    if (!(file instanceof File) || !metadataValid(altText, caption)) return problem(400, "Invalid image or metadata (alt text: 200; caption: 500 characters).");
    const invalid = uploadError(file); if (invalid) return problem(file.size > MAX_FILE_BYTES ? 413 : 415, invalid);
    if (!["cover", "replace-cover", "screenshot"].includes(String(operation))) return problem(400, "Invalid upload operation.");
    const cover = operation !== "screenshot";
    const payload = new FormData(); payload.set("file", file); payload.set("altText", String(altText)); payload.set("caption", String(caption));
    result = await adminRequest(session, `${mediaPath(gameId)}/${cover ? "cover" : "screenshots"}`, value => {
      const item = decodeMedia(value, gameId); return item?.type === (cover ? "COVER" : "SCREENSHOT") ? item : null;
    }, operation === "replace-cover" ? "PUT" : "POST", payload);
  } else {
    let input: unknown;
    try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { return problem(400, "Invalid JSON request."); }
    if (!isRecord(input)) return problem(400, "Invalid media request.");
    if (request.method === "PUT" && input.operation === "order") {
      const ids = input.screenshotIds;
      const screenshots = existing.data.filter(item => item.type === "SCREENSHOT");
      if (!Array.isArray(ids) || !ids.every(positiveId) || new Set(ids).size !== ids.length ||
        ids.length !== screenshots.length || screenshots.some(item => !ids.includes(item.id))) return problem(400, "Include every screenshot exactly once. Reload before reordering.");
      result = await adminRequest(session, `${mediaPath(gameId)}/screenshots/order`, value => decodeMediaList(value, gameId), "PUT", { screenshotIds: ids });
    } else {
      const item = existing.data.find(item => item.id === input.mediaId);
      if (!item) return problem(404, "Image not found. Reload the page.");
      if (request.method === "DELETE") {
        if (input.confirmation !== `DELETE ${item.id}`) return problem(400, "Type the exact confirmation to delete this image.");
        result = await adminRequest(session, `${mediaPath(gameId)}/${item.type === "COVER" ? "cover" : `screenshots/${item.id}`}`, value => value === undefined ? true : null, "DELETE");
      } else if (request.method === "PUT" && input.operation === "metadata" && metadataValid(input.altText, input.caption)) {
        result = await adminRequest(session, `${mediaPath(gameId)}/${item.id}/metadata`, value => {
          const updated = decodeMedia(value, gameId); return updated?.id === item.id ? updated : null;
        }, "PUT", { altText: input.altText, caption: input.caption });
      } else return problem(400, "Invalid metadata (alt text: 200; caption: 500 characters).");
    }
  }
  if (!result.ok) return upstreamError(result.error);
  revalidatePath(`/admin/${gameId}/media`); revalidatePath(`/games/${gameId}`);
  return Response.json({ ok: true }, { headers: privateHeaders });
}

export async function mediaContent(rawId: string, rawMediaId: string, admin: boolean) {
  const gameId = parseId(rawId), mediaId = parseId(rawMediaId);
  if (!gameId || !mediaId) return problem(404, "Image not found.");
  const session = admin ? await currentSession() : null;
  if (admin && !session) return problem(401, "Session expired.");
  const origin = backendOrigin(); if (!origin) return problem(503, "Media service unavailable.");
  try {
    const response = await fetch(new URL(`${mediaPath(gameId, admin)}/${mediaId}/content`, origin), {
      headers: { Accept: "image/png, image/jpeg", ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}) },
      cache: "no-store", credentials: "omit", redirect: "manual", signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) { await response.body?.cancel(); return upstreamError({ kind: "http", status: response.status }); }
    const type = response.headers.get("content-type")?.split(";")[0];
    if (response.status !== 200 || !response.body || (type !== "image/png" && type !== "image/jpeg")) {
      await response.body?.cancel(); return problem(502, "Invalid image response.");
    }
    // No optimizer, conditional headers, storage URLs, bearer tokens or upstream cookies reach the browser.
    return new Response(response.body, { headers: { ...privateHeaders, "Content-Type": type,
      "Content-Disposition": `inline; filename="image.${type === "image/png" ? "png" : "jpg"}"` } });
  } catch { return problem(502, "Media service unavailable."); }
}
