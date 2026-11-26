"use client";

import { finishDirectUpload, startDirectUpload } from "@/app/[locale]/admin/content/actions";
import { MAX_DIRECT_BYTES } from "@/lib/content/upload";

/**
 * A PDF or PowerPoint deck (≤ 25 MB) straight from the admin's browser to Storage (see
 * src/lib/content/upload.ts): the server issues a one-time signed URL for a staged object, the
 * browser PUTs the file there, then the server checks it and lists it. Returns the message to show.
 */
export async function directUpload(
  input: { eventId: string; file: File; material: string; title: string },
  msg: { tooBig: string; failed: string; interrupted: string },
  onProgress: (pct: number) => void,
): Promise<{ ok: boolean; message: string }> {
  const { eventId, file, material, title } = input;
  if (file.size > MAX_DIRECT_BYTES) return { ok: false, message: msg.tooBig };
  try {
    const start = await startDirectUpload({ event_id: eventId, name: file.name, size: file.size, material });
    if (!start.ok) return start;
    const put = await putFile(start.url, file, start.contentType, onProgress);
    if (!put) return { ok: false, message: msg.interrupted };
    const done = await finishDirectUpload({ event_id: eventId, staged: start.staged, name: file.name, title, material });
    return done ?? { ok: false, message: msg.failed };
  } catch {
    // A network drop, or a page from an older deployment (its actions no longer exist): try again.
    return { ok: false, message: msg.failed };
  }
}

/** PUT to a Storage signed upload URL, as supabase-js uploadToSignedUrl does, with progress. */
function putFile(url: string, file: File, contentType: string, onProgress: (pct: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    // Our type, not the browser's guess (Windows often has none for .pptx); the bucket checks it.
    x.setRequestHeader("content-type", contentType);
    x.setRequestHeader("x-upsert", "false");
    x.setRequestHeader("cache-control", "max-age=3600");
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (key) x.setRequestHeader("apikey", key);
    x.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    x.onload = () => resolve(x.status >= 200 && x.status < 300);
    x.onerror = () => resolve(false);
    x.onabort = () => resolve(false);
    x.send(file);
  });
}
