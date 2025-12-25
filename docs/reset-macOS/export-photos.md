## The “Clutter Sprint” plan (screenshots + web images first)

### 0) Safety setup (10 minutes)

- **Know what “delete” means**: if you use iCloud Photos, deleting from Photos
  usually removes it everywhere (after Recently Deleted). Export first.
- Create a staging folder in Finder, e.g.:

  - `~/Pictures/Photos-Clutter-Export/`
  - subfolders: `Screenshots/`, `Web-Images/`, `Screen-Recordings/`,
    `To-Review/`

---

## Track A — Do it inside Photos (fast, manual confidence)

### 1) Make Smart Albums to “bucket” clutter

Use Smart Albums to automatically collect items that match rules. Apple’s Smart
Albums are designed for exactly this kind of cleanup. ([Apple Support][3])

Suggested buckets:

- **Screenshots**
- **Screen recordings**
- **PNG/GIF/WEBP (likely web assets)**
- **“No location” + “Not favorite” (often low-value downloads)**

Tip: make a quick “KEEP” system:

- Mark anything you _definitely_ want to keep as **Favorite** before
  mass-export/delete.
- Or move keepers into a “Keep — Not Clutter” album.

---

## Track B — Use `osxphotos` to export _repeatably_ (best for bulk + accuracy)

`osxphotos` can **query your Photos library database and export** subsets
(including screenshots) via CLI. ([GitHub][4])

### 2) Install `osxphotos`

If you have Homebrew + Python already, a clean approach is `pipx`:

```bash
brew install pipx
pipx install osxphotos
```

(You can also install via pip; the project docs cover multiple install options.)
([Rhett Bull][5])

### 3) Export screenshots + screen recordings (the easy wins)

`osxphotos` has built-in filters for these:

- `--screenshot` and `--screen-recording` ([Rhett Bull][6])

Example exports (organized by date folders):

```bash
# Screenshots
osxphotos export "$HOME/Pictures/Photos-Clutter-Export/Screenshots" \
  --screenshot \
  --export-by-date \
  --filename "{original_name}" \
  --report screenshots.json

# Screen recordings
osxphotos export "$HOME/Pictures/Photos-Clutter-Export/Screen-Recordings" \
  --screen-recording \
  --export-by-date \
  --filename "{original_name}" \
  --report screenrecordings.json
```

Notes:

- `--export-by-date` creates a Year/Month/Day folder structure. ([GitHub][4])
- You can also customize folders with
  `--directory "{created.year}/{created.month}"`. ([Rhett Bull][7])

### 4) Export “web images” (best practical approach)

Web images are usually identified by **file type** (PNG/GIF/WEBP) and “no
camera-ish” metadata. `osxphotos` lets you filter by **UTI** (`--uti`).
([Rhett Bull][6])

A practical way:

- Export likely web formats into a separate folder.
- Then review quickly in Finder/Eagle before deleting in Photos.

Example:

```bash
# Likely web images by type (run one or more UTIs you care about)
osxphotos export "$HOME/Pictures/Photos-Clutter-Export/Web-Images" \
  --uti public.png \
  --export-by-date \
  --filename "{original_name}" \
  --report web_png.json
```

If you want to get fancy later, `osxphotos` also supports querying Apple Photos
“labels” (Photos’ on-device classification) via `--label` — useful for things
like “Document”, “Text”, etc., depending on what Photos has indexed.
([Rhett Bull][6])

### macOS 26 note

`osxphotos` documents testing up through macOS Sequoia (15.6). On “macOS 26” it
will _probably_ still work, but treat it as “try and verify”:

- run a small export first
- use `--dry-run` when you’re testing options ([Rhett Bull][7])

---

## 5) Organize exported clutter (Finder + Eagle)

### Finder workflow (simple + durable)

Inside `~/Pictures/Photos-Clutter-Export/`:

- Keep exports **read-only** (your archive).
- Move “keepers” to a separate folder if you plan to re-import later.

### Eagle workflow (great for reference images, UI, inspiration)

Eagle is built for tagging/categorizing lots of “web images / screenshots /
reference”. It’s not open source, but it’s solid for this use case and has a
macOS build. ([Eagle][8])

Suggested approach:

