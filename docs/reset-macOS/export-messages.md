## Export macOS Messages (iMessage / SMS / RCS) via Terminal

This guide shows how to export Messages from macOS using a dedicated
command‑line tool installed with Homebrew.

> **Important:** Your terminal app (Terminal, iTerm, etc.) needs **Full Disk
> Access** so it can read `~/Library/Messages/chat.db` and attachments.

### `imessage-exporter` (all‑in‑one exporter)

`imessage-exporter` is a dedicated CLI for exporting iMessage/SMS/RCS with
attachments to HTML or plain text.

#### Install via Homebrew

```bash
brew install imessage-exporter
```

Verify it’s installed:

```bash
imessage-exporter --version
```

#### Grant Full Disk Access

1. Open **System Settings** → **Privacy & Security** → **Full Disk Access**.
2. Turn on access for your terminal app (e.g. **Terminal**, **iTerm**).
3. Quit and re‑open the terminal.

You may also see one‑off macOS prompts asking to allow access to `Messages` or
`Documents` – approve these.

### Export Conversations

#### Export all conversations (default database)

HTML export with web‑friendly attachments (images/videos converted where
needed):

```bash
imessage-exporter -f html -c full
```

Plain‑text export with original attachments copied as‑is:

```bash
imessage-exporter -f txt -c clone
```

Defaults used if not overridden:

- Database: `~/Library/Messages/chat.db`
- Attachments: `~/Library/Messages/Attachments`
- Output directory: `~/imessage_export`

#### Common variations

Export to a custom folder (e.g. Desktop):

```bash
imessage-exporter -f html -c clone -o ~/Desktop/iMessageExport
```

Limit by date range (example: all of 2023):

```bash
imessage-exporter -f txt -o ~/Desktop/iMessage_2023 \
  -s 2023-01-01 -e 2024-01-01 -a macOS
```

Use a copied database + attachments on external storage:

```bash
imessage-exporter -f html -c clone \
  -p /Volumes/External/chat.db \
  -r /Volumes/External/Attachments \
  -o /Volumes/External/export
```

After running, open the output folder in Finder and view the `.html` or `.txt`
files.

Only one contact (phone number or name):

##### "Jack" example:

Export all chats with Jack (1:1 + all group chats he's in):

```bash
# by Jack's phone number
imessage-exporter -f html -c clone -t "15551234567"

# by Jack's contact name (as in Contacts.app)
imessage-exporter -f html -c clone -t "Jack"
```

When you filter by Jack using `-t` (either his number or his name),
**imessage-exporter will export:**

- Jack's **1:1 chat** with you
- **All group chats** that include Jack

in a single run. This is useful if Jack appears in multiple conversations (for
example, a direct chat and 2 different group threads) and you want to grab
_everything involving Jack_ at once.

Export all chats with Jack to a custom output folder:

```bash
# Export to Desktop/Jack_Messages folder
imessage-exporter -f html -c clone -t "Jack" -o ~/Desktop/Jack_Messages
```

```bash
# Export to an external drive
imessage-exporter -f html -c clone -t "Jack" -o /Volumes/Backup/Jack_Export
```

This creates a dedicated folder for Jack's conversations, making it easy to
archive or share just his messages separately from your full export.

##### Multiple contacts example:

Export chats involving multiple people (e.g. family members) and a partial phone
number:

```bash
imessage-exporter -f html -c clone \
  -t "tosifa,8311800,5736773,aisha,ais.ha,aasad,aazad,adnan,rehan,arslan,2614959,razia,6708200,humma,2749448,tealplum,noman,2680969,2749448,8318200,aamna,abdullah,tariq,3660663" \
  -o ~/Desktop/family_iMessages
```

This exports all 1:1 and group conversations that include any of the specified
names or the partial phone number match.

### Other Notes

#### What is a “copied database”?

In this guide, a **copied database** just means a **copy of your Messages
database (`chat.db`) that you have manually moved somewhere else**, for example:

- Copying `~/Library/Messages/chat.db` to an external drive or backup folder
- Restoring `chat.db` from Time Machine or another Mac into a separate directory

When you point `imessage-exporter` at a copied database using `-p` and a custom
attachments folder using `-r`, you are exporting from that backup location
instead of your live Messages database.
