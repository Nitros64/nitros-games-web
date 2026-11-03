"use client";

import { useActionState, useState } from "react";
import type { Game } from "@/features/catalog/game";
import type { FormState, Genre } from "./contracts";
import { saveGame, changePublication, deleteGame } from "./actions";

export function GameEditor({ game, genres, csrf }: { game?: Game; genres: Genre[]; csrf: string }) {
  const [values, setValues] = useState({ name: game?.name ?? "", description: game?.description ?? "",
    developerCount: String(game?.developerCount ?? 1), jam: game?.jam ?? false, genreIds: game?.genreIds ?? [] });
  const [state, action, pending] = useActionState<FormState, FormData>(saveGame, {});
  return <form action={action} className="admin-form">
    <input type="hidden" name="csrf" value={csrf} /><input type="hidden" name="id" value={game?.id ?? ""} />
    {state.error && <p role="alert">{state.error}</p>}
    <label htmlFor="game-name">Name (4–30 characters)</label>
    <input id="game-name" name="name" value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} required minLength={4} maxLength={30} aria-invalid={!!state.fields?.name} aria-describedby="name-error" />
    <span id="name-error">{state.fields?.name}</span>
    <label htmlFor="game-description">Description (4–30 characters)</label>
    <textarea id="game-description" name="description" value={values.description} onChange={event => setValues({ ...values, description: event.target.value })} required minLength={4} maxLength={30} aria-invalid={!!state.fields?.description} aria-describedby="description-error" />
    <span id="description-error">{state.fields?.description}</span>
    <label htmlFor="game-developers">Developer count</label>
    <input id="game-developers" name="developerCount" type="number" min={1} max={2147483647} step={1} required value={values.developerCount} onChange={event => setValues({ ...values, developerCount: event.target.value })} aria-invalid={!!state.fields?.developerCount} aria-describedby="developers-error" />
    <span id="developers-error">{state.fields?.developerCount}</span>
    <label className="admin-check"><input type="checkbox" name="jam" checked={values.jam} onChange={event => setValues({ ...values, jam: event.target.checked })} /> Created at a game jam</label>
    <fieldset aria-describedby="genres-error"><legend>Genres — select at least one</legend><div className="admin-genres">
      {genres.map(genre => <label className="admin-check" key={genre.id}><input type="checkbox" name="genreIds" value={genre.id} checked={values.genreIds.includes(genre.id)} onChange={event => setValues({ ...values, genreIds: event.target.checked ? [...values.genreIds, genre.id] : values.genreIds.filter(id => id !== genre.id) })} />{genre.name}</label>)}
    </div></fieldset><span id="genres-error">{state.fields?.genreIds}</span>
    {!game && <p>New games are created as DRAFT.</p>}
    <button type="submit" className="button primary" disabled={pending || !genres.length}>{pending ? "SAVING…" : game ? "SAVE CHANGES" : "CREATE DRAFT"}</button>
  </form>;
}

export function GameOperations({ game, csrf }: { game: Game; csrf: string }) {
  const [publication, publish, publishing] = useActionState<FormState, FormData>(changePublication, {});
  const [deletion, remove, deleting] = useActionState<FormState, FormData>(deleteGame, {});
  return <div className="admin-operations">
    <form action={publish}><input type="hidden" name="csrf" value={csrf} /><input type="hidden" name="id" value={game.id} />
      <input type="hidden" name="publicationStatus" value={game.publicationStatus === "DRAFT" ? "PUBLISHED" : "DRAFT"} />
      {publication.error && <p role="alert">{publication.error}</p>}
      <button disabled={publishing || deleting}>{publishing ? "UPDATING…" : game.publicationStatus === "DRAFT" ? "PUBLISH GAME" : "UNPUBLISH GAME"}</button>
    </form>
    <details><summary>Delete game…</summary><p>This permanently deletes this game and its related data. This cannot be undone.</p>
      <form action={remove} className="admin-form"><input type="hidden" name="csrf" value={csrf} /><input type="hidden" name="id" value={game.id} />
        <label htmlFor="delete-confirmation">Type {game.name} to confirm deletion</label>
        <input id="delete-confirmation" name="confirmation" required autoComplete="off" />
        {deletion.error && <p role="alert">{deletion.error}</p>}
        <button disabled={deleting || publishing}>{deleting ? "DELETING…" : "DELETE PERMANENTLY"}</button>
      </form>
    </details>
  </div>;
}