- Import `Web-Images/` and `Screenshots/` into an Eagle library
- Use Eagle tags: `receipt`, `howto`, `inspo`, `meme`, `work`, etc.
- Then you can safely delete those from Photos

---

## 6) Deduplicate the exported clutter (open source)

### Czkawka (recommended)

Czkawka can find **duplicates and similar images/videos**, plus other cleanup
like empty folders/big files. It’s open-source and explicitly positions itself
as privacy-friendly (no internet access). ([GitHub][2])

Use it on:

- `~/Pictures/Photos-Clutter-Export/Web-Images`
- `~/Pictures/Photos-Clutter-Export/Screenshots`

### Optional: dupeGuru

If you want a simpler “duplicate files” sweep (by name/content), dupeGuru is
open-source and runs on macOS. ([GitHub][9])

---

## 7) Delete from Photos (only after export + quick spot-check)

1. In Photos: open the bucket (Screenshots / etc.)
2. Sort by “Recently Added” (or whatever helps)
3. Select all → Delete
4. Empty **Recently Deleted** when you’re confident

---

# Placeholder: “After clutter” (future phases)

Drop these into a note so you have a runway:

1. **Duplicates in real photos**

- Run Czkawka/dupeGuru on _exports_ (or on a non-Photos folder export) to find
  exact + similar duplicates.

2. **Blurry / low-quality sweep**

- Use Photos’ search + filters (or later an AI tool) to flag: blurry, low-res,
  memes, “save from web”.

3. **Burst + near-duplicate cleanup**

- Review bursts and “same moment” series; keep best 1–3, delete the rest.

4. **Metadata cleanup**

- Fix dates/timezones, missing locations, and titles.
- `osxphotos` can help with some metadata workflows (and has power-user
  commands). ([Rhett Bull][6])

5. **Rebuild a clean album structure**

- “People / Family”
- “Trips”
- “Events”
- “Receipts & Docs” (maybe _not_ in Photos long-term — Eagle or a documents app
  often fits better)

6. **Prevent clutter from coming back**

- Decide where screenshots should live long-term:

  - Photos (only curated ones) vs
  - Finder/Eagle (everything else)

---

If you tell me **whether your Photos library is iCloud-enabled** and roughly how
big it is (10k? 100k?), I’ll tailor the exact `osxphotos` commands (and a clean
folder structure) so you can run it like a repeatable “clutter export script.”

[1]: https://sourceforge.net/projects/visipics/?utm_source=chatgpt.com "VisiPics download"
[2]: https://github.com/qarmin/czkawka?utm_source=chatgpt.com "qarmin/czkawka: Multi functional app to find duplicates, ..."
[3]: https://support.apple.com/guide/photos/create-smart-albums-pht6d60ca71/mac?utm_source=chatgpt.com "Create Smart Albums to group photos and videos ..."
[4]: https://github.com/RhetTbull/osxphotos?utm_source=chatgpt.com "RhetTbull/osxphotos"
[5]: https://rhettbull.github.io/osxphotos/index.html?utm_source=chatgpt.com "osxphotos 0.74.2 documentation - GitHub Pages"
[6]: https://rhettbull.github.io/osxphotos/cli.html "OSXPhotos Command Line Interface (CLI) - osxphotos 0.74.2 documentation"
[7]: https://rhettbull.github.io/osxphotos/tutorial.html?utm_source=chatgpt.com "OSXPhotos Tutorial - GitHub Pages"
[8]: https://en.eagle.cool/download?utm_source=chatgpt.com "Download Eagle"
[9]: https://github.com/arsenetar/dupeguru?utm_source=chatgpt.com "arsenetar/dupeguru: Find duplicate files"

---

---

---

Yes — if you’re looking for a **Photos-specific equivalent to tools like
_iMessage-Exporter_ or _Notes-Exporter_** (i.e., something that can **export
your Apple Photos library in bulk with metadata, album info, and more in a
structured, scriptable way**), there **is a real open-source tool that fits that
role**:

---

## 📸 **osxphotos — CLI + Python library for Apple Photos**

🧰 **osxphotos** is the closest thing to a “Photos-Exporter” tool:

- It’s an **open-source command-line tool and Python library** that can read the
  **Apple Photos library database** and export the photos/videos with full
  control. ([GitHub][1])
