// =============================================
// RockBottom — Leaderboard Page
// =============================================

import { users } from '../utils/api.js';
import { formatOKB } from '../utils/helpers.js';
import { formatAddress, getAvatarColor } from '../utils/wallet.js';

export async function renderLeaderboard() {
  let html = `
    <div class="leaderboard-page">
      <div class="hero" style="padding: var(--space-10) 0;">
        <h1 class="hero__title">The <span class="text-gradient">Arena</span></h1>
        <p class="hero__subtitle">Top executors ranked by their verified on-chain score.</p>
      </div>

      <div class="card" style="padding: 0; overflow: hidden;" id="leaderboard-content">
        <div style="display: flex; justify-content: center; padding: var(--space-20);">
          <div class="spinner spinner--lg"></div>
        </div>
      </div>
    </div>
  `;

  setTimeout(loadLeaderboard, 0);

  return html;
}

async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-content');
  if (!container) return;

  try {
    const data = await users.leaderboard();

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: var(--space-10);">
          <h2 class="empty-state__title">Arena is Empty</h2>
          <p class="empty-state__text">No ranked users found.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; padding: var(--space-4) var(--space-6); background: var(--bg-secondary); border-bottom: 1px solid var(--glass-border); font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">
        <div style="width: 40px; text-align: center; margin-right: var(--space-4);">Rank</div>
        <div style="flex: 1;">User</div>
        <div style="width: 120px; text-align: right; margin-right: var(--space-6);">Completed</div>
        <div style="width: 120px; text-align: right; margin-right: var(--space-6);">Earned</div>
        <div style="width: 100px; text-align: right;">Score</div>
      </div>
      <div>
        ${data.map((user, idx) => renderRow(user, idx + 1)).join('')}
      </div>
    `;

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state" style="padding: var(--space-10);">
        <h2 class="empty-state__title">Error</h2>
        <p class="empty-state__text">${err.message}</p>
      </div>
    `;
  }
}

function renderRow(user, rank) {
  let rankClass = '';
  if (rank === 1) rankClass = 'leaderboard-row__rank--1';
  else if (rank === 2) rankClass = 'leaderboard-row__rank--2';
  else if (rank === 3) rankClass = 'leaderboard-row__rank--3';

  return `
    <div class="leaderboard-row" style="border-radius: 0; border: none; border-bottom: 1px solid var(--glass-border);">
      <div class="leaderboard-row__rank ${rankClass}">
        ${rank}
      </div>
      
      <div class="leaderboard-row__user">
        <div class="avatar avatar--sm" style="background: ${getAvatarColor(user.wallet_address)}; font-size: 10px;">
          ${user.wallet_address.slice(2,4).toUpperCase()}
        </div>
        <div>
          <div class="leaderboard-row__name">${user.display_name || formatAddress(user.wallet_address)}</div>
          <div class="leaderboard-row__wallet">${formatAddress(user.wallet_address)}</div>
        </div>
      </div>

      <div class="leaderboard-row__stats" style="flex: 1; justify-content: flex-end;">
        <div class="leaderboard-row__stat" style="width: 120px;">
          <div class="leaderboard-row__stat-value" style="color: var(--yes-green);">${user.milestones_completed}</div>
        </div>
        
        <div class="leaderboard-row__stat" style="width: 120px;">
          <div class="leaderboard-row__stat-value">${formatOKB(user.total_earned)}</div>
        </div>

        <div class="leaderboard-row__stat" style="width: 100px;">
          <div class="leaderboard-row__stat-value text-gradient" style="font-size: var(--text-lg);">${Math.round(user.execution_score)}</div>
        </div>
      </div>
    </div>
  `;
}
