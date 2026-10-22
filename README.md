# SharePoint Video Tracker

A tiny Chrome extension that adds **"Opened on ..."** and **"✓ Watched"** labels next to video files in SharePoint / OneDrive file lists, so you can tell at a glance what you've already looked at.

> ⚠️ **100% vibe coded.** This whole thing was written by an AI in a single sitting, with no test suite, no code review, and no formal QA. It works by scraping SharePoint's DOM — the same DOM Microsoft is free to change whenever they want. Treat it as a handy personal tool, not enterprise software. If it breaks after a Microsoft update, that's the vibe tax.

---

## Features

- 📅 **Opened tracking** — the first time you open a video, it gets stamped with the date you opened it (the date never changes after that).
- ✅ **Manual "watched" toggle** — click **Mark watched** to flag a video, click **Unmark** to undo it.
- 🎬 **Works in the player too** — opening a video in SharePoint's `stream.aspx` player shows a floating panel in the bottom-right corner with the same status and toggle.
- 🔄 **Live updates** — a `MutationObserver` plus URL polling keeps the labels correct while SharePoint re-renders the list, navigates folders, or switches into the player.
- 🔒 **Local only** — statuses live in `chrome.storage.local`. No servers, no analytics, no network calls, no account.

Tracked extensions: `.mp4`, `.m4v`, `.mov`, `.mkv`, `.webm`, `.avi`, `.wmv`, `.mpg`, `.mpeg`

---

## Installation

The extension is **not** on the Chrome Web Store. You load it unpacked:

1. Download or clone this repo and keep the `sp-video-tracker` folder somewhere permanent (don't delete it — Chrome reads from that folder every time the browser starts).
2. Open Chrome (or any Chromium browser: Edge, Brave, Vivaldi, Arc...) and go to `chrome://extensions` / `edge://extensions`.
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the `sp-video-tracker` folder — the one containing `manifest.json`.
6. The extension appears with the name **SharePoint Video Tracker**. Make sure it's enabled.

After upgrading files, hit the **↻ reload** button on the extension card and refresh any open SharePoint tabs.

---

## Usage

1. Open a SharePoint document library or OneDrive folder that contains video files.
2. Each video row gets a little status area next to the file name:
   - **Opened on 12 Mar 2025** (orange) — you've opened this before.
   - **✓ Watched** (green, hover for the date) — you marked it as watched.
   - **Mark watched** button — flags the video.
3. Open a video by clicking its file name, double-clicking the row, or pressing <kbd>Enter</kbd> while it's focused. It will be stamped as opened.
4. When you've finished watching, click **Mark watched**. The row's file name also dims slightly so watched items are easier to skip.
5. Changed your mind? Click **Unmark**.

### On the player page

When SharePoint opens the video in its built-in player (`stream.aspx?id=...`), a floating panel appears in the bottom-right corner showing the current status. Use the same button there to mark/unmark, and the change shows up immediately in the file list.

---

## How it works (the short version)

| Piece | What it does |
| --- | --- |
| `manifest.json` | Manifest V3 config. Registers a content script for `https://*.sharepoint.com/*` and requests only the `storage` permission. |
| `content.js` | Everything else: finds file rows, reads the file name, injects the status UI, records "opened" on open gestures, and renders the player panel. |
| `content.css` | Styles for the labels, the button, and the floating player panel. |

**Storage key format:** each video is identified by `<folder-id>\|<file-name>` (both normalized to lowercase), stored in `chrome.storage.local` under `spwVideoState`:

```json
{
  "spwVideoState": {
    "https://contoso.sharepoint.com/sites/media/shared documents|demo.mp4": {
      "opened": "2025-03-12T09:41:07.123Z",
      "watched": "2025-03-12T10:15:44.001Z"
    }
  }
}
```

- Opening is recorded the first time only (`if (s.opened) return;`) — the timestamp is the *first* open, not the latest.
- Navigating into a folder keys videos by the `id` query parameter, so two videos with the same name in different folders don't collide.

---

## Technical specs

- **Manifest version:** 3
- **Permissions:** `storage` (that's it — no `tabs`, no host permissions beyond the content-script match)
- **Content script matches:** `https://*.sharepoint.com/*`
- **Run at:** `document_idle`
- **Storage:** `chrome.storage.local` (per browser profile, *not* synced across devices)
- **Dependencies:** none. No build step, no bundler, no npm packages.
- **Browser support:** Chromium-based browsers (Chrome, Edge, Brave, Vivaldi, Arc). Firefox would need a manifest tweak; Safari, no.

### Repo layout

```
sharepoint-video-tracker/
├── README.md
└── sp-video-tracker/       <- this is the folder you load unpacked
    ├── manifest.json
    ├── content.js
    └── content.css
```

---

## Limitations & known gotchas

- **DOM scraping is fragile.** Row detection relies on SharePoint's `role="row"`, `data-automationid`, `field-LinkFilename`, and `data-id="heroField"` attributes. If Microsoft renames them, labels silently stop appearing.
- **Renaming or moving a video resets its status**, because the key is folder + filename.
- **"Watched" is manual, not automatic.** The extension cannot see the video's playback state, so it never guesses — you tell it.
- **Only `*.sharepoint.com` is matched.** Personal OneDrive (`onedrive.live.com`) and other hosts are out of scope.
- **One profile, one history.** Clearing browsing data or the extension's storage wipes everything. Uninstalling removes it too.
- **Rows are assumed to be classic list rows.** Brand-new SharePoint views / non-standard libraries may not be recognized.
- **No localization.** `Opened on` / `✓ Watched` are hard-coded English, though dates follow your browser locale.

---

## Resetting / removing data

- **Clear all statuses:** open the extension's service worker console (or the SharePoint page console) and run:

  ```js
  chrome.storage.local.remove("spwVideoState");
  ```

  Then refresh the SharePoint tab.
- **Uninstall:** `chrome://extensions` → **Remove**. This deletes its local storage.

---

## Privacy

Everything stays in your browser's local extension storage. The extension makes no network requests, collects no telemetry, and never sends file names or URLs anywhere.

---

## Contributing

It's vibe code, so contributions are welcome and low-ceremony: fork, edit, reload the unpacked extension, refresh a SharePoint tab, and see if it still works. Please keep it dependency-free and Manifest V3.

## License

MIT — do whatever you want with it. No warranty; see the vibe-code warning above.
