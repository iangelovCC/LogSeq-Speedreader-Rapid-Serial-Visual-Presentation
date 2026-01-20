# Logseq RSVP Speed Reader

A Logseq plugin implementing Rapid Serial Visual Presentation (RSVP) speed‑reading. It is inspired by Reedy-for-Chrome and released under GPL-2.0-only.

## Features
- Adjustable WPM (up to 10,000).
- Start/Pause/Stop controls.
- Keyboard shortcuts (customizable in settings).
- Progress bar.
- Font and color scheme customization.
- Markdown-aware parsing.
- Punctuation-aware pauses.
- Gradual acceleration/deceleration (optional).
- Read selected blocks or the current page.

## Installation (development)
1. Install dependencies:
   - Run `npm install` in the project folder.
2. Build the plugin:
   - Run `npm run build`.
3. In Logseq, open **Plugins** → **Load unpacked plugin** and select this folder.

## Usage
- Use **Command Palette** → “RSVP: Read current page” or “RSVP: Read selected blocks”.
- Use **Slash Command** in the editor: `/RSVP: Read current page`.
- Right-click a block → “RSVP: Read block”.

### Keyboard shortcuts (while reader is open)
Default shortcuts (customizable in settings):
- Start/Pause: Space
- Stop: Escape
- Previous sentence: Left Arrow
- Next sentence: Right Arrow
- Increase WPM: Up Arrow
- Decrease WPM: Down Arrow

## Settings
All settings are available under **Plugins → RSVP Speed Reader**:
- WPM, progress bar, font size/family, color scheme.
- Punctuation pause factors.
- Ramp acceleration/deceleration controls.
- Shortcut key strings (e.g., `Space`, `ArrowUp`, `Escape`).

## Tests
- Run `npm test` to execute unit tests.

## Troubleshooting
- **No words are shown**: Ensure you have a page open or blocks selected.
- **Shortcuts don’t work**: Click inside the Logseq window to focus it, then retry. Confirm shortcuts in plugin settings.
- **Reader is too fast/slow**: Adjust WPM in settings or use Up/Down arrows during reading.
- **Markdown appears in output**: Ensure you are on the latest version; the plugin strips common markdown syntax but complex custom formatting may still show through.

## License
GPL-2.0-only. See [LICENSE](LICENSE).
