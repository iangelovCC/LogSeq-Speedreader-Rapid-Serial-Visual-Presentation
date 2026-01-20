import { describe, expect, it } from 'vitest';
import {
  computeBaseMs,
  computeDelayMs,
  findSentenceBoundary,
  normalizeText,
  parseTextToWords
} from '../src/rsvp';

const settings = {
  wpm: 300,
  pauseOnPunctuation: true,
  commaPauseFactor: 1.25,
  sentencePauseFactor: 1.75,
  dashPauseFactor: 1.2,
  rampEnabled: true,
  rampWords: 5,
  rampStartFactor: 1.4,
  rampEndFactor: 1.3
};

describe('normalizeText', () => {
  it('removes markdown and html', () => {
    const input = '# Title\nThis is **bold** and [link](https://example.com). <b>tag</b>';
    expect(normalizeText(input)).toBe('Title This is bold and link.');
  });
});

describe('parseTextToWords', () => {
  it('splits into words', () => {
    const words = parseTextToWords('Hello world!');
    expect(words).toEqual(['Hello', 'world!']);
  });
});

describe('computeDelayMs', () => {
  it('adds punctuation pauses', () => {
    const base = computeBaseMs(300);
    const normal = computeDelayMs('word', base, settings, 2, 10);
    const comma = computeDelayMs('word,', base, settings, 2, 10);
    const sentence = computeDelayMs('word.', base, settings, 2, 10);
    expect(comma).toBeGreaterThan(normal);
    expect(sentence).toBeGreaterThan(comma);
  });

  it('applies ramp at start', () => {
    const base = computeBaseMs(300);
    const early = computeDelayMs('word', base, settings, 0, 20);
    const mid = computeDelayMs('word', base, settings, 10, 20);
    expect(early).toBeGreaterThan(mid);
  });
});

describe('findSentenceBoundary', () => {
  it('jumps between sentence starts', () => {
    const words = ['Hello', 'world.', 'Next', 'sentence', 'here.'];
    expect(findSentenceBoundary(words, 1, 'next')).toBe(2);
    expect(findSentenceBoundary(words, 3, 'prev')).toBe(2);
  });
});