- You can export **all photos**, filter by **album, keyword, date range, person
  tags, etc.** ([Rhett Bull][2])
- It supports **originals, edited versions, Live Photos, bursts, and video**
  exports. ([GitHub][1])
- You can generate **structured output folders by date, album, country, etc.**
  using templates. ([Rhett Bull][2])
- It can **produce reports**, JSON/CSV output, and even work with ExifTool to
  write metadata back into exported files. ([Rhett Bull][2])
- Works on **macOS (Photos database)** and can even run on **Linux** if you can
  access the Photos library file. ([GitHub][1])

📦 Sample basic export command (after installing via `pip` or pipx):

```bash
osxphotos export /path/to/export --export-by-date
```

This exports everything into date-based folders. ([PyPI][3])

---

## 🧠 Features Worth Highlighting

### ✅ **Bulk export of all photos/videos**

You can export everything in your Apple Photos library — no need to do it one
album at a time. ([GitHub][1])

### ✅ **Preserves metadata**

With built-in options plus integration with ExifTool, osxphotos can preserve
metadata like capture date, GPS, keywords, and faces into exported files if
desired. ([Rhett Bull][2])

### ✅ **Export filtering**

Filter exports by keywords, albums, persons (faces), date ranges, media type,
and more — similar to querying a database. ([GitHub][1])

### ✅ **Flexible output structure**

You choose how folders and filenames are structured using templates — great when
exporting a large library in an organized way. ([Rhett Bull][2])

### ✅ **Scriptable / programmable**

Because it’s both CLI and a Python library, you can build **custom scripts**
that “export Photos like iMessage-Exporter does with messages” for whatever
workflow you want (backups, archive, migrate, dataset creation, etc.).
([GitHub][1])

---

## 🧩 How It Compares

| Feature                   | Apple Photos native export | osxphotos               |
| ------------------------- | -------------------------- | ----------------------- |
| Bulk export               | ✔️ manually selection      | ✔️ automatic/scriptable |
| Metadata preservation     | ⚠️ limited                 | ✔️ rich with options    |
| CLI / automated           | ❌ none                    | ✔️ yes                  |
| Album / tag filtering     | ❌ limited                 | ✔️ yes                  |
| Structured export formats | ❌ minimal                 | ✔️ highly customizable  |
| Library database querying | ❌ no                      | ✔️ yes                  |

---

## 🛠️ Installation / Getting Started

1. **Install via pip / pipx (on macOS or Linux)**

   ```bash
   pip install osxphotos
   ```

   _(or use pipx to keep it isolated)_ ([PyPI][3])

2. **Basic export command**

   ```bash
   osxphotos export /path/to/export
   ```

   Export with date-based folders:

   ````bash
   osxphotos export /path/to/export --export-by-date
   ``` :contentReference[oaicite:13]{index=13}
   ````

3. **Advanced usage**

   - Add `--exiftool` to embed metadata back into exported files
   - Use `--album`, `--keyword`, `--from-date`, etc. for filtering
   - Output reports in CSV/JSON with `--report` ([Rhett Bull][2])

4. **Explore docs**

   ```bash
   osxphotos help
   ```

   for full command reference. ([Rhett Bull][4])

---

## 🏁 Summary

✔ **Yes!** There _is_ a tool similar in spirit to
_iMessage-Exporter/Notes-Exporter_ but for _Apple Photos_: 👉 **osxphotos** — an
open-source CLI + library for exporting, querying, and scripting Apple Photos
exports with full metadata and filtering support. ([GitHub][1])

---

If you want, I can give you **ready-to-run command examples** (e.g., export only
photos from certain albums or with certain metadata, export with sidecar
metadata files, etc.) based on your workflow. Just let me know!

[1]: https://github.com/RhetTbull/osxphotos?utm_source=chatgpt.com "RhetTbull/osxphotos"
[2]: https://rhettbull.github.io/osxphotos/cli.html?utm_source=chatgpt.com "OSXPhotos Command Line Interface (CLI) - GitHub Pages"
[3]: https://pypi.org/project/osxphotos/?utm_source=chatgpt.com "osxphotos"
[4]: https://rhettbull.github.io/osxphotos/overview.html?utm_source=chatgpt.com "osxphotos 0.74.2 documentation - GitHub Pages"
