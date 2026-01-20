import '@logseq/libs';
import type { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin';
import {
  blocksToText,
  clamp,
  computeBaseMs,
  computeDelayMs,
  findSentenceBoundary,
  parseTextToWords,
  RsvpSettings
} from './rsvp';
import { renderTemplate, styles, UiState } from './ui';

const DEFAULT_SETTINGS: RsvpSettings & {
  showProgress: boolean;
  fontSize: number;
  fontFamily: string;
  colorScheme: 'auto' | 'light' | 'dark';
  shortcutStartPause: string;
  shortcutStop: string;
  shortcutPrevSentence: string;
  shortcutNextSentence: string;
  shortcutIncreaseWpm: string;
  shortcutDecreaseWpm: string;
} = {
  wpm: 400,
  pauseOnPunctuation: true,
  commaPauseFactor: 1.25,
  sentencePauseFactor: 1.75,
  dashPauseFactor: 1.2,
  rampEnabled: true,
  rampWords: 12,
  rampStartFactor: 1.4,
  rampEndFactor: 1.3,
  showProgress: true,
  fontSize: 64,
  fontFamily: 'Inter, system-ui, sans-serif',
  colorScheme: 'auto',
  shortcutStartPause: 'Space',
  shortcutStop: 'Escape',
  shortcutPrevSentence: 'ArrowLeft',
  shortcutNextSentence: 'ArrowRight',
  shortcutIncreaseWpm: 'ArrowUp',
  shortcutDecreaseWpm: 'ArrowDown'
};

const settingsSchema: SettingSchemaDesc[] = [
  {
    key: 'wpm',
    type: 'number',
    title: 'Words per minute',
    description: 'Target reading speed (max 10,000 WPM).',
    default: DEFAULT_SETTINGS.wpm
  },
  {
    key: 'showProgress',
    type: 'boolean',
    title: 'Show progress bar',
    default: DEFAULT_SETTINGS.showProgress
  },
  {
    key: 'fontSize',
    type: 'number',
    title: 'Font size (px)',
    default: DEFAULT_SETTINGS.fontSize
  },
  {
    key: 'fontFamily',
    type: 'string',
    title: 'Font family',
    default: DEFAULT_SETTINGS.fontFamily
  },
  {
    key: 'colorScheme',
    type: 'enum',
    title: 'Color scheme',
    default: DEFAULT_SETTINGS.colorScheme,
    enumChoices: ['auto', 'light', 'dark']
  },
  {
    key: 'pauseOnPunctuation',
    type: 'boolean',
    title: 'Pause on punctuation',
    default: DEFAULT_SETTINGS.pauseOnPunctuation
  },
  {
    key: 'commaPauseFactor',
    type: 'number',
    title: 'Comma pause factor',
    default: DEFAULT_SETTINGS.commaPauseFactor
  },
  {
    key: 'sentencePauseFactor',
    type: 'number',
    title: 'Sentence pause factor',
    default: DEFAULT_SETTINGS.sentencePauseFactor
  },
  {
    key: 'dashPauseFactor',
    type: 'number',
    title: 'Dash pause factor',
    default: DEFAULT_SETTINGS.dashPauseFactor
  },
  {
    key: 'rampEnabled',
    type: 'boolean',
    title: 'Enable gradual acceleration/deceleration',
    default: DEFAULT_SETTINGS.rampEnabled
  },
  {
    key: 'rampWords',
    type: 'number',
    title: 'Ramp length (words)',
    default: DEFAULT_SETTINGS.rampWords
  },
  {
    key: 'rampStartFactor',
    type: 'number',
    title: 'Ramp start slow-down factor',
    default: DEFAULT_SETTINGS.rampStartFactor
  },
  {
    key: 'rampEndFactor',
    type: 'number',
    title: 'Ramp end slow-down factor',
    default: DEFAULT_SETTINGS.rampEndFactor
  },
  {
    key: 'shortcutStartPause',
    type: 'string',
    title: 'Shortcut: Start/Pause',
    default: DEFAULT_SETTINGS.shortcutStartPause
  },
  {
    key: 'shortcutStop',
    type: 'string',
    title: 'Shortcut: Stop',
    default: DEFAULT_SETTINGS.shortcutStop
  },
  {
    key: 'shortcutPrevSentence',
    type: 'string',
    title: 'Shortcut: Previous sentence',
    default: DEFAULT_SETTINGS.shortcutPrevSentence
  },
  {
    key: 'shortcutNextSentence',
    type: 'string',
    title: 'Shortcut: Next sentence',
    default: DEFAULT_SETTINGS.shortcutNextSentence
  },
  {
    key: 'shortcutIncreaseWpm',
    type: 'string',
    title: 'Shortcut: Increase WPM',
    default: DEFAULT_SETTINGS.shortcutIncreaseWpm
  },
  {
    key: 'shortcutDecreaseWpm',
    type: 'string',
    title: 'Shortcut: Decrease WPM',
    default: DEFAULT_SETTINGS.shortcutDecreaseWpm
  }
];

type InternalState = {
  words: string[];
  index: number;
  active: boolean;
  paused: boolean;
  timer: number | null;
  status: string;
};

const state: InternalState = {
  words: [],
  index: 0,
  active: false,
  paused: true,
  timer: null,
  status: 'Idle'
};

const getSettings = (): RsvpSettings & typeof DEFAULT_SETTINGS => {
  const settings = logseq.settings || {};
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    wpm: clamp(Number(settings.wpm ?? DEFAULT_SETTINGS.wpm), 50, 10000)
  };
};

