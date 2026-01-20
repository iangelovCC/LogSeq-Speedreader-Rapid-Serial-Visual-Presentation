import { escapeHtml } from './rsvp';

export type UiState = {
  visible: boolean;
  word: string;
  wpm: number;
  index: number;
  total: number;
  paused: boolean;
  showProgress: boolean;
  fontSize: number;
  fontFamily: string;
  colorScheme: 'auto' | 'light' | 'dark';
  status: string;
};

export const styles = `
#rsvp-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  font-family: var(--rsvp-font-family, "Inter", sans-serif);
}

#rsvp-root.show {
  display: flex;
}

.rsvp-panel {
  width: min(900px, 90vw);
  background: var(--rsvp-bg, #111);
  color: var(--rsvp-fg, #f5f5f5);
  border-radius: 16px;
  padding: 24px 32px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

.rsvp-panel.light {
  --rsvp-bg: #fefefe;
  --rsvp-fg: #141414;
}

.rsvp-panel.dark {
  --rsvp-bg: #111;
  --rsvp-fg: #f5f5f5;
}

.rsvp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.rsvp-word {
  font-size: var(--rsvp-font-size, 64px);
  font-weight: 600;
  text-align: center;
  margin: 32px 0;
  min-height: 80px;
}

.rsvp-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.rsvp-button {
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.12);
  color: inherit;
  cursor: pointer;
}

.rsvp-button.primary {
  background: #4f46e5;
  color: #fff;
}

.rsvp-progress {
  margin-top: 18px;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.rsvp-progress-bar {
  height: 100%;
  width: 0%;
  background: #22c55e;
  transition: width 120ms linear;
}

.rsvp-meta {
  text-align: center;
  margin-top: 8px;
  font-size: 14px;
  opacity: 0.75;
}
`;

export function renderTemplate(state: UiState): string {
  const progress = state.total > 0 ? Math.min(100, Math.max(0, (state.index / state.total) * 100)) : 0;
  const word = escapeHtml(state.word || '');
  const scheme = state.colorScheme === 'auto' ? '' : state.colorScheme;

  return `
  <div id="rsvp-root" class="${state.visible ? 'show' : ''}">
    <div class="rsvp-panel ${scheme}">
      <div class="rsvp-header">
        <div><strong>RSVP Speed Reader</strong></div>
        <div>${escapeHtml(state.status)}</div>
      </div>
      <div class="rsvp-word">${word}</div>
      <div class="rsvp-controls">
        <button class="rsvp-button primary" data-on-click="togglePlay">${state.paused ? 'Start' : 'Pause'}</button>
        <button class="rsvp-button" data-on-click="stop">Stop</button>
        <button class="rsvp-button" data-on-click="slower">-50 WPM</button>
        <button class="rsvp-button" data-on-click="faster">+50 WPM</button>
        <button class="rsvp-button" data-on-click="close">Close</button>
      </div>
      ${state.showProgress ? `
      <div class="rsvp-progress">
        <div class="rsvp-progress-bar" style="width: ${progress.toFixed(1)}%"></div>
      </div>` : ''}
      <div class="rsvp-meta">${state.index + 1} / ${state.total} · ${state.wpm} WPM</div>
    </div>
  </div>
  `;
}
