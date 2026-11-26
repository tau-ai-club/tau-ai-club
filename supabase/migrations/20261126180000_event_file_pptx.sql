-- The lecturer's slides may be PowerPoint (.pptx) too (DECISIONS 26.11).
--
-- Lecturers usually send a .pptx. It goes up only as the lecturer's slides, and members only ever
-- download it: the site never opens or renders an Office file. What changes:
--   * event_files.path may also end in .pptx.
--   * Which category fits which file (replaces event_files_category_pdf_only from
--     20261126120000_event_file_category.sql, which is left as applied):
--       .pptx → slides only
--       .pdf  → summary, slides or resources
--       .html → summary in this column (a lesson is a game; nothing reads category for it)
--   * `kind` stays as generated: 'lesson' for .html, 'pdf' for everything else. For a .pptx 'pdf'
--     reads as "a file members download", which is what it is; the app tells the format from the path.
--   * The bucket also accepts the pptx MIME type. Size limit unchanged (10 MB; uploads go through
--     a Server Action capped at 3 MB). The upload action checks it's a real presentation, with no
--     macros, ActiveX or embedded OLE binaries (src/lib/content/pptx.ts).
-- Grants, table RLS and Storage RLS don't change: they key on event_files.path and status, whatever
-- the extension. No personal data.

alter table public.event_files drop constraint if exists event_files_path_check;
alter table public.event_files
  add constraint event_files_path_check
  check (path ~ '^[a-z0-9][a-z0-9-]*/[A-Za-z0-9][A-Za-z0-9._-]*\.(pdf|html|pptx)$');

alter table public.event_files drop constraint if exists event_files_category_pdf_only;
alter table public.event_files
  add constraint event_files_category_by_format
  check (
    case
      when path ~ '\.pptx$' then category = 'slides'
      when path ~ '\.pdf$' then true
      else category = 'summary'
    end
  );

update storage.buckets
  set allowed_mime_types = array[
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
  where id = 'event-files';
