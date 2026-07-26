// =============================================
// RockBottom — Main Application Entry
// SPA Routing, State Management, Socket Setup
// =============================================

import { connectWallet, formatAddress, getAvatarColor, getAvatarInitials, getPreviousWallet, storeWallet, disconnectWallet, detectProvider, onAccountChange, onChainChange } from './utils/wallet.js';
import { renderLanding } from './pages/landing.js';

// ---- Global App State ----
export const state = {
  wallet: null,        // connected wallet address
  provider: null,      // wallet provider
  user: null,          // user profile from backend
  currentPage: null,   // current page name
  socket: null,        // socket.io connection
};

// ---- Page Registry ----
const pages = {
  'landing': () => renderLanding(),
  'markets': async () => {
    const { renderMarkets } = await import('./pages/markets.js');
    return renderMarkets();
  },
  'agent': async () => {
    const { renderAgentChat } = await import('./pages/agent-chat.js');
    return renderAgentChat();
  },
  'milestone': async (id) => {
    const { renderMilestoneDetail } = await import('./pages/milestone-detail.js');
    return renderMilestoneDetail(id);
  },
  'proof-submit': async (id) => {
    const { renderProofSubmit } = await import('./pages/proof-submit.js');
    return renderProofSubmit(id);
  },
  'profile': async (wallet) => {
    const { renderProfile } = await import('./pages/profile.js');
    return renderProfile(wallet || state.wallet);
  },
  'leaderboard': async () => {
    const { renderLeaderboard } = await import('./pages/leaderboard.js');
    return renderLeaderboard();
  },
};

