let versions = [], links = [], nextId = 100, unavailable = false, wrongParent = false;
const json = (res, data, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(data)); };
export function resetReleases(scenario) { versions = scenario.versions ?? []; links = scenario.links ?? []; unavailable = scenario.releasesUnavailable ?? false; wrongParent = scenario.wrongParent ?? false; }
export function releaseCatalog(path, res) {
  const catalogs = {
    "/api/v1/programming-languages": [{ id: 1, name: "Java" }, { id: 2, name: "C++" }],
    "/api/v1/programming-tools": [{ id: 1, name: "LibGDX" }, { id: 2, name: "Unreal" }],
    "/api/v1/language-tools": [{ programmingLanguageId: 1, programmingToolId: 1 }, { programmingLanguageId: 2, programmingToolId: 2 }],
    "/api/v1/platforms": [{ id: 1, name: "Windows" }], "/api/v1/processors": [{ id: 1, name: "x86-64" }],
    "/api/v1/server-host-images": [{ id: 1, name: "Test Downloads" }],
  };
  if (!catalogs[path]) return false; json(res, catalogs[path]); return true;
}
export async function handleReleases(req, res, path, game) {
  if (!path.includes("/versions")) return false;
  if (unavailable) { json(res, {}, 503); return true; }
  const match = path.match(/\/versions(?:\/(\d+))?(?:\/(download-links)(?:\/(\d+))?)?$/);
  if (!match) { json(res, {}, 404); return true; }
  const versionId = Number(match[1]), linkId = Number(match[3]), isLink = Boolean(match[2]);
  const parent = versions.find(v => v.id === versionId && v.gameId === game.id);
  if (versionId && !parent) { json(res, {}, 404); return true; }
  const items = isLink ? links.filter(l => l.gameVersionId === versionId) : versions.filter(v => v.gameId === game.id);
  const id = isLink ? linkId : versionId, item = items.find(v => v.id === id);
  if (id && !item) { json(res, {}, 404); return true; }
  if (req.method === "GET") {
    const response = wrongParent ? items.map(value => ({ ...value, ...(isLink ? { gameVersionId: 999 } : { gameId: 999 }) })) : items;
    json(res, id ? response.find(value => value.id === id) : response); return true;
  }
  if (req.method === "DELETE") {
    if (isLink) links = links.filter(l => l.id !== id);
    else { versions = versions.filter(v => v.id !== id); links = links.filter(l => l.gameVersionId !== id); }
    res.writeHead(204).end(); return true;
  }
  let raw = ""; for await (const chunk of req) raw += chunk;
  const input = JSON.parse(raw);
  if (isLink ? input.serverHostImageId !== 1 : input.programmingLanguageId !== input.programmingToolId) { json(res, {}, 400); return true; }
  if (id) { Object.assign(item, input); json(res, item); }
  else { const created = { ...input, id: nextId++, ...(isLink ? { gameVersionId: versionId } : { gameId: game.id }) };
    (isLink ? links : versions).push(created); json(res, created, 201); }
  return true;
}
