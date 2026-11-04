"use client";

import { useActionState, useId, useState } from "react";
import { saveVersion, saveDownload, deleteRelease } from "./actions";
import type { Download, Option, ReleaseOptions, ReleaseState, Version } from "./contracts";

function Select({ label, name, options, value, onChange }: { label: string; name: string; options: Option[]; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return <><label htmlFor={id}>{label}</label><select id={id} name={name} required value={value} onChange={event => onChange(event.target.value)}>
    <option value="">Select…</option>{options.map(option => <option value={option.id} key={option.id}>{option.name}</option>)}
  </select></>;
}
function Identity({ gameId, versionId, csrf, linkId }: { gameId: number; versionId?: number; csrf: string; linkId?: number }) {
  return <><input type="hidden" name="gameId" value={gameId} /><input type="hidden" name="versionId" value={versionId ?? ""} />
    <input type="hidden" name="csrf" value={csrf} /><input type="hidden" name="linkId" value={linkId ?? ""} /></>;
}
export function VersionForm({ gameId, version, options, csrf }: { gameId: number; version?: Version; options: ReleaseOptions; csrf: string }) {
  const [state, action, pending] = useActionState<ReleaseState, FormData>(saveVersion, {});
  const [name, setName] = useState(version?.name ?? ""), [language, setLanguage] = useState(String(version?.programmingLanguageId ?? ""));
  const [tool, setTool] = useState(String(version?.programmingToolId ?? "")), [platform, setPlatform] = useState(String(version?.platformId ?? ""));
  const [processor, setProcessor] = useState(String(version?.processorId ?? ""));
  const id = useId();
  const compatible = options.tools.filter(tool => options.pairs.some(pair => pair.programmingLanguageId === Number(language) && pair.programmingToolId === tool.id));
  return <form className="admin-form" action={action} aria-label={version ? "Edit version" : "Create version"}>
    <Identity gameId={gameId} versionId={version?.id} csrf={csrf} />
    <label htmlFor={id}>Version name (4–30 characters)</label><input id={id} name="name" required minLength={4} maxLength={30} value={name} onChange={e => setName(e.target.value)} />
    <Select label="Language" name="programmingLanguageId" options={options.languages} value={language} onChange={value => { setLanguage(value); setTool(""); }} />
    <Select label="Tool" name="programmingToolId" options={compatible} value={tool} onChange={setTool} />
    {language && !compatible.length && <p>No compatible tools available for this language.</p>}
    <Select label="Platform" name="platformId" options={options.platforms} value={platform} onChange={setPlatform} />
    <Select label="Processor" name="processorId" options={options.processors} value={processor} onChange={setProcessor} />
    {state.error && <p role="alert">{state.error}</p>}<button className="button primary" disabled={pending}>{pending ? "SAVING…" : version ? "SAVE VERSION" : "CREATE VERSION"}</button>
  </form>;
}
export function DownloadForm({ gameId, versionId, download, hosts, csrf }: { gameId: number; versionId: number; download?: Download; hosts: Option[]; csrf: string }) {
  const [state, action, pending] = useActionState<ReleaseState, FormData>(saveDownload, {});
  const [link, setLink] = useState(download?.link ?? ""), [host, setHost] = useState(String(download?.serverHostImageId ?? ""));
  const id = useId();
  return <form action={action} className="admin-form" aria-label={download ? `Edit download ${download.id}` : "Create download"}>
    <Identity gameId={gameId} versionId={versionId} linkId={download?.id} csrf={csrf} />
    <label htmlFor={id}>Download URL</label><input id={id} name="link" type="url" required minLength={4} maxLength={100} value={link} onChange={e => setLink(e.target.value)} />
    <Select label="Download server" name="serverHostImageId" options={hosts} value={host} onChange={setHost} />
    {state.error && <p role="alert">{state.error}</p>}<button disabled={pending}>{pending ? "SAVING…" : download ? "SAVE DOWNLOAD" : "CREATE DOWNLOAD"}</button>
  </form>;
}
export function DeleteForm({ gameId, versionId, linkId, confirmation, csrf }: { gameId: number; versionId: number; linkId?: number; confirmation: string; csrf: string }) {
  const [state, action, pending] = useActionState<ReleaseState, FormData>(deleteRelease, {});
  const [value, setValue] = useState(""); const id = useId();
  return <details className="admin-operations"><summary>{linkId ? "Delete download…" : "Delete version…"}</summary>
    <p>This permanently deletes {linkId ? "this link" : "this version and all its download links"}. This cannot be undone.</p>
    <form action={action} className="admin-form"><Identity gameId={gameId} versionId={versionId} linkId={linkId} csrf={csrf} />
      <label htmlFor={id}>Type {confirmation} to confirm deletion</label><input id={id} name="confirmation" required value={value} onChange={e => setValue(e.target.value)} />
      {state.error && <p role="alert">{state.error}</p>}<button disabled={pending}>{pending ? "DELETING…" : "DELETE PERMANENTLY"}</button>
    </form></details>;
}
