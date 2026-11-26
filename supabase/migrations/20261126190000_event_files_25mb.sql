-- Lecturers' decks up to 25 MB (DECISIONS 26.11, user's choice B).
--
-- PDFs and PowerPoint decks now go straight from the admin's browser to Storage with a one-time
-- signed upload URL (the 3 MB Server Action limit no longer applies to them; HTML lessons still go
-- through the Server Action). The flow is in src/lib/content/upload.ts:
--   * an admin-only action issues the signed URL, for a fresh staged object _incoming/<uuid>.<ext>;
--   * the browser uploads there; Storage enforces this bucket's MIME types and this size limit;
--   * an admin-only action then checks the object on the server (name, size, bytes) before storing it
--     under its final name and writing the event_files row; the staged object is removed.
-- Staged objects need no new policy: only admins can write to this bucket (existing policies), and
-- members can read an object only while a published event_files row points at it, which a staged
-- object never has.
--
-- The one change here: the bucket's size limit, 10 MB → 25 MB. Nothing else (MIME types, grants,
-- RLS) changes. No personal data.

update storage.buckets
  set file_size_limit = 26214400
  where id = 'event-files';