const updateUi = () => {
  const settings = getSettings();
  const uiState: UiState = {
    visible: state.active,
    word: state.words[state.index] || '',
    wpm: settings.wpm,
    index: state.index,
    total: state.words.length,
    paused: state.paused,
    showProgress: settings.showProgress,
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    colorScheme: settings.colorScheme,
    status: state.status
  };

  logseq.provideUI({
    key: 'rsvp-reader',
    template: renderTemplate(uiState),
    style: `${styles}\n:root { --rsvp-font-size: ${settings.fontSize}px; --rsvp-font-family: ${settings.fontFamily}; }`
  });
};

const clearTimer = () => {
  if (state.timer) {
    window.clearTimeout(state.timer);
    state.timer = null;
  }
};

const stopSession = () => {
  state.active = false;
  state.paused = true;
  state.index = 0;
  state.words = [];
  state.status = 'Stopped';
  clearTimer();
  updateUi();
};

const pauseSession = () => {
  state.paused = true;
  state.status = 'Paused';
  clearTimer();
  updateUi();
};

const startSession = (words: string[], status: string) => {
  if (!words.length) {
    logseq.App.showMsg('No readable text found.', 'warning');
    return;
  }

  state.words = words;
  state.index = 0;
  state.active = true;
  state.paused = false;
  state.status = status;
  scheduleNext();
  updateUi();
};

const resumeSession = () => {
  if (!state.active) return;
  state.paused = false;
  state.status = 'Playing';
  scheduleNext();
  updateUi();
};

const scheduleNext = () => {
  clearTimer();
  if (!state.active || state.paused) return;

  if (state.index >= state.words.length) {
    stopSession();
    return;
  }

  const settings = getSettings();
  const baseMs = computeBaseMs(settings.wpm);
  const word = state.words[state.index];
  const delay = computeDelayMs(word, baseMs, settings, state.index, state.words.length);

  updateUi();

  state.timer = window.setTimeout(() => {
    state.index += 1;
    scheduleNext();
  }, delay);
};

const stepSentence = (direction: 'next' | 'prev') => {
  if (!state.active) return;
  const nextIndex = findSentenceBoundary(state.words, state.index, direction);
  state.index = clamp(nextIndex, 0, Math.max(0, state.words.length - 1));
  updateUi();
};

const adjustWpm = (delta: number) => {
  const settings = getSettings();
  const nextWpm = clamp(settings.wpm + delta, 50, 10000);
  logseq.updateSettings({ wpm: nextWpm });
  updateUi();
};

const normalizeShortcut = (value: string) => value.trim().toLowerCase();

const matchesShortcut = (event: KeyboardEvent, shortcut: string) => {
  const target = normalizeShortcut(shortcut);
  if (!target) return false;
  return normalizeShortcut(event.code) === target || normalizeShortcut(event.key) === target;
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!state.active) return;
  const settings = getSettings();

  if (matchesShortcut(event, settings.shortcutStartPause)) {
    event.preventDefault();
    state.paused ? resumeSession() : pauseSession();
  } else if (matchesShortcut(event, settings.shortcutStop)) {
    event.preventDefault();
    stopSession();
  } else if (matchesShortcut(event, settings.shortcutPrevSentence)) {
    event.preventDefault();
    stepSentence('prev');
  } else if (matchesShortcut(event, settings.shortcutNextSentence)) {
    event.preventDefault();
    stepSentence('next');
  } else if (matchesShortcut(event, settings.shortcutIncreaseWpm)) {
    event.preventDefault();
    adjustWpm(50);
  } else if (matchesShortcut(event, settings.shortcutDecreaseWpm)) {
    event.preventDefault();
    adjustWpm(-50);
  }
};

const getSelectedText = async (): Promise<string | null> => {
  const selectedBlocks = await logseq.Editor.getSelectedBlocks();
  if (selectedBlocks && selectedBlocks.length > 0) {
    return blocksToText(selectedBlocks as any);
  }
  return null;
};

const getCurrentPageText = async (): Promise<string | null> => {
  const page = await logseq.Editor.getCurrentPage();
  if (!page?.name) return null;
  const blocks = await logseq.Editor.getPageBlocksTree(page.name);
  if (!blocks || blocks.length === 0) return null;
  return blocksToText(blocks as any);
};

const startFromSelection = async () => {
  const text = await getSelectedText();
  if (!text) {
    logseq.App.showMsg('Select blocks first to read them.', 'warning');
    return;
  }
  startSession(parseTextToWords(text), 'Reading selected blocks');
};

const startFromPage = async () => {
  const text = (await getSelectedText()) || (await getCurrentPageText());
  if (!text) {
    logseq.App.showMsg('No readable text found on this page.', 'warning');
    return;
  }
  startSession(parseTextToWords(text), 'Reading current page');
};

const main = async () => {
  logseq.useSettingsSchema(settingsSchema);
  logseq.provideModel({
    togglePlay() {
      state.paused ? resumeSession() : pauseSession();
    },
    stop() {
      stopSession();
    },
    slower() {
      adjustWpm(-50);
    },
    faster() {
      adjustWpm(50);
    },
    close() {
      stopSession();
    }
  });

  updateUi();

  logseq.App.registerCommandPalette(
    { key: 'rsvp-read-page', label: 'RSVP: Read current page' },
    startFromPage
  );

  logseq.App.registerCommandPalette(
    { key: 'rsvp-read-selection', label: 'RSVP: Read selected blocks' },
    startFromSelection
  );

  logseq.Editor.registerSlashCommand('RSVP: Read current page', startFromPage);
  logseq.Editor.registerSlashCommand('RSVP: Read selected blocks', startFromSelection);

  logseq.Editor.registerBlockContextMenuItem('RSVP: Read block', async () => {
    await startFromSelection();
  });

  document.addEventListener('keydown', handleKeydown);
};

logseq.ready(main).catch((error) => {
  console.error('RSVP plugin error', error);
});
