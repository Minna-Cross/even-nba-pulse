import { MAX_VISIBLE_PLAY_TEXT, PAGE_SIZE } from './constants.js';

export function safeText(value, fallback = '-') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text ? text : fallback;
}

export function trimText(value, max = MAX_VISIBLE_PLAY_TEXT) {
  const text = safeText(value, '');
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function formatClock(rawClock) {
  const text = safeText(rawClock, '');
  if (!text) return '';
  if (text.startsWith('PT') && text.endsWith('S')) {
    const match = text.match(/PT(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (!match) return text;
    const minutes = Number(match[1] || 0);
    const seconds = Math.floor(Number(match[2] || 0));
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  return text;
}

export function formatGameLabel(game) {
  return `${game.away.code} @ ${game.home.code}`;
}

export function formatGameMeta(game) {
  return `${game.away.code} ${game.away.score} - ${game.home.score} ${game.home.code} | ${game.statusText}`;
}

export function formatPlayLine(play) {
  const period = play.period > 0 ? `Q${play.period}` : '–';
  const clock = formatClock(play.clock);
  const timeSlot = clock ? `${period} ${clock}` : period;
  const score = play.scoreText || `${play.awayScore}-${play.homeScore}`;
  const text = safeText(play.description, '');
  
  const maxWidth = 50;
  if (text.length <= maxWidth) {
    return `${timeSlot} | ${score} | ${text}`;
  }
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  const firstLine = `${timeSlot} | ${score} | ${lines[0]}`;
  const indent = ' '.repeat(timeSlot.length + 3 + score.length + 3);
  const continuationLines = lines.slice(1).map(line => `${indent}${line}`);
  
  return [firstLine, ...continuationLines].join('\n');
}

export function formatPlayLineGlasses(play, maxChars = 38) {
  const period = play.period > 0 ? `Q${play.period}` : '–';
  const clock = formatClock(play.clock);
  const timeSlot = clock ? `${period} ${clock}` : period;
  const score = play.scoreText || `${play.awayScore}-${play.homeScore}`;
  const text = trimText(safeText(play.description, ''), maxChars);
  return `${timeSlot} | ${score} | ${text}`;
}

export function sortPlays(plays) {
  const sorted = [...plays].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.actionNumber - b.actionNumber;
  });
  return [...sorted].reverse();
}

export function paginate(items, pageIndex, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(pageIndex, 0), totalPages - 1);
  const start = clampedPage * pageSize;
  return {
    totalPages,
    pageIndex: clampedPage,
    items: items.slice(start, start + pageSize)
  };
}

export function formatPageStatus(pageIndex, totalPages, direction) {
  const label = direction === 'asc' ? 'Oldest first' : 'Newest first';
  return `Page ${pageIndex + 1}/${totalPages} - ${label}`;
}
