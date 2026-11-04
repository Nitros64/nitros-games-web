"use client";

import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { imagePath, isRecord, uploadError, type GameMedia } from "./contracts";

type Context = { gameId: number; csrf: string };
async function send(context: Context, method: string, body: FormData | Record<string, unknown>) {
  const multipart = body instanceof FormData;
  try {
    const response = await fetch(`/api/admin/games/${context.gameId}/media`, { method, credentials: "same-origin",
      headers: { "X-CSRF-Token": context.csrf, ...(multipart ? {} : { "Content-Type": "application/json" }) },
      body: multipart ? body : JSON.stringify(body),
    });
    const result: unknown = await response.json();
    if (!response.ok || !isRecord(result) || result.ok !== true)
      return isRecord(result) && typeof result.error === "string" ? result.error : "The operation failed. Reload to check its status before retrying.";
    return null;
  } catch { return "Connection interrupted. Reload to check whether the operation completed before retrying."; }
}

function MetadataFields({ item }: { item?: GameMedia }) {
  const id = useId();
  return <><label htmlFor={`${id}-alt`}>Alt text (up to 200 characters)</label>
    <input id={`${id}-alt`} name="altText" maxLength={200} defaultValue={item?.altText ?? ""} />
    <label htmlFor={`${id}-caption`}>Caption (up to 500 characters)</label>
    <textarea id={`${id}-caption`} name="caption" maxLength={500} defaultValue={item?.caption ?? ""} /></>;
}

function MutationForm({ label, button, children, submit, reset = false }: { label: string; button: string; children: ReactNode; submit: (form: FormData) => Promise<string | null>; reset?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition(); const router = useRouter();
  function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const target = event.currentTarget, form = new FormData(target);
    startTransition(async () => { setError(null); const error = await submit(form); setError(error); if (!error) { if (reset) target.reset(); router.refresh(); } });
  }
  return <form className="admin-form" aria-label={label} onSubmit={handle}>
    <fieldset disabled={pending} style={{ display: "grid", gap: 8 }}>{children}<button disabled={pending}>{pending ? "SAVING…" : button}</button></fieldset>
    {error && <p role="alert">{error}</p>}{pending && <p role="status">Saving changes…</p>}
  </form>;
}

function UploadForm({ context, cover }: { context: Context; cover?: GameMedia }) {
  const [kind, setKind] = useState("screenshot"); const id = useId();
  const [feedback, setFeedback] = useState("");
  return <MutationForm label="Upload images" button="UPLOAD IMAGES" reset submit={async form => {
    const files = form.getAll("file");
    if (!files.length || files.some(file => !(file instanceof File))) return "Choose an image.";
    if (kind === "cover" && files.length !== 1) return "Choose exactly one cover image.";
    for (const file of files) { if (file instanceof File) { const invalid = uploadError(file); if (invalid) return `${file.name}: ${invalid}`; } }
    setFeedback(""); let completed = 0;
    for (const file of files) {
      const payload = new FormData(); payload.set("file", file);
      payload.set("altText", form.get("altText") ?? ""); payload.set("caption", form.get("caption") ?? "");
      payload.set("operation", kind === "cover" ? cover ? "replace-cover" : "cover" : "screenshot");
      const error = await send(context, "POST", payload);
      if (error) return `${completed} image(s) saved before this error. Reload before retrying. ${error}`;
      completed++; setFeedback(`${completed} image(s) uploaded.`);
    }
    return null;
  }}>
    <label htmlFor={`${id}-kind`}>Image type</label><select id={`${id}-kind`} value={kind} onChange={event => setKind(event.target.value)}>
      <option value="screenshot">Screenshots</option><option value="cover">{cover ? "Replace cover" : "Cover"}</option>
    </select>
    <label htmlFor={`${id}-file`}>{kind === "cover" ? "Cover file" : "Screenshot files"}</label>
    <input key={kind} id={`${id}-file`} name="file" type="file" accept="image/png,image/jpeg" multiple={kind === "screenshot"} required />
    <p>PNG/JPEG only. Maximum 10 MiB and 20 megapixels per image. Screenshots upload one at a time; metadata below applies to each selected image.</p>
    {kind === "cover" && cover && <p>Replacing the cover also replaces its alt text and caption with the values below.</p>}
    <MetadataFields key={`metadata-${kind}-${cover?.id ?? "new"}`} item={kind === "cover" ? cover : undefined} />
    {feedback && <p role="status">{feedback}</p>}
  </MutationForm>;
}

export function MediaEditor({ items, gameId, csrf, revision }: Context & { items: GameMedia[]; revision: string }) {
  const context = { gameId, csrf }, cover = items.find(item => item.type === "COVER");
  const screenshots = items.filter(item => item.type === "SCREENSHOT");
  const [orderError, setOrderError] = useState<string | null>(null); const [pending, startTransition] = useTransition(); const router = useRouter();
  function move(index: number, delta: number) {
    const ids = screenshots.map(item => item.id); [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    startTransition(async () => { setOrderError(null); const error = await send(context, "PUT", { operation: "order", screenshotIds: ids }); setOrderError(error); if (!error) router.refresh(); });
  }
  return <>
    <h2>UPLOAD COVER & SCREENSHOTS</h2><UploadForm context={context} cover={cover} />
    {!cover && <p>No cover yet.</p>}{!screenshots.length && <p>No screenshots yet.</p>}
    {orderError && <p role="alert">{orderError}</p>}
    {items.map(item => <section key={`${item.id}-${item.position}-${item.byteSize}-${item.altText}-${item.caption}`} className="release-download" aria-label={item.type === "COVER" ? "Cover" : `Screenshot ${item.position}`}>
      <h2>{item.type === "COVER" ? "COVER" : `SCREENSHOT ${item.position}`}</h2>
      <Image unoptimized src={`${imagePath(gameId, item.id, true)}?revision=${revision}`} alt={item.altText || (item.type === "COVER" ? "Game cover" : `Screenshot ${item.position}`)} width={item.width} height={item.height} style={{ width: "100%", maxWidth: 640, height: "auto" }} />
      <p>{item.width} × {item.height} / {item.contentType}</p>
      <MutationForm label={`Metadata ${item.id}`} button="SAVE METADATA" submit={form => send(context, "PUT", { operation: "metadata", mediaId: item.id, altText: form.get("altText"), caption: form.get("caption") })}>
        <MetadataFields item={item} />
      </MutationForm>
      {item.type === "SCREENSHOT" && <div className="admin-toolbar"><button disabled={pending || item.position === 1} onClick={() => move(item.position - 1, -1)}>MOVE UP</button>
        <button disabled={pending || item.position === screenshots.length} onClick={() => move(item.position - 1, 1)}>MOVE DOWN</button></div>}
      <details><summary>Delete {item.type === "COVER" ? "cover" : "screenshot"}…</summary>
        <p>This permanently deletes this image. This cannot be undone.</p>
        <MutationForm label={`Delete image ${item.id}`} button="DELETE IMAGE" submit={form => send(context, "DELETE", { mediaId: item.id, confirmation: form.get("confirmation") })}>
          <label htmlFor={`delete-media-${item.id}`}>Type DELETE {item.id} to confirm</label><input id={`delete-media-${item.id}`} name="confirmation" required autoComplete="off" />
        </MutationForm>
      </details>
    </section>)}
  </>;
}
