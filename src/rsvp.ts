export type PauseStrength = 'off' | 'light' | 'medium' | 'strong';

export type RsvpSettings = {
  wpm: number;
  pauseOnPunctuation: boolean;
  commaPauseFactor: number;
  sentencePauseFactor: number;
  dashPauseFactor: number;
  rampEnabled: boolean;
  rampWords: number;
  rampStartFactor: number;
  rampEndFactor: number;
};

export type RsvpState = {
  words: string[];
  index: number;
};

const MARKDOWN_LINK = /\[([^\]]+)]\(([^)]+)\)/g;
const MARKDOWN_IMAGE = /!\[([^\]]*)]\(([^)]+)\)/g;
const CODE_FENCE = /```[\s\S]*?```/g;
const INLINE_CODE = /`[^`]*`/g;
const HTML_TAG = /<\/?[^>]+>/g;
const EMPHASIS_BOLD = /(\*\*|__)(.*?)\1/g;
const EMPHASIS = /(\*|_)(.*?)\1/g;
const HEADING_OR_LIST = /^\s{0,3}(#{1,6}|\*|\-|\+|\d+\.)\s+/gm;
const BLOCKQUOTE = /^\s{0,3}>\s?/gm;

export function normalizeText(text: string): string {
  return text
    .replace(CODE_FENCE, ' ')
    .replace(MARKDOWN_IMAGE, '$1')
    .replace(MARKDOWN_LINK, '$1')
    .replace(INLINE_CODE, ' ')
    .replace(EMPHASIS_BOLD, '$2')
    .replace(EMPHASIS, '$2')
    .replace(HTML_TAG, ' ')
    .replace(HEADING_OR_LIST, '')
    .replace(BLOCKQUOTE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTextToWords(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(/\s+/g);
}

export function getSentenceStartIndices(words: string[]): number[] {
  const indices: number[] = [0];
  for (let i = 0; i < words.length; i += 1) {
    if (/[.!?]+$/.test(words[i])) {
      if (i + 1 < words.length) indices.push(i + 1);
    }
  }
  return Array.from(new Set(indices)).sort((a, b) => a - b);
}

export function findSentenceBoundary(words: string[], currentIndex: number, direction: 'next' | 'prev'): number {
  const boundaries = getSentenceStartIndices(words);
  if (direction === 'next') {
    for (const idx of boundaries) {
      if (idx > currentIndex) return idx;
    }
    return Math.max(words.length - 1, 0);
  }
  for (let i = boundaries.length - 1; i >= 0; i -= 1) {
    if (boundaries[i] < currentIndex) return boundaries[i];
  }
  return 0;
}

export function computeDelayMs(
  word: string,
  baseMs: number,
  settings: RsvpSettings,
  index: number,
  total: number
): number {
  let delay = baseMs;

  if (settings.pauseOnPunctuation) {
    if (/[.!?]+$/.test(word)) {
      delay *= settings.sentencePauseFactor;
    } else if (/[,;:]+$/.test(word)) {
      delay *= settings.commaPauseFactor;
    } else if (/[\u2014\u2013-]+$/.test(word)) {
      delay *= settings.dashPauseFactor;
    }
  }

  if (settings.rampEnabled && total > 0 && settings.rampWords > 0) {
    const rampWords = Math.min(settings.rampWords, total);
    const startFactor = settings.rampStartFactor;
    const endFactor = settings.rampEndFactor;

    if (index < rampWords) {
      const progress = index / rampWords;
      const factor = startFactor - (startFactor - 1) * progress;
      delay *= factor;
    } else if (index > total - rampWords) {
      const remaining = total - index;
      const progress = remaining / rampWords;
      const factor = endFactor - (endFactor - 1) * progress;
      delay *= factor;
    }
  }

  return Math.max(10, Math.round(delay));
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeBaseMs(wpm: number): number {
  const safeWpm = Math.max(1, wpm);
  return 60000 / safeWpm;
}

export function blocksToText(blocks: Array<{ content?: string; children?: any[] }>): string {
  const lines: string[] = [];

  const walk = (items: Array<{ content?: string; children?: any[] }>) => {
    for (const item of items) {
      if (typeof item.content === 'string') {
        lines.push(item.content);
      }
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children);
      }
    }
  };

  walk(blocks);
  return lines.join('\n');
}
