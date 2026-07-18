// =============================================
// RockBottom — Helper Utilities
// =============================================

/**
 * Format a number as compact display (1.2K, 3.4M, etc.)
 */
export function formatCompact(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.001) return num.toFixed(4);
  return num.toFixed(6);
}

/**
 * Format OKB amount
 */
export function formatOKB(amount) {
  if (amount === null || amount === undefined) return '0 OKB';
  const num = parseFloat(amount);
  if (num >= 1000) return formatCompact(num) + ' OKB';
  if (num >= 1) return num.toFixed(2) + ' OKB';
  return num.toFixed(4) + ' OKB';
}

/**
 * Format a percentage (0-100)
 */
export function formatPercent(value) {
  if (value === null || value === undefined) return '0%';
  return parseFloat(value).toFixed(1) + '%';
}

/**
 * Calculate countdown from deadline
 * @returns {{ days, hours, minutes, seconds, expired, urgent }}
 */
export function getCountdown(deadline) {
  const now = Date.now();
  const target = new Date(deadline).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, urgent: false, text: 'Expired' };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  const urgent = diff < 1000 * 60 * 60; // less than 1 hour

  let text = '';
  if (days > 0) text = `${days}d ${hours}h`;
  else if (hours > 0) text = `${hours}h ${minutes}m`;
  else text = `${minutes}m ${seconds}s`;

  return { days, hours, minutes, seconds, expired: false, urgent, text };
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function timeAgo(date) {
  const now = Date.now();
  const time = new Date(date).getTime();
  const diff = now - time;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Generate a deterministic color from a string (for avatars, etc.)
 */
export function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
}

/**
 * Generate deterministic avatar gradient
 */
export function avatarGradient(str) {
  const hue1 = Math.abs(hashCode(str) % 360);
  const hue2 = (hue1 + 60) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 55%), hsl(${hue2}, 70%, 55%))`;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Generate a unique ID
 */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Deep clone an object
 */
export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clamp a number between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Pool price calculation
 */
export function calcYesPrice(totalYes, totalNo) {
  const total = totalYes + totalNo;
  if (total === 0) return 0.5;
  return totalNo / total;
}

export function calcNoPrice(totalYes, totalNo) {
  const total = totalYes + totalNo;
  if (total === 0) return 0.5;
  return totalYes / total;
}

/**
 * Estimate return for a bet
 */
export function estimateReturn(betAmount, side, totalYes, totalNo) {
  const newYes = side === 'yes' ? totalYes + betAmount : totalYes;
  const newNo = side === 'no' ? totalNo + betAmount : totalNo;
  const totalPool = newYes + newNo;

  if (side === 'yes') {
    const share = betAmount / newYes;
    return share * totalPool;
  } else {
    const share = betAmount / newNo;
    return share * totalPool;
  }
}
