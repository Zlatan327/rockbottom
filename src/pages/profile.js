// =============================================
// RockBottom — User Profile Page
// =============================================

import { users, bets, milestones } from '../utils/api.js';
import { formatOKB, timeAgo } from '../utils/helpers.js';
import { formatAddress, getAvatarColor } from '../utils/wallet.js';

window.handleEditProfile = (wallet) => {
  const modalHtml = `
    <div id="edit-profile-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
      <div class="card" style="width: 100%; max-width: 400px; padding: var(--space-6);">
        <h2 style="margin-bottom: var(--space-4);">Edit Profile</h2>
        <div style="margin-bottom: var(--space-4);">
          <label style="display: block; font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-2);">Username</label>
          <input type="text" id="edit-username" class="chat__input" placeholder="e.g. CryptoKing" style="width: 100%; min-height: 44px; max-height: 44px;">
        </div>
        <div style="margin-bottom: var(--space-6);">
          <label style="display: block; font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-2);">PFP Emoji</label>
          <input type="text" id="edit-emoji" class="chat__input" placeholder="e.g. 🦊" style="width: 100%; min-height: 44px; max-height: 44px;" maxlength="4">
        </div>
        <div style="display: flex; gap: var(--space-3); justify-content: flex-end;">
          <button class="btn btn--secondary" onclick="document.getElementById('edit-profile-modal').remove()">Cancel</button>
          <button class="btn btn--primary" id="save-profile-btn">Save</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  document.getElementById('save-profile-btn').onclick = async () => {
    const display_name = document.getElementById('edit-username').value;
    const avatar_seed = document.getElementById('edit-emoji').value;
    
    try {
      const updates = {};
      if (display_name) updates.display_name = display_name;
      if (avatar_seed) updates.avatar_seed = avatar_seed;
      
      document.getElementById('save-profile-btn').innerText = 'Saving...';
      await users.update(wallet, updates);
      document.getElementById('edit-profile-modal').remove();
      setTimeout(() => window.location.reload(), 100);
    } catch(e) {
      alert("Failed to update profile: " + e.message);
      document.getElementById('save-profile-btn').innerText = 'Save';
    }
  };
};

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
    
    const connectedWallet = localStorage.getItem('rb_wallet');
    const isOwner = connectedWallet?.toLowerCase() === wallet.toLowerCase();
    const displayName = (user.display_name && !user.display_name.startsWith('Anon_')) ? user.display_name : formatAddress(user.wallet_address);
    const isEmoji = user.avatar_seed && [...user.avatar_seed].length <= 2;
    const avatarContent = isEmoji ? user.avatar_seed : user.wallet_address.slice(2,4).toUpperCase();
    const editBtnHtml = isOwner ? `<button class="btn btn--secondary btn--sm" onclick="handleEditProfile('${wallet}')" style="margin-left: auto;">Edit Profile</button>` : '';
    
    container.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-8); padding: var(--space-8); display: flex; gap: var(--space-8); align-items: center; flex-wrap: wrap;">
        
        <!-- Avatar & Score Ring -->
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-3); flex-shrink: 0;">
          <div class="score-ring" style="width: 120px; height: 120px;">
            <svg width="120" height="120" class="score-ring__svg">
              <circle cx="60" cy="60" r="54" stroke-width="8" class="score-ring__bg" />
              <circle cx="60" cy="60" r="54" stroke-width="8" class="score-ring__fill" 
                      style="stroke: ${getScoreColor(user.execution_score)}; stroke-dasharray: 339; stroke-dashoffset: ${339 - (339 * user.execution_score / 100)};" />
            </svg>
            <div class="score-ring__value" style="font-size: var(--text-2xl); color: ${getScoreColor(user.execution_score)};">
              ${Math.round(user.execution_score)}
            </div>
          </div>
          <div style="font-size: var(--text-xs); color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">
            Execution Score
          </div>
        </div>

        <div style="flex: 1; min-width: 250px;">
          <h1 style="font-size: var(--text-3xl); margin-bottom: var(--space-2); display: flex; align-items: center; gap: var(--space-3);">
            <div class="avatar" style="background: ${getAvatarColor(user.wallet_address)}; font-size: var(--text-lg); display: flex; align-items: center; justify-content: center;">
              ${avatarContent}
            </div>
            ${displayName}
            ${editBtnHtml}
          </h1>
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4); display: flex; align-items: center; gap: var(--space-2);">
            <span style="font-family: var(--font-mono);">${formatAddress(user.wallet_address)}</span> • Joined ${new Date(user.created_at).toLocaleDateString()}
          </p>
          
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
