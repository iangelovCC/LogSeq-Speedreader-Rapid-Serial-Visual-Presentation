import "@logseq/libs";
import type { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

type ThemeMode = "auto" | "light" | "dark";
type PunctuationMode = "none" | "light" | "strong";

interface PluginSettings {
  wpm: number;
  maxWpm: number;
  fontSize: number;
  fontFamily: string;
  theme: ThemeMode;
  showProgressBar: boolean;
  punctuationMode: PunctuationMode;
  accelerationWords: number;
  keyToggle: string;
  keyStop: string;
  keyPrevSentence: string;
  keyNextSentence: string;
  keyIncreaseWpm: string;
  keyDecreaseWpm: string;
}

const SETTINGS_SCHEMA: SettingSchemaDesc[] = [
  {
    key: "wpm",
    type: "number",
    title: "Default WPM",
    description: "Initial reading speed in words per minute",
    default: 350,
  },
  {
    key: "maxWpm",
    type: "number",
    title: "Maximum WPM",
    description: "Upper WPM limit (max 10000)",
    default: 10000,
  },
  {
    key: "fontSize",
    type: "number",
    title: "Font size",
    description: "Word display font size in pixels",
    default: 56,
  },
  {
    key: "fontFamily",
    type: "string",
    title: "Font family",
    description: "CSS font-family used in reader overlay",
    default: "Inter, Segoe UI, Roboto, sans-serif",
  },
  {
    key: "theme",
    type: "enum",
    title: "Theme",
    description: "Reader color scheme",
    enumChoices: ["auto", "light", "dark"],
    enumPicker: "select",
    default: "auto",
  },
  {
    key: "showProgressBar",
    type: "boolean",
    title: "Show progress bar",
    description: "Displays reading progress at the bottom",
    default: true,
  },
  {
    key: "punctuationMode",
    type: "enum",
    title: "Punctuation pauses",
    description: "Adds extra delay after punctuation",
    enumChoices: ["none", "light", "strong"],
    enumPicker: "select",
    default: "light",
  },
  {
    key: "accelerationWords",
    type: "number",
    title: "Acceleration words",
    description: "Words used to ramp start/end speed (0 disables)",
    default: 8,
  },
  {
    key: "keyToggle",
    type: "string",
    title: "Toggle key (start/pause/resume)",
    description: "Keyboard key value, e.g. Space",
    default: "Space",
  },
  {
    key: "keyStop",
    type: "string",
    title: "Stop key",
    description: "Keyboard key value, e.g. Escape",
    default: "Escape",
  },
  {
    key: "keyPrevSentence",
    type: "string",
    title: "Back to previous sentence key",
    description: "Keyboard key value, e.g. ArrowLeft",
    default: "ArrowLeft",
  },
  {
    key: "keyNextSentence",
    type: "string",
    title: "Forward to next sentence key",
    description: "Keyboard key value, e.g. ArrowRight",
    default: "ArrowRight",
  },
  {
    key: "keyIncreaseWpm",
    type: "string",
    title: "Increase WPM key",
    description: "Keyboard key value, e.g. ArrowUp",
    default: "ArrowUp",
  },
  {
    key: "keyDecreaseWpm",
    type: "string",
    title: "Decrease WPM key",
    description: "Keyboard key value, e.g. ArrowDown",
    default: "ArrowDown",
  },
];

const DEFAULT_SETTINGS: PluginSettings = {
  wpm: 350,
  maxWpm: 10000,
  fontSize: 56,
  fontFamily: "Inter, Segoe UI, Roboto, sans-serif",
  theme: "auto",
  showProgressBar: true,
  punctuationMode: "light",
  accelerationWords: 8,
  keyToggle: "Space",
  keyStop: "Escape",
  keyPrevSentence: "ArrowLeft",
  keyNextSentence: "ArrowRight",
  keyIncreaseWpm: "ArrowUp",
  keyDecreaseWpm: "ArrowDown",
};

class RSVPPlayer {
  private words: string[] = [];
  private index = 0;
  private running = false;
  private timer: number | null = null;
  private overlay: HTMLDivElement;
  private wordEl: HTMLDivElement;
  private infoEl: HTMLDivElement;
  private progressEl: HTMLDivElement;
  private controlsEl: HTMLDivElement;
  private wpm = DEFAULT_SETTINGS.wpm;
  private settings = DEFAULT_SETTINGS;
  private sentenceStarts: number[] = [0];

  constructor() {
    this.overlay = document.createElement("div");
    this.wordEl = document.createElement("div");
    this.infoEl = document.createElement("div");
    this.progressEl = document.createElement("div");
    this.controlsEl = document.createElement("div");
    this.buildUI();
    window.addEventListener("keydown", this.onKeyDown, true);
  }

  updateSettings(newSettings: PluginSettings) {
    this.settings = newSettings;
    this.wpm = clamp(this.wpm, 50, this.maxWpm());
    this.applyTheme();
    this.wordEl.style.fontSize = `${clamp(newSettings.fontSize, 16, 220)}px`;
    this.wordEl.style.fontFamily = newSettings.fontFamily;
    this.progressEl.style.display = newSettings.showProgressBar ? "block" : "none";
    this.updateUI();
  }

  startText(rawText: string) {
    const cleanText = normalizeText(rawText);
    const words = splitWords(cleanText);
    if (!words.length) {
      logseq.UI.showMsg("No readable text found.", "warning");
      return;
    }
    this.words = words;
    this.sentenceStarts = findSentenceStarts(words);
    this.index = 0;
    this.running = true;
    this.wpm = clamp(readNumberSetting("wpm", DEFAULT_SETTINGS.wpm), 50, this.maxWpm());
    this.show();
    this.tick();
  }

  pauseToggle() {
    if (!this.words.length) return;
    this.running = !this.running;
    if (this.running) {
      this.tick();
    } else {
      this.clearTimer();
      this.updateUI();
    }
  }

  stop() {
    this.running = false;
    this.words = [];
    this.index = 0;
    this.clearTimer();
    this.hide();
  }

  private jumpSentence(direction: "prev" | "next") {
    if (!this.words.length) return;
    const current = this.index;
    if (direction === "prev") {
      let candidate = 0;
      for (const start of this.sentenceStarts) {
        if (start < current) candidate = start;
        else break;
      }
      this.index = candidate;
    } else {
      const next = this.sentenceStarts.find((start) => start > current);
      if (typeof next === "number") {
        this.index = next;
      }
    }
    this.updateUI();
  }

  private adjustWpm(delta: number) {
    this.wpm = clamp(this.wpm + delta, 50, this.maxWpm());
    this.updateUI();
  }

  private maxWpm() {
    return clamp(readNumberSetting("maxWpm", DEFAULT_SETTINGS.maxWpm), 100, 10000);
  }

  private tick() {
    this.clearTimer();
    if (!this.running || this.index >= this.words.length) {
      if (this.index >= this.words.length) {
        this.stop();
      }
      return;
    }

    this.updateUI();
    const word = this.words[this.index] ?? "";
    const delay = this.computeDelay(word);
    this.index += 1;
    this.timer = window.setTimeout(() => this.tick(), delay);
  }

  private computeDelay(word: string) {
    const base = 60000 / this.wpm;
    const punctuationFactor = getPunctuationFactor(word, this.settings.punctuationMode);

    const accelerationWords = clamp(
      readNumberSetting("accelerationWords", DEFAULT_SETTINGS.accelerationWords),
      0,
      Math.max(0, Math.floor(this.words.length / 2)),
    );

    let rampFactor = 1;
    if (accelerationWords > 0) {
      const fromStart = this.index;
      const fromEnd = this.words.length - this.index - 1;
      if (fromStart < accelerationWords) {
        rampFactor = 1.8 - (fromStart / accelerationWords) * 0.8;
      } else if (fromEnd < accelerationWords) {
        rampFactor = 1.8 - (fromEnd / accelerationWords) * 0.8;
      }
    }

    return Math.max(15, Math.round(base * punctuationFactor * rampFactor));
  }

  private buildUI() {
    this.overlay.id = "logseq-rsvp-overlay";
    this.overlay.style.cssText = [
      "position: fixed",
      "inset: 0",
      "display: none",
      "z-index: 9999",
      "align-items: center",
      "justify-content: center",
      "flex-direction: column",
      "padding: 24px",
      "user-select: none",
    ].join(";");

    this.wordEl.style.cssText = [
      "font-weight: 700",
      "line-height: 1.2",
      "text-align: center",
      "max-width: min(90vw, 1000px)",
      "word-break: break-word",
      "margin-bottom: 18px",
      "letter-spacing: 0.02em",
    ].join(";");

    this.infoEl.style.cssText = "font-size: 14px; opacity: .9; margin-bottom: 12px";

    this.progressEl.style.cssText = [
      "height: 4px",
      "width: min(90vw, 960px)",
      "border-radius: 99px",
      "overflow: hidden",
      "position: relative",
      "margin-bottom: 12px",
    ].join(";");

    const progressInner = document.createElement("div");
    progressInner.id = "logseq-rsvp-progress";
    progressInner.style.cssText = "height: 100%; width: 0%";
    this.progressEl.appendChild(progressInner);

    this.controlsEl.style.cssText = "font-size: 12px; opacity: .85; text-align: center";
    this.controlsEl.textContent =
      "Toggle • Stop • Sentence ± • WPM ± (keys configurable in plugin settings)";

    this.overlay.append(this.wordEl, this.infoEl, this.progressEl, this.controlsEl);
    document.body.appendChild(this.overlay);
    this.applyTheme();
  }

  private applyTheme() {
    const requested = (logseq.settings?.theme as ThemeMode | undefined) ?? DEFAULT_SETTINGS.theme;
    const darkByPreference = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
    const dark = requested === "dark" || (requested === "auto" && darkByPreference);

    if (dark) {
      this.overlay.style.background = "rgba(12, 12, 14, 0.98)";
      this.overlay.style.color = "#f3f4f6";
      this.progressEl.style.background = "#2f323a";
      const progressInner = this.progressEl.firstElementChild as HTMLDivElement;
      progressInner.style.background = "#60a5fa";
    } else {
      this.overlay.style.background = "rgba(255, 255, 255, 0.97)";
      this.overlay.style.color = "#0f172a";
      this.progressEl.style.background = "#d3d7e0";
      const progressInner = this.progressEl.firstElementChild as HTMLDivElement;
      progressInner.style.background = "#2563eb";
    }
  }

  private show() {
    this.overlay.style.display = "flex";
  }

  private hide() {
    this.overlay.style.display = "none";
    this.wordEl.textContent = "";
    this.infoEl.textContent = "";
    const progressInner = this.progressEl.firstElementChild as HTMLDivElement;
    progressInner.style.width = "0%";
  }

  private updateUI() {
    const currentWord = this.words[Math.min(this.index, this.words.length - 1)] ?? "";
    this.wordEl.textContent = currentWord;
    const state = this.running ? "Running" : "Paused";
    this.infoEl.textContent = `${state} • ${this.wpm} WPM • ${Math.min(this.index + 1, this.words.length)}/${this.words.length}`;

    const progressInner = this.progressEl.firstElementChild as HTMLDivElement;
    const ratio = this.words.length ? (this.index / this.words.length) * 100 : 0;
    progressInner.style.width = `${clamp(ratio, 0, 100)}%`;
  }

  private clearTimer() {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (this.overlay.style.display === "none") return;

    const key = event.code || event.key;
    const settings = this.settings;
    const matches = (configured: string) => key === configured || event.key === configured;

    if (matches(settings.keyToggle)) {
      event.preventDefault();
      this.pauseToggle();
      return;
    }

    if (matches(settings.keyStop)) {
      event.preventDefault();
      this.stop();
      return;
    }

    if (matches(settings.keyPrevSentence)) {
      event.preventDefault();
      this.jumpSentence("prev");
      return;
    }

    if (matches(settings.keyNextSentence)) {
      event.preventDefault();
      this.jumpSentence("next");
      return;
    }

    if (matches(settings.keyIncreaseWpm)) {
      event.preventDefault();
      this.adjustWpm(50);
      return;
    }

    if (matches(settings.keyDecreaseWpm)) {
      event.preventDefault();
      this.adjustWpm(-50);
    }
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function readNumberSetting(key: keyof PluginSettings, fallback: number): number {
  const value = Number(logseq.settings?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeText(input: string) {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\(\(([^)]+)\)\)/g, "$1")
    .replace(/(^|\s)#([\w/-]+)/g, " $2")
    .replace(/[*_~>#`|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitWords(text: string) {
  if (!text) return [];
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function getPunctuationFactor(word: string, mode: PunctuationMode): number {
  if (mode === "none") return 1;
  const light = /[,;:)]$/.test(word) ? 1.3 : 1;
  const strong = /[.!?]$/.test(word) ? 1.8 : 1;
  if (mode === "strong") {
    return Math.max(light, strong, /[—-]$/.test(word) ? 1.25 : 1);
  }
  return Math.max(light, strong > 1 ? 1.55 : 1);
}

function findSentenceStarts(words: string[]) {
  if (!words.length) return [0];
  const starts = [0];
  for (let i = 0; i < words.length - 1; i += 1) {
    if (/[.!?]$/.test(words[i])) {
      starts.push(i + 1);
    }
  }
  return starts;
}

function flattenBlocks(blocks: unknown[]): string {
  const lines: string[] = [];

  const walk = (items: unknown[]) => {
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as { content?: unknown; children?: unknown[] };
      if (typeof candidate.content === "string" && candidate.content.trim()) {
        lines.push(candidate.content);
      }
      if (Array.isArray(candidate.children) && candidate.children.length) {
        walk(candidate.children);
      }
    }
  };

  walk(blocks);
  return lines.join("\n");
}

const player = new RSVPPlayer();

function settingsSnapshot(): PluginSettings {
  const settings = { ...DEFAULT_SETTINGS, ...(logseq.settings ?? {}) } as PluginSettings;
  settings.maxWpm = clamp(Number(settings.maxWpm || DEFAULT_SETTINGS.maxWpm), 100, 10000);
  settings.wpm = clamp(Number(settings.wpm || DEFAULT_SETTINGS.wpm), 50, settings.maxWpm);
  settings.fontSize = clamp(Number(settings.fontSize || DEFAULT_SETTINGS.fontSize), 16, 220);
  settings.accelerationWords = clamp(Number(settings.accelerationWords || 0), 0, 500);
  return settings;
}

async function readCurrentPage() {
  const page = await logseq.Editor.getCurrentPage();
  const pageName = typeof page?.name === "string" ? page.name : "";
  if (!pageName) {
    logseq.UI.showMsg("No active page found.", "warning");
    return;
  }

  const blocks = await logseq.Editor.getPageBlocksTree(pageName);
  const text = flattenBlocks(Array.isArray(blocks) ? blocks : []);
  player.startText(text);
}

async function readSelectedBlocks() {
  const editor = logseq.Editor as typeof logseq.Editor & {
    getSelectedBlocks?: () => Promise<Array<{ content?: string; children?: unknown[] }>>;
  };

  const selected = (await editor.getSelectedBlocks?.()) ?? [];
  if (selected.length > 0) {
    const text = flattenBlocks(selected);
    player.startText(text);
    return;
  }

  const current = await logseq.Editor.getCurrentBlock();
  if (current?.content) {
    player.startText(current.content);
    return;
  }

  logseq.UI.showMsg("Select a block or place cursor in a block first.", "warning");
}

async function readSingleBlock(uuid: string) {
  if (!uuid) return;
  const block = await logseq.Editor.getBlock(uuid, { includeChildren: true });
  const text = flattenBlocks(block ? [block] : []);
  player.startText(text);
}

async function main() {
  logseq.useSettingsSchema(SETTINGS_SCHEMA);
  player.updateSettings(settingsSnapshot());

  logseq.onSettingsChanged(() => {
    player.updateSettings(settingsSnapshot());
  });

  logseq.App.registerCommandPalette(
    {
      key: "rsvp-read-current-page",
      label: "RSVP: Read current page",
    },
    () => {
      void readCurrentPage();
    },
  );

  logseq.App.registerCommandPalette(
    {
      key: "rsvp-read-selected-blocks",
      label: "RSVP: Read selected block(s)",
    },
    () => {
      void readSelectedBlocks();
    },
  );

  logseq.Editor.registerSlashCommand("RSVP: Read selected block(s)", async () => {
    await readSelectedBlocks();
  });

  logseq.Editor.registerSlashCommand("RSVP: Read current page", async () => {
    await readCurrentPage();
  });

  logseq.Editor.registerBlockContextMenuItem("RSVP: Speed-read this block", async ({ uuid }) => {
    await readSingleBlock(uuid);
  });

  logseq.provideModel({
    rsvpReadCurrentPage() {
      void readCurrentPage();
    },
    rsvpReadSelectedBlocks() {
      void readSelectedBlocks();
    },
  });

  logseq.App.registerUIItem("toolbar", {
    key: "rsvp-toolbar-open",
    template:
      '<a class="button" data-on-click="rsvpReadSelectedBlocks" title="RSVP speed-reader">RSVP</a>',
  });

  logseq.UI.showMsg("RSVP Speedreader plugin loaded.", "success", { timeout: 1500 });
}

void logseq.ready(main).catch((error) => {
  console.error("LogSeq RSVP plugin failed to initialize", error);
});
