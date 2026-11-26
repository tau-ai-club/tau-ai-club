// Milestone 3 checks for lecture/workshop content (event_content, event_files, the
// private `event-files` bucket). Run by scripts/check-db.mjs after the M2 checks, whose
// personas (alice, bob: members; outsider: not on the allowlist; admin) it reuses.
// Guests and non-members never get members-only sections; drafts are invisible to all
// but admins; only admins write.

const P = {
  admin: { id: "00000000-0000-4000-8000-00000000000a", email: "admin@club.test" },
  alice: { id: "00000000-0000-4000-8000-0000000000a1", email: "alice@club.test" },
  outsider: { id: "00000000-0000-4000-8000-00000000000d", email: "outsider@gmail.test" },
};

export async function runContentChecks(db, check) {
  const as = async (who, sql, params = []) => {
    const claims = who === "guest" ? "" : JSON.stringify({ sub: P[who].id, email: P[who].email, role: "authenticated", aud: "authenticated" });
    await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
    await db.exec(`set role ${who === "guest" ? "anon" : "authenticated"}`);
    try {
      const res = await db.query(sql, params);
      return { rows: res.rows, affected: res.affectedRows ?? 0 };
    } catch (e) {
      return { error: e.message };
    } finally {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claims', '', false)");
    }
  };
  const denied = (r) => Boolean(r.error) || r.affected === 0;

  // ---- the seed ------------------------------------------------------------------
  const seeded = (
    await db.query(`
      select e.slug, c.section::text, c.visibility::text, c.status::text, c.body_he, c.body_en
      from public.event_content c join public.events e on e.id = c.event_id`)
  ).rows;
  const opening = Object.fromEntries(seeded.filter((r) => r.slug === "cohort-02-opening").map((r) => [r.section, r]));
  check(Object.keys(opening).sort().join() === "blurb,goals,summary,takeaways", "seed: the opening lecture has blurb, summary, goals, takeaways");
  check(opening.blurb?.visibility === "public" && Boolean(opening.blurb?.body_en), "seed: the lecture blurb is public, in Hebrew and English");
  check(
    ["summary", "goals", "takeaways"].every((s) => opening[s]?.visibility === "members" && opening[s]?.body_en === null),
    "seed: summary, goals and takeaways are members-only and Hebrew only (no English yet)",
  );
  // The PDF extraction reversed Hebrew word order; the seed must read in order.
  check(
    opening.summary?.body_he.includes("השאלה \"מהי אינטליגנציה?\" אינה שאלה טכנולוגית בלבד") &&
      opening.summary?.body_he.includes("בשנת 1950 הציב אלן טיורינג") &&
      !/אינטליגנציה\s+מהי|טיורינג\s+אלן|יהל\s+שי/.test(seeded.map((r) => r.body_he).join("\n")),
    "seed: the Hebrew text reads in order (no reversed words from the PDF)",
  );
  const prep = seeded.filter((r) => r.section === "prep");
  check(prep.length === 3 && prep.every((r) => r.status === "published" && r.visibility === "members" && r.body_he.includes("Claude Code") && r.body_he.includes("Pro")), "seed: Zero to Hero 1–3 each have a published, members-only prep checklist");
  check(seeded.filter((r) => r.slug.startsWith("zero-to-hero") && r.status === "draft").length === 12, "seed: 4 empty draft sections per workshop, waiting for Oz");

  // ---- guests and non-members: public + published only ---------------------------
  const PUBLIC_SQL = "select c.section::text, c.visibility::text, c.status::text from public.event_content c";
  for (const who of ["guest", "outsider"]) {
    const r = await as(who, PUBLIC_SQL);
    check(!r.error && r.rows.length === 1 && r.rows[0].section === "blurb", `${who}: sees only the one public, published section (got ${r.error ?? r.rows.length})`);
    check(!r.error && r.rows.every((x) => x.visibility === "public" && x.status === "published"), `${who}: never gets a members-only or draft section`);
  }

  // ---- members: every published section, no drafts ----------------------------------
  const m = await as("alice", PUBLIC_SQL);
  check(!m.error && m.rows.length === 7, `member: sees the 7 published sections (got ${m.error ?? m.rows.length})`);
  check(!m.error && m.rows.every((x) => x.status === "published"), "member: drafts are invisible");

  const adminAll = await as("admin", "select count(*)::int as n from public.event_content");
  check(adminAll.rows?.[0]?.n === 19, `admin: sees all 19 sections, drafts included (got ${adminAll.error ?? adminAll.rows?.[0]?.n})`);

  // A published members section and a published public section on a DRAFT event.
  const draftEvent = (await db.query("select id from public.events where slug = 'draft-event'")).rows[0].id;
  await db.query(
    `insert into public.event_content (event_id, section, body_he, visibility, status) values
       ($1, 'summary', 'סוד', 'members', 'published'), ($1, 'blurb', 'סוד', 'public', 'published')`,
    [draftEvent],
  );
  for (const who of ["guest", "outsider", "alice"]) {
    const r = await as(who, "select count(*)::int as n from public.event_content where event_id = $1", [draftEvent]);
    check(r.rows?.[0]?.n === 0, `${who}: content of a draft event stays hidden, even when published`);
  }
  // A section switched back to draft disappears for members at once.
  await db.query("update public.event_content set status = 'draft' where section = 'takeaways'");
  const afterUnpublish = await as("alice", "select count(*)::int as n from public.event_content where section = 'takeaways'");
  check(afterUnpublish.rows?.[0]?.n === 0, "member: an unpublished section is gone right away");
  await db.query("update public.event_content set status = 'published' where section = 'takeaways'");
  // Public → members hides it from guests.
  await db.query("update public.event_content set visibility = 'members' where section = 'blurb'");
  const hiddenBlurb = await as("guest", PUBLIC_SQL);
  check(!hiddenBlurb.error && hiddenBlurb.rows.length === 0, "guest: a section switched to members-only disappears");
  await db.query("update public.event_content set visibility = 'public' where section = 'blurb'");

  // ---- writes: admins only --------------------------------------------------------
  const opener = (await db.query("select id from public.events where slug = 'cohort-02-opening'")).rows[0].id;
  for (const who of ["guest", "outsider", "alice"]) {
    check(denied(await as(who, "update public.event_content set body_he = 'hacked'")), `${who}: cannot edit content`);
    check(denied(await as(who, "delete from public.event_content")), `${who}: cannot delete content`);
    check(
      denied(await as(who, "insert into public.event_content (event_id, section, body_he, visibility, status) values ($1, 'resources', 'x', 'public', 'published')", [opener])),
      `${who}: cannot add content`,
    );
    check(
      denied(await as(who, "insert into public.event_files (event_id, path, title_he, title_en, status) values ($1, 'x/y.pdf', 'x', 'x', 'published')", [opener])),
      `${who}: cannot add files`,
    );
  }
  const adminEdit = await as("admin", "update public.event_content set body_en = 'Takeaways' where section = 'takeaways' returning id");
  check(!adminEdit.error && adminEdit.rows.length === 1, "admin: can edit a section");
  const adminAdd = await as("admin", "insert into public.event_content (event_id, section, body_he) values ($1, 'resources', 'קישורים') returning visibility::text, status::text", [opener]);
  check(adminAdd.rows?.[0]?.visibility === "members" && adminAdd.rows?.[0]?.status === "draft", "admin: a new section starts as a members-only draft");
  const dup = await as("admin", "insert into public.event_content (event_id, section, body_he) values ($1, 'resources', 'x')", [opener]);
  check(Boolean(dup.error), "one row per section per event");

  // ---- files and the private bucket ----------------------------------------------
  const files = (who) => as(who, "select path from public.event_files");
  check(Boolean((await files("guest")).error), "guest: no access to event_files at all");
  check((await files("outsider")).rows?.length === 0, "outsider: sees no files");
  check((await files("alice")).rows?.length === 1, "member: sees the published lecture PDF");

  const pdf = "cohort-02-opening/AI_past_and_future_Shai_Yahal.pdf";
  const bucket = (await db.query("select public from storage.buckets where id = 'event-files'")).rows[0];
  check(bucket?.public === false, "the event-files bucket is private");
  await db.query("insert into public.event_files (event_id, path, title_he, title_en, status) values ($1, 'cohort-02-opening/draft.pdf', 'x', 'x', 'draft')", [opener]);
  await db.query("insert into storage.objects (bucket_id, name) values ('event-files', $1), ('event-files', 'cohort-02-opening/draft.pdf'), ('event-files', 'cohort-02-opening/orphan.pdf')", [pdf]);
  const objects = (who) => as(who, "select name from storage.objects where bucket_id = 'event-files' order by name");
  const om = await objects("alice");
  check(om.rows?.length === 1 && om.rows[0].name === pdf, "member: can read only the published PDF (not drafts or orphans)");
  check((await objects("outsider")).rows?.length === 0, "outsider: cannot read event files");
  check((await objects("guest")).rows?.length === 0 || Boolean((await objects("guest")).error), "guest: cannot read event files");
  check((await objects("admin")).rows?.length === 3, "admin: reads every event file");
  check(
    denied(await as("alice", "insert into storage.objects (bucket_id, name) values ('event-files', 'cohort-02-opening/evil.pdf')")),
    "member: cannot upload event files",
  );
  check(denied(await as("alice", "delete from storage.objects where bucket_id = 'event-files'")), "member: cannot delete event files");
  const adminUp = await as("admin", "insert into storage.objects (bucket_id, name) values ('event-files', 'cohort-02-opening/new.pdf') returning name");
  check(!adminUp.error && adminUp.rows.length === 1, "admin: can upload event files");
  const bad = await as("admin", "insert into public.event_files (event_id, path, title_he, title_en) values ($1, '../etc/passwd', 'x', 'x')", [opener]);
  check(Boolean(bad.error), "event_files.path must be <slug>/<name>.pdf");

  // Unpublishing the file row cuts off the object for members.
  await db.query("update public.event_files set status = 'draft' where path = $1", [pdf]);
  check((await objects("alice")).rows?.length === 0, "member: an unpublished file can't be downloaded any more");
  await db.query("update public.event_files set status = 'published' where path = $1", [pdf]);

  // ---- file category (20261126120000_event_file_category.sql) ----------------------
  const cat = async (path) => (await db.query("select category from public.event_files where path = $1", [path])).rows[0]?.category;
  check((await db.query("select count(*)::int as n from public.event_files where category <> 'summary'")).rows[0].n === 0, "every existing file is a summary (the default)");
  check(await cat(pdf) === "summary", "a PDF added without a category is a summary");
  const toSlides = await as("admin", "update public.event_files set category = 'slides' where path = $1 returning category", [pdf]);
  check(!toSlides.error && toSlides.rows?.[0]?.category === "slides", "admin: can mark a PDF as the lecturer's slides");
  check(!(await as("admin", "update public.event_files set category = 'resources' where path = $1", [pdf])).error && (await cat(pdf)) === "resources", "admin: can mark a PDF as resources");
  check(Boolean((await as("admin", "update public.event_files set category = 'video' where path = $1", [pdf])).error), "category is only summary, slides or resources");
  for (const who of ["alice", "outsider"]) {
    await as(who, "update public.event_files set category = 'summary' where path = $1", [pdf]);
    check((await cat(pdf)) === "resources", `${who}: cannot change a file's category`);
  }
  check(Boolean((await as("guest", "update public.event_files set category = 'summary' where path = $1", [pdf])).error), "guest: cannot change a file's category");
  check((await as("alice", "select category from public.event_files where path = $1", [pdf])).rows?.[0]?.category === "resources", "member: reads the category of a published file");
  check(Boolean((await as("guest", "select category from public.event_files")).error), "guest: still no access to event_files");
  await db.query("update public.event_files set category = 'summary' where path = $1", [pdf]);

  // ---- interactive HTML lessons (20261124000000_event_lessons.sql) ----------------
  const lesson = "cohort-02-opening/how-ai-agents-work.html";
  const addLesson = await as("admin", "insert into public.event_files (event_id, path, title_he, title_en, status) values ($1, $2, 'שיעור', 'Lesson', 'draft') returning kind", [opener, lesson]);
  check(!addLesson.error && addLesson.rows?.[0]?.kind === "lesson", "admin: can add an HTML lesson; its kind is 'lesson'");
  check((await db.query("select kind from public.event_files where path = $1", [pdf])).rows[0]?.kind === "pdf", "a PDF's kind is 'pdf'");
  for (const p of ["cohort-02-opening/x.js", "cohort-02-opening/x.htm", "cohort-02-opening/x.svg", "cohort-02-opening/x.html.js", "../x.html"]) {
    const r = await as("admin", "insert into public.event_files (event_id, path, title_he, title_en) values ($1, $2, 'x', 'x')", [opener, p]);
    check(Boolean(r.error), `event_files.path refuses ${p} (only .pdf and .html)`);
  }
  check(Boolean((await as("admin", "update public.event_files set kind = 'pdf' where path = $1", [lesson])).error), "kind can't be set by hand (generated from the path)");
  check(Boolean((await as("admin", "update public.event_files set category = 'slides' where path = $1", [lesson])).error), "an HTML lesson can't be slides or resources (it's always a game)");
  check(Boolean((await as("admin", "insert into public.event_files (event_id, path, title_he, title_en, category) values ($1, 'cohort-02-opening/x2.html', 'x', 'x', 'resources')", [opener])).error), "a new HTML lesson can't be filed as resources");
  for (const who of ["alice", "outsider"]) {
    check(
      denied(await as(who, "insert into public.event_files (event_id, path, title_he, title_en, status) values ($1, 'cohort-02-opening/evil.html', 'x', 'x', 'published')", [opener])),
      `${who}: cannot add lessons`,
    );
  }
  await db.query("insert into storage.objects (bucket_id, name) values ('event-files', $1)", [lesson]);
  const lessonFor = (who) => as(who, "select name from storage.objects where bucket_id = 'event-files' and name = $1", [lesson]);
  check((await lessonFor("alice")).rows?.length === 0, "member: a draft lesson can't be read");
  check((await as("alice", "select id from public.event_files where path = $1", [lesson])).rows?.length === 0, "member: a draft lesson isn't listed");
  await db.query("update public.event_files set status = 'published' where path = $1", [lesson]);
  check((await lessonFor("alice")).rows?.length === 1, "member: a published lesson can be read");
  check((await lessonFor("outsider")).rows?.length === 0, "outsider: cannot read a published lesson");
  const gl = await lessonFor("guest");
  check(Boolean(gl.error) || gl.rows?.length === 0, "guest: cannot read a published lesson");
  check(Boolean((await as("guest", "select id from public.event_files where kind = 'lesson'")).error), "guest: no access to the lesson rows");
  const mimes = (await db.query("select allowed_mime_types from storage.buckets where id = 'event-files'")).rows[0]?.allowed_mime_types ?? [];
  check(mimes.includes("text/plain") && !mimes.includes("text/html"), "the bucket stores lessons as text/plain, never text/html");
  await db.query("delete from public.event_files where path = $1", [lesson]);
  await db.query("delete from storage.objects where name = $1", [lesson]);
}
