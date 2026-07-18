// =============================================
// RockBottom — User Profile Page
// =============================================

import { users, bets, milestones } from '../utils/api.js';
import { formatOKB, timeAgo } from '../utils/helpers.js';
import { formatAddress, getAvatarColor } from '../utils/wallet.js';

export async function renderProfile(wallet) {
  if (!wallet) {
    return `
      <div class="empty-state">
        <h2 class="empty-state__title">Connect Wallet</h2>
        <p class="empty-state__text">Please connect your wallet to view your profile.</p>
        <button class="btn btn--primary" onclick="document.getElementById('wallet-btn').click()">Connect</button>
      </div>
    `;
  }

  let html = `
    <div class="profile-page" id="profile-content">
      <div style="display: flex; justify-content: center; padding: var(--space-20);">
        <div class="spinner spinner--lg"></div>
      </div>
    </div>
  `;

  setTimeout(() => loadProfileData(wallet), 0);

  return html;
}

async function loadProfileData(wallet) {
  const container = document.getElementById('profile-content');
  if (!container) return;

  try {
    const user = await users.get(wallet);
    const userBets = await bets.byUser(wallet);
    
    // We don't have a direct endpoint for "milestones by user" in the prompt, 
    // but listMilestones might support filtering, or we just render stats.
    
    container.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-8); padding: var(--space-8); display: flex; gap: var(--space-8); align-items: center; flex-wrap: wrap;">
        
        <!-- Avatar & Score Ring -->
        <div class="score-ring" style="width: 120px; height: 120px; flex-shrink: 0;">
          <svg width="120" height="120" class="score-ring__svg">
            <circle cx="60" cy="60" r="54" stroke-width="8" class="score-ring__bg" />
            <circle cx="60" cy="60" r="54" stroke-width="8" class="score-ring__fill" 
                    style="stroke: ${getScoreColor(user.execution_score)}; stroke-dasharray: 339; stroke-dashoffset: ${339 - (339 * user.execution_score / 100)};" />
          </svg>
          <div class="score-ring__value" style="font-size: var(--text-2xl); color: ${getScoreColor(user.execution_score)};">
            ${Math.round(user.execution_score)}
          </div>
          <div style="position: absolute; bottom: -24px; font-size: var(--text-xs); color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">
            Execution Score
          </div>
        </div>

        <div style="flex: 1;">
          <h1 style="font-size: var(--text-3xl); margin-bottom: var(--space-2); display: flex; align-items: center; gap: var(--space-3);">
            <div class="avatar" style="background: ${getAvatarColor(user.wallet_address)}; font-size: var(--text-lg);">${user.wallet_address.slice(2,4).toUpperCase()}</div>
            ${formatAddress(user.wallet_address)}
          </h1>
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">Joined ${new Date(user.created_at).toLocaleDateString()}</p>
          
          <div style="display: flex; gap: var(--space-2);">
            ${getBadges(user.execution_score)}
          </div>
        </div>
      </div>

      <div class="grid grid--4" style="margin-bottom: var(--space-8);">
        <div class="card card--glass">
          <div class="stat">
            <span class="stat__label">Milestones Created</span>
            <span class="stat__value text-gradient">${user.milestones_created}</span>
          </div>
        </div>
        <div class="card card--glass">
          <div class="stat">
            <span class="stat__label">Completed / Failed</span>
            <span class="stat__value"><span style="color: var(--yes-green)">${user.milestones_completed}</span> / <span style="color: var(--no-red)">${user.milestones_failed}</span></span>
          </div>
        </div>
        <div class="card card--glass">
          <div class="stat">
            <span class="stat__label">Total Staked</span>
            <span class="stat__value">${formatOKB(user.total_staked)}</span>
          </div>
        </div>
        <div class="card card--glass">
          <div class="stat">
            <span class="stat__label">Total Earned</span>
            <span class="stat__value" style="color: var(--accent-cyan);">${formatOKB(user.total_earned)}</span>
          </div>
        </div>
      </div>

      <div class="section-header">
        <h2 class="section-header__title">Recent <span class="text-gradient">Bets</span></h2>
      </div>

      <div class="card" style="padding: 0; overflow: hidden;">
        ${renderBetHistory(userBets)}
      </div>
    `;

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <h2 class="empty-state__title">Error Loading Profile</h2>
        <p class="empty-state__text">${err.message}</p>
      </div>
    `;
  }
}

function getScoreColor(score) {
  if (score >= 80) return 'var(--yes-green)';
  if (score >= 50) return 'var(--accent-cyan)';
  if (score >= 30) return 'var(--warning-yellow)';
  return 'var(--no-red)';
}

function getBadges(score) {
  let html = '';
  if (score >= 80) html += `<span class="badge" style="background: rgba(50, 205, 100, 0.15); color: var(--yes-green);">🏆 TOP EXECUTOR</span>`;
  if (score < 30) html += `<span class="badge" style="background: rgba(220, 53, 69, 0.15); color: var(--no-red);">⚠️ HIGH RISK</span>`;
  return html || `<span class="badge" style="background: var(--glass-bg); color: var(--text-secondary);">Rookie</span>`;
}

function renderBetHistory(bets) {
  if (!bets || bets.length === 0) {
    return `
      <div class="empty-state" style="padding: var(--space-8);">
        <p class="empty-state__text">No betting history yet.</p>
        <a href="#/markets" class="btn btn--secondary mt-4">Find Markets</a>
      </div>
    `;
  }

  const rows = bets.map(bet => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--glass-border);">
      <div style="display: flex; align-items: center; gap: var(--space-4);">
        <div class="activity-item__icon ${bet.side === 'yes' ? 'activity-item__icon--yes' : 'activity-item__icon--no'}">
          ${bet.side.toUpperCase()}
        </div>
        <div>
          <a href="#/milestone/${bet.milestone_id}" style="color: var(--text-primary); font-weight: 600; display: block; margin-bottom: 2px;">
            Milestone Target
          </a>
          <span style="font-size: var(--text-xs); color: var(--text-tertiary);">${timeAgo(bet.placed_at)}</span>
        </div>
      </div>
      <div style="text-align: right; font-family: var(--font-mono); font-weight: 700;">
        ${bet.amount.toFixed(4)} OKB
      </div>
    </div>
  `).join('');

  return rows;
}
