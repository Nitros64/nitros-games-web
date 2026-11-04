"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mutationSession } from "@/server/auth/session";
import { adminRequest } from "@/server/admin-http";
import { parseId } from "@/features/admin-games/contracts";
import { errorMessage } from "@/features/admin-games/data";
import { decodeVersion, decodeDownload, safeDownloadUrl, type ReleaseState } from "./contracts";
import { versionPath, version, download, hosts, releaseOptions } from "./data";

function refresh(gameId: number) {
  revalidatePath(`/admin/${gameId}/versions`, "page");
  revalidatePath(`/admin/${gameId}/versions/[versionId]`, "page");
  revalidatePath(`/games/${gameId}`); revalidatePath("/");
}
export async function saveVersion(_state: ReleaseState, form: FormData): Promise<ReleaseState> {
  const session = await mutationSession(form);
  if (!session) return { error: "Session expired or invalid request. Sign in again." };
  const gameId = parseId(form.get("gameId")), versionId = parseId(form.get("versionId"));
  if (!gameId || (form.get("versionId") !== "" && !versionId)) return { error: "Invalid version identifier." };
  const name = String(form.get("name") ?? "").trim();
  const programmingLanguageId = parseId(form.get("programmingLanguageId")), programmingToolId = parseId(form.get("programmingToolId"));
  const platformId = parseId(form.get("platformId")), processorId = parseId(form.get("processorId"));
  if (name.length < 4 || name.length > 30 || !programmingLanguageId || !programmingToolId || !platformId || !processorId)
    return { error: "Use a name of 4–30 characters and select all compatibility fields." };
  const options = await releaseOptions(session);
  if (!options.ok) return { error: errorMessage(options.error) };
  const { languages, tools, platforms, processors, pairs } = options.data;
  if (!languages.some(v => v.id === programmingLanguageId) || !tools.some(v => v.id === programmingToolId) ||
      !platforms.some(v => v.id === platformId) || !processors.some(v => v.id === processorId) ||
      !pairs.some(v => v.programmingLanguageId === programmingLanguageId && v.programmingToolId === programmingToolId))
    return { error: "Invalid or incompatible selection. Reload the available options." };
  const result = await adminRequest(session, versionPath(gameId) + (versionId ? `/${versionId}` : ""), value => {
    const item = decodeVersion(value); return item?.gameId === gameId && (!versionId || item.id === versionId) ? item : null;
  }, versionId ? "PUT" : "POST", { name, programmingLanguageId, programmingToolId, platformId, processorId });
  if (!result.ok) return { error: errorMessage(result.error) };
  refresh(gameId); redirect(`/admin/${gameId}/versions/${result.data.id}`);
}
export async function saveDownload(_state: ReleaseState, form: FormData): Promise<ReleaseState> {
  const session = await mutationSession(form);
  if (!session) return { error: "Session expired or invalid request. Sign in again." };
  const gameId = parseId(form.get("gameId")), versionId = parseId(form.get("versionId")), linkId = parseId(form.get("linkId"));
  const serverHostImageId = parseId(form.get("serverHostImageId")), link = form.get("link");
  if (!gameId || !versionId || (form.get("linkId") !== "" && !linkId)) return { error: "Invalid download identifier." };
  if (!serverHostImageId || !safeDownloadUrl(link)) return { error: "Select a download server and enter an HTTP/HTTPS URL of 4–100 characters without credentials or spaces." };
  const options = await hosts(session);
  if (!options.ok) return { error: errorMessage(options.error) };
  if (!options.data.some(v => v.id === serverHostImageId)) return { error: "Download server is no longer available. Reload the form." };
  const result = await adminRequest(session, `${versionPath(gameId)}/${versionId}/download-links${linkId ? `/${linkId}` : ""}`, value => {
    const item = decodeDownload(value); return item?.gameVersionId === versionId && (!linkId || item.id === linkId) ? item : null;
  }, linkId ? "PUT" : "POST", { link, serverHostImageId });
  if (!result.ok) return { error: errorMessage(result.error) };
  refresh(gameId); redirect(`/admin/${gameId}/versions/${versionId}`);
}
export async function deleteRelease(_state: ReleaseState, form: FormData): Promise<ReleaseState> {
  const session = await mutationSession(form);
  if (!session) return { error: "Session expired or invalid request. Sign in again." };
  const gameId = parseId(form.get("gameId")), versionId = parseId(form.get("versionId")), linkId = parseId(form.get("linkId"));
  if (!gameId || !versionId || (form.get("linkId") !== "" && !linkId)) return { error: "Invalid resource identifier." };
  const target = linkId ? await download(session, gameId, versionId, linkId) : await version(session, gameId, versionId);
  if (!target.ok) return { error: errorMessage(target.error) };
  const expected = "link" in target.data ? target.data.link : target.data.name;
  if (form.get("confirmation") !== expected) return { error: "Type the exact value to confirm deletion." };
  const path = `${versionPath(gameId)}/${versionId}${linkId ? `/download-links/${linkId}` : ""}`;
  const result = await adminRequest(session, path, value => value === undefined ? true : null, "DELETE");
  if (!result.ok) return { error: errorMessage(result.error) };
  refresh(gameId); redirect(`/admin/${gameId}/versions${linkId ? `/${versionId}` : ""}`);
}
