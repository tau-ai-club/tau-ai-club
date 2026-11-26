-- Four kinds of event material (DECISIONS 26.11): summary, game, lecturer's slides, resources.
--
-- `kind` comes from the file extension (pdf | lesson), so a PDF couldn't say whether it is a
-- summary, the lecturer's slides or supporting material. One new column says it:
--   * category: 'summary' (the default), 'slides' or 'resources'.
--   * Only a PDF can be slides or resources; an HTML lesson is always a game (it keeps
--     'summary' here, which nothing reads for lessons).
--   * The default keeps Ido's upload flow and every existing row unchanged: all summaries.
-- Nothing else changes: same grants (admins write through the existing RLS, members only read
-- published rows), same Storage rules. The column holds no personal data.

alter table public.event_files
  add column category text not null default 'summary'
    constraint event_files_category_check check (category in ('summary', 'slides', 'resources')),
  add constraint event_files_category_pdf_only check (category = 'summary' or path ~ '\.pdf$');