// ---- Router ----
async function navigate() {
  const hash = window.location.hash || '#/';
  const parts = hash.slice(2).split('/'); // Remove '#/'
  const page = parts[0] || 'landing';
  const param = parts[1] || null;

  const main = document.getElementById('main-content');
  if (!main) return;

  // Update active nav link
  document.querySelectorAll('.nav__link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  state.currentPage = page;

  // Render page
  try {
    const renderer = pages[page];
    if (renderer) {
      const html = await renderer(param);
      main.innerHTML = `<div class="page">${html}</div>`;
      // Execute any page-level init scripts
      window.dispatchEvent(new CustomEvent('page:mounted', { detail: { page, param } }));
    } else {
      main.innerHTML = `
        <div class="page">
          <div class="empty-state">
            <h2 class="empty-state__title">Page Not Found</h2>
            <p class="empty-state__text">The page you're looking for doesn't exist.</p>
            <a href="#/" class="btn btn--primary">Go Home</a>
          </div>
        </div>`;
    }
  } catch (err) {
    console.error('Page render error:', err);
    main.innerHTML = `
      <div class="page">
        <div class="empty-state">
          <h2 class="empty-state__title">Something went wrong</h2>
          <p class="empty-state__text">${err.message}</p>
          <a href="#/" class="btn btn--primary">Go Home</a>
        </div>
      </div>`;
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// ---- Wallet Connection UI ----
async function handleWalletConnect() {
  const btn = document.getElementById('wallet-btn');
  const label = document.getElementById('wallet-label');
  const dot = document.querySelector('.wallet-dot');

  if (state.wallet) {
    // Disconnect
    disconnectWallet();
    state.wallet = null;
    state.provider = null;
    label.textContent = 'Connect Wallet';
    dot.classList.remove('connected');
    document.getElementById('nav-profile').style.display = 'none';
    showToast('Wallet disconnected', 'info');
    return;
  }

  try {
    btn.disabled = true;
    label.textContent = 'Connecting...';

    const { address, provider } = await connectWallet();
    state.wallet = address;
    state.provider = provider;

    // Update UI
    label.textContent = formatAddress(address);
    dot.classList.add('connected');
    storeWallet(address);

    // Show profile link
    const profileLink = document.getElementById('nav-profile');
    profileLink.style.display = 'flex';
    const avatar = document.getElementById('nav-avatar');
    avatar.style.background = getAvatarColor(address);
    avatar.textContent = getAvatarInitials(address);

    // Register with backend
    try {
      const { users } = await import('./utils/api.js');
      const user = await users.connect({ wallet_address: address });
      state.user = user;
      
      const isImage = user.avatar_seed && user.avatar_seed.startsWith('uploads/');
      if (isImage) {
        avatar.innerHTML = `<img src="/${user.avatar_seed}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
        avatar.style.background = 'transparent';
      } else {
        const isEmoji = user.avatar_seed && [...user.avatar_seed].length <= 2;
        avatar.innerHTML = isEmoji ? user.avatar_seed : getAvatarInitials(address);
      }
    } catch (e) {
      // Backend might not be running yet — that's ok
      console.warn('Backend connection skipped:', e.message);
    }

    showToast(`Connected: ${formatAddress(address)}`, 'success');
    
    // UX workflow improvements:
    if (state.currentPage === 'landing') {
      window.location.hash = '#/markets';
    } else {
      navigate(); // Re-render current page to clear empty states
    }

    // Listen for changes
    onAccountChange(provider, (newAddr) => {
      if (newAddr) {
        state.wallet = newAddr;
        label.textContent = formatAddress(newAddr);
        storeWallet(newAddr);
      } else {
        state.wallet = null;
        label.textContent = 'Connect Wallet';
        dot.classList.remove('connected');
      }
    });

    onChainChange(provider, () => {
      window.location.reload();
    });

  } catch (err) {
    console.error('Wallet connection error:', err);
    showToast(err.message, 'error');
    label.textContent = 'Connect Wallet';
  } finally {
    btn.disabled = false;
  }
}

// ---- Auto-reconnect wallet ----
async function tryAutoConnect() {
  const prev = getPreviousWallet();
  if (!prev) return;

  const provider = detectProvider();
  if (!provider) return;

  try {
    const accounts = await provider.request({ method: 'eth_accounts' });
    if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === prev.toLowerCase()) {
      state.wallet = accounts[0];
      state.provider = provider;

      const label = document.getElementById('wallet-label');
      const dot = document.querySelector('.wallet-dot');
      label.textContent = formatAddress(accounts[0]);
      dot.classList.add('connected');

      const profileLink = document.getElementById('nav-profile');
      profileLink.style.display = 'flex';
      const avatar = document.getElementById('nav-avatar');
      avatar.style.background = getAvatarColor(accounts[0]);
      avatar.textContent = getAvatarInitials(accounts[0]);
      
      // Fetch user profile silently to get PFP and ensure they exist on backend
      try {
        const { users } = await import('./utils/api.js');
        const user = await users.connect({ wallet_address: accounts[0] });
        if (user) {
          state.user = user;
          const isImage = user.avatar_seed && user.avatar_seed.startsWith('uploads/');
          if (isImage) {
            avatar.innerHTML = `<img src="/${user.avatar_seed}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
            avatar.style.background = 'transparent';
          } else {
            const isEmoji = user.avatar_seed && [...user.avatar_seed].length <= 2;
            avatar.innerHTML = isEmoji ? user.avatar_seed : getAvatarInitials(accounts[0]);
          }
        }
      } catch (e) {
        // fail silently
      }
    }
  } catch (e) {
    // Silent fail on auto-connect
  }
}

// ---- Toast System ----
let toastId = 0;
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const id = `toast-${++toastId}`;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.id = id;
  toast.innerHTML = `
    <span class="toast__message">${message}</span>
    <button class="toast__close" onclick="this.closest('.toast').remove()">✕</button>
  `;

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('exiting');
      setTimeout(() => el.remove(), 300);
    }
  }, duration);
}

// ---- Modal System ----
export function showModal(content) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  if (!overlay || !modal) return;

  modal.innerHTML = content;
  overlay.classList.add('open');

  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  // Close on Escape
  const handler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handler);
    }
  };
  document.addEventListener('keydown', handler);
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

// ---- Mobile Menu ----
function setupMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    menu.classList.toggle('open');
  });

  // Close on link click
  menu.querySelectorAll('.mobile-menu__link').forEach(link => {
    link.addEventListener('click', () => menu.classList.remove('open'));
  });
}

// ---- Initialize App ----
async function init() {
  // Initialize Socket.io
  const { initSocket } = await import('./utils/socket.js');
  initSocket();

  // Setup routing
  window.addEventListener('hashchange', navigate);

  // Setup wallet button
  const walletBtn = document.getElementById('wallet-btn');
  if (walletBtn) walletBtn.addEventListener('click', handleWalletConnect);

  // Setup mobile menu
  setupMobileMenu();

  // Auto-reconnect wallet
  await tryAutoConnect();

  // Initial route
  await navigate();

  console.log('🪨 RockBottom initialized');
}

// ---- Start ----
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
