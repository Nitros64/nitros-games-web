const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
let media = [], nextId = 300, failure = 0;
const content = new Map();
const json = (res, value, status = 200) => { res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store, private" }); res.end(JSON.stringify(value)); };
export function resetMedia(scenario) { media = scenario.media ?? []; nextId = 300; failure = scenario.mediaStatus ?? 0; content.clear(); }
export async function handleMedia(req, res, path, game) {
  const match = path.match(/\/media(?:\/(.*))?$/); if (!match) return false;
  if (failure) { json(res, { detail: "private upstream detail" }, failure); return true; }
  const admin = path.includes("/admin/"), suffix = match[1] ?? "";
  const current = () => media.filter(item => item.gameId === game.id).sort((a, b) => a.position - b.position);
  const dto = item => ({ ...item, contentUrl: `/api/v1/${admin ? "admin/" : ""}games/${game.id}/media/${item.id}/content` });
  if (req.method === "GET") {
    if (!suffix) { json(res, current().map(dto)); return true; }
    const id = Number(suffix.split("/")[0]), item = current().find(item => item.id === id);
    if (!item || suffix !== `${id}/content`) { json(res, {}, 404); return true; }
    res.writeHead(200, { "Content-Type": item.contentType, "Cache-Control": "no-store, private" }); res.end(content.get(id) ?? png); return true;
  }
  if (req.method === "DELETE") {
    const item = current().find(item => suffix === "cover" ? item.type === "COVER" : suffix === `screenshots/${item.id}` && item.type === "SCREENSHOT");
    if (!item) { json(res, {}, 404); return true; }
    media = media.filter(value => value.id !== item.id); content.delete(item.id);
    current().filter(value => value.type === "SCREENSHOT").forEach((item, index) => item.position = index + 1);
    res.writeHead(204).end(); return true;
  }
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  if (suffix === "cover" || suffix === "screenshots") {
    const form = await new Response(bytes, { headers: { "Content-Type": req.headers["content-type"] } }).formData();
    const file = form.get("file"), altText = form.get("altText"), caption = form.get("caption");
    if (!(file instanceof File)) { json(res, {}, 400); return true; }
    if (file.size > 10485760) { json(res, {}, 413); return true; }
    const data = Buffer.from(await file.arrayBuffer());
    if (file.type !== "image/png" || !data.subarray(0, 8).equals(png.subarray(0, 8))) { json(res, {}, 415); return true; }
    if (data.readUInt32BE(16) * data.readUInt32BE(20) > 20000000) { json(res, {}, 413); return true; }
    const cover = current().find(item => item.type === "COVER");
    if (suffix === "cover" && (req.method === "PUT" ? !cover : cover)) { json(res, {}, req.method === "PUT" ? 404 : 409); return true; }
    const item = { id: req.method === "PUT" ? cover.id : nextId++, gameId: game.id, type: suffix === "cover" ? "COVER" : "SCREENSHOT",
      position: suffix === "cover" ? 0 : current().filter(item => item.type === "SCREENSHOT").length + 1,
      altText, caption, contentType: file.type, byteSize: file.size, width: 1, height: 1 };
    media = media.filter(value => value.id !== item.id); media.push(item); content.set(item.id, data);
    json(res, dto(item), req.method === "POST" ? 201 : 200); return true;
  }
  const input = JSON.parse(bytes.toString());
  if (suffix === "screenshots/order") {
    const screenshots = current().filter(item => item.type === "SCREENSHOT");
    if (new Set(input.screenshotIds).size !== screenshots.length || input.screenshotIds.length !== screenshots.length || screenshots.some(item => !input.screenshotIds.includes(item.id))) { json(res, {}, 400); return true; }
    screenshots.forEach(item => item.position = input.screenshotIds.indexOf(item.id) + 1); json(res, current().map(dto)); return true;
  }
  const item = current().find(item => suffix === `${item.id}/metadata`);
  if (!item) { json(res, {}, 404); return true; }
  Object.assign(item, input); json(res, dto(item)); return true;
}
