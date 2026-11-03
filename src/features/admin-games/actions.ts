"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mutationSession } from "@/server/auth/session";
import { adminRequest } from "@/server/admin-http";
import { decodeGame } from "@/features/catalog/game";
import { parseId, validateGame, type FormState } from "./contracts";
import { errorMessage, getAdminGame, listGenres } from "./data";

export async function saveGame(_previous: FormState, form: FormData): Promise<FormState> {
  const session = await mutationSession(form);
  if (!session) return { error: "Session expired or invalid request. Sign in again and reload this form." };
  const idValue = form.get("id");
  const id = idValue === "" ? null : parseId(idValue);
  if (idValue !== "" && id === null) return { error: "Invalid game identifier." };
  const { data, fields } = validateGame(form);
  if (Object.keys(fields).length) return { error: "Review the highlighted fields.", fields };
  const genres = await listGenres(session);
  if (!genres.ok) return { error: errorMessage(genres.error) };
  if (data.genreIds.some(value => !genres.data.some(genre => genre.id === value))) return { error: "A selected genre is no longer available. Reload the form." };
  const result = await adminRequest(session, id === null ? "/api/v1/games" : `/api/v1/games/${id}`,
    decodeGame, id === null ? "POST" : "PUT", data);
  if (!result.ok) return { error: errorMessage(result.error) };
  revalidatePath("/admin"); revalidatePath("/");
  redirect(`/admin/${result.data.id}?saved=1`);
}

export async function changePublication(_previous: FormState, form: FormData): Promise<FormState> {
  const session = await mutationSession(form);
  if (!session) return { error: "Session expired or invalid request. Sign in again." };
  const id = parseId(form.get("id"));
  const publicationStatus = form.get("publicationStatus");
  if (id === null || (publicationStatus !== "PUBLISHED" && publicationStatus !== "DRAFT")) return { error: "Invalid publication request." };
  const result = await adminRequest(session, `/api/v1/admin/games/${id}/publication`, decodeGame, "PUT", { publicationStatus });
  if (!result.ok) return { error: errorMessage(result.error) };
  revalidatePath("/admin"); revalidatePath(`/admin/${id}`); revalidatePath("/");
  redirect(`/admin/${id}?saved=1`);
}

export async function deleteGame(_previous: FormState, form: FormData): Promise<FormState> {
  const session = await mutationSession(form);
  if (!session) return { error: "Session expired or invalid request. Sign in again." };
  const id = parseId(form.get("id"));
  if (id === null) return { error: "Invalid game identifier." };
  const game = await getAdminGame(session, id);
  if (!game.ok) return { error: errorMessage(game.error) };
  if (form.get("confirmation") !== game.data.name) return { error: "Type the exact game name to confirm deletion." };
  const result = await adminRequest(session, `/api/v1/games/${id}`, value => value === undefined ? true : null, "DELETE");
  if (!result.ok) return { error: errorMessage(result.error) };
  revalidatePath("/admin"); revalidatePath("/");
  redirect("/admin?deleted=1");
}
