// =============================================
// RockBottom — Markets Page
// =============================================

import { milestones } from '../utils/api.js';
import { getCountdown } from '../utils/helpers.js';

export async function renderMarkets() {
  let html = `
    <div class="markets-page">
      <div class="section-header">
        <h1 class="section-header__title">Explore <span class="text-gradient">Markets</span></h1>
        
        <div class="tabs" id="market-filters">
          <div class="tab active" data-filter="active">🟢 Active</div>
          <div class="tab" data-filter="pending">⏳ Pending Review</div>
          <div class="tab" data-filter="resolved">✅ Resolved</div>
          <div class="tab" data-filter="all">All Markets</div>
        </div>
      </div>

      <div class="markets-layout">
        <!-- Sidebar Filters -->
        <aside class="markets-sidebar" style="display: none;">
          <!-- Placeholder for advanced filtering (Category, Volume, etc) -->
        </aside>

        <!-- Main Grid -->
        <main class="markets-main">
          <div class="grid grid--auto" id="markets-grid">
            ${renderSkeletons(6)}
          </div>
        </main>
      </div>
    </div>
  `;

  // Attach logic after render
  setTimeout(() => initMarkets(), 0);

  return html;
}

function renderSkeletons(count) {
  return Array(count).fill(`
    <div class="market-card skeleton-card" style="height: 240px;">
      <div class="skeleton skeleton--title" style="margin-bottom: 1rem;"></div>
      <div class="skeleton skeleton--text" style="width: 40%; margin-bottom: 2rem;"></div>
      <div class="skeleton skeleton--text" style="width: 100%; height: 32px; margin-bottom: 1rem; border-radius: 20px;"></div>
      <div class="skeleton skeleton--text" style="width: 30%; height: 20px; float: left;"></div>
      <div class="skeleton skeleton--text" style="width: 30%; height: 20px; float: right;"></div>
    </div>
  `).join('');
}

async function initMarkets() {
  const grid = document.getElementById('markets-grid');
  const tabs = document.querySelectorAll('#market-filters .tab');
  
  if (!grid) return;

  let currentFilter = 'active';

  // Load initial data
  await loadMarkets(currentFilter, grid);

  // Setup tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', async (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      
      currentFilter = e.target.dataset.filter;
      grid.innerHTML = renderSkeletons(6);
      await loadMarkets(currentFilter, grid);
    });
  });
}

async function loadMarkets(filter, gridElement) {
  try {
    const params = {};
    if (filter !== 'all') {
      params.status = filter;
    }
    
    // Convert 'resolved' filter to match backend representation if needed, 
    // or backend handles it. Assuming backend handles it.
    
    const data = await milestones.list(params);
    
    if (!data || data.length === 0) {
      gridElement.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state__icon">🏜️</div>
          <h2 class="empty-state__title">No Markets Found</h2>
          <p class="empty-state__text">Looks like there are no ${filter} markets right now.</p>
          <a href="#/agent" class="btn btn--primary">Be the First</a>
        </div>
      `;
      return;
    }

    gridElement.innerHTML = data.map(renderMarketCard).join('');
    
    // Start countdown timers
    startTimers(data);
    
  } catch (err) {
    console.error('Failed to load markets:', err);
    gridElement.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; color: var(--no-red);">
        <div class="empty-state__icon">❌</div>
        <h2 class="empty-state__title">Error Loading Markets</h2>
        <p class="empty-state__text">${err.message || 'Failed to connect to backend'}</p>
        <button class="btn btn--secondary" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }
}

function renderMarketCard(m) {
  const totalPool = m.total_supply || (m.total_yes || 0) + (m.total_no || 0); // Need to format properly
  const totalYes = m.total_yes || 0;
  const totalNo = m.total_no || 0;
  const totalBets = totalYes + totalNo;
  
  let yesPercent = 50;
  if (totalBets > 0) {
    yesPercent = Math.round((totalYes / totalBets) * 100);
  }

  // Handle status badge
  let badgeHtml = '';
  if (m.status === 'active') badgeHtml = `<span class="badge badge--active">● LIVE</span>`;
  else if (m.status === 'pending_resolution') badgeHtml = `<span class="badge badge--pending">⏳ PENDING VERIFICATION</span>`;
  else if (m.status === 'resolved') {
    if (m.resolution === 'yes') badgeHtml = `<span class="badge badge--resolved-yes">✅ RESOLVED YES</span>`;
    else badgeHtml = `<span class="badge badge--resolved-no">❌ RESOLVED NO</span>`;
  } else if (m.status === 'expired') {
    badgeHtml = `<span class="badge badge--expired">⚠️ EXPIRED</span>`;
  }

  return `
    <div class="market-card" onclick="window.location.hash='#/milestone/${m.id}'">
      <div class="market-card__header">
        <span class="badge badge--ticker">${m.token_ticker}</span>
        ${badgeHtml}
      </div>
      
      <h3 class="market-card__title">${m.title}</h3>
      
      <div class="market-card__creator">
        <div class="avatar avatar--sm" style="background: ${getAvatarColor(m.creator_wallet)}; font-size: 10px;">
          ${m.creator_wallet.slice(2,4).toUpperCase()}
        </div>
        ${formatAddress(m.creator_wallet)}
      </div>
      
      <div class="pool-bar" style="height: 32px;">
        <div class="pool-bar__yes" style="width: ${yesPercent}%">
          <span class="pool-bar__label">YES ${yesPercent}%</span>
        </div>
        <div class="pool-bar__no" style="width: ${100 - yesPercent}%">
          <span class="pool-bar__label">NO ${100 - yesPercent}%</span>
        </div>
      </div>
      
      <div class="market-card__meta">
        <span class="market-card__meta-item">
          💰 ${totalBets ? totalBets.toFixed(2) : 0} OKB
        </span>
        <span class="market-card__meta-item countdown-timer" data-deadline="${m.deadline}" id="timer-${m.id}">
          ⏱️ ...
        </span>
      </div>
      
      ${m.status === 'active' ? `
        <div class="market-card__footer">
          <button class="market-card__bet-btn market-card__bet-btn--yes">Bet YES</button>
          <button class="market-card__bet-btn market-card__bet-btn--no">Bet NO</button>
        </div>
      ` : `
        <div class="market-card__footer">
          <button class="btn btn--secondary btn--full">View Details</button>
        </div>
      `}
    </div>
  `;
}

function startTimers(markets) {
  // Clear any existing interval
  if (window.marketTimerInterval) clearInterval(window.marketTimerInterval);
  
  const updateTimers = () => {
    markets.forEach(m => {
      const el = document.getElementById(`timer-${m.id}`);
      if (!el) return;
      
      if (m.status !== 'active') {
        el.innerHTML = '🏁 Finished';
        return;
      }
      
      const { text, expired, urgent } = getCountdown(m.deadline);
      
      if (expired) {
        el.innerHTML = '⚠️ Expired';
        el.classList.add('countdown--urgent');
      } else {
        el.innerHTML = `⏱️ ${text}`;
        if (urgent) el.classList.add('countdown--urgent');
        else el.classList.remove('countdown--urgent');
      }
    });
  };
  
  updateTimers();
  window.marketTimerInterval = setInterval(updateTimers, 60000); // Update every minute
}

// Helpers 
function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getAvatarColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash % 360)}, 70%, 55%)`;
}
