// =============================================
// RockBottom — Milestone Detail Page
// =============================================

import { milestones, bets } from '../utils/api.js';
import { state, showToast, showModal, closeModal } from '../main.js';
import { getCountdown, formatOKB, timeAgo, stringToColor } from '../utils/helpers.js';
import { formatAddress } from '../utils/wallet.js';
import { getSocket } from '../utils/socket.js';
import { renderBetModal } from '../components/bet-modal.js';

let currentMilestone = null;

export async function renderMilestoneDetail(id) {
  if (!id) return `<div class="empty-state">Invalid milestone ID</div>`;

  let html = `
    <div class="milestone-detail-page">
      <div id="detail-content">
        <div style="display: flex; justify-content: center; padding: var(--space-20);">
          <div class="spinner spinner--lg"></div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => loadMilestoneDetails(id), 0);

  return html;
}

async function loadMilestoneDetails(id) {
  const container = document.getElementById('detail-content');
  if (!container) return;

  try {
    const data = await milestones.get(id);
    currentMilestone = data;
    
    // Load bets
    let recentBets = [];
    try {
      recentBets = await bets.byMilestone(id);
    } catch(e) {
      console.warn('Failed to load bets', e);
    }

    container.innerHTML = renderContent(data, recentBets);
    
    // Attach event listeners
    attachEventListeners(data);
    
    // Setup socket room
    const socket = getSocket();
    if (socket) {
      socket.emit('join:room', `milestone:${id}`);
      
      socket.on('pool:update', (update) => {
        if (update.milestoneId === id) {
          updatePoolUI(update.totalYes, update.totalNo);
          // Prepend new bet to activity
          if (update.bet) prependBetActivity(update.bet);
        }
      });
      
      socket.on('milestone:resolved', (data) => {
        if (data.id === id) {
          showToast(`Milestone resolved: ${data.resolution.toUpperCase()}`, 'info');
          setTimeout(() => loadMilestoneDetails(id), 2000);
        }
      });
    }

  } catch (err) {
    console.error('Failed to load milestone:', err);
    container.innerHTML = `
      <div class="empty-state" style="color: var(--no-red);">
        <div class="empty-state__icon">❌</div>
        <h2 class="empty-state__title">Milestone Not Found</h2>
        <p class="empty-state__text">${err.message}</p>
        <button class="btn btn--secondary" onclick="window.location.hash='#/markets'">Back to Markets</button>
      </div>
    `;
  }
}

function renderContent(m, recentBets) {
  const totalYes = m.total_yes || 0;
  const totalNo = m.total_no || 0;
  const totalBets = totalYes + totalNo;
  
  let yesPercent = 50;
  if (totalBets > 0) yesPercent = Math.round((totalYes / totalBets) * 100);
  
  const { text: timerText, expired, urgent } = getCountdown(m.deadline);
  
  let statusBadge = '';
  if (m.status === 'active') statusBadge = `<span class="badge badge--active">● LIVE</span>`;
  else if (m.status === 'pending_resolution') statusBadge = `<span class="badge badge--pending">⏳ PENDING VERIFICATION</span>`;
  else if (m.status === 'resolved') {
    statusBadge = m.resolution === 'yes' 
      ? `<span class="badge badge--resolved-yes">✅ RESOLVED YES</span>`
      : `<span class="badge badge--resolved-no">❌ RESOLVED NO</span>`;
  } else if (m.status === 'expired') {
    statusBadge = `<span class="badge badge--expired">⚠️ EXPIRED</span>`;
  }

  // Determine if user is creator
  const isCreator = state.wallet && m.creator_wallet && state.wallet.toLowerCase() === m.creator_wallet.toLowerCase();

  return `
    <div class="detail-header" style="margin-bottom: var(--space-8);">
      <button class="btn btn--ghost btn--sm" onclick="window.history.back()" style="margin-bottom: var(--space-4);">
        ← Back
      </button>
      
      <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4);">
        <span class="badge badge--ticker">${m.token_ticker}</span>
        ${statusBadge}
        <span class="badge" style="background: var(--bg-tertiary);">Contract: ${formatAddress(m.token_contract)}</span>
      </div>
      
      <h1 style="font-size: var(--text-4xl); margin-bottom: var(--space-4);">${m.title}</h1>
      
      <div style="display: flex; align-items: center; gap: var(--space-6); color: var(--text-secondary);">
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <div class="avatar avatar--sm" style="background: ${stringToColor(m.creator_wallet)};">${m.creator_wallet.slice(2,4).toUpperCase()}</div>
          <a href="#/profile/${m.creator_wallet}" style="color: var(--text-primary);">Creator: ${formatAddress(m.creator_wallet)}</a>
        </div>
        <div>🗓️ Created: ${new Date(m.created_at).toLocaleDateString()}</div>
        <div class="countdown ${urgent && !expired ? 'countdown--urgent' : ''}">
          ⏱️ Deadline: ${expired ? 'Expired' : timerText}
        </div>
      </div>
    </div>

    <div class="grid grid--3">
      <!-- Main Content Column -->
      <div style="grid-column: span 2;">
        
        <!-- Description & Proof Req Card -->
        <div class="card" style="margin-bottom: var(--space-6);">
          <h3 style="margin-bottom: var(--space-4);">The Goal</h3>
          <p style="color: var(--text-secondary); line-height: 1.8; margin-bottom: var(--space-6); font-size: var(--text-lg);">
            ${m.description}
          </p>
          
          <div style="background: rgba(163, 102, 255, 0.05); border: 1px solid rgba(163, 102, 255, 0.2); padding: var(--space-4); border-radius: var(--radius-md);">
            <h4 style="color: var(--accent-purple); font-size: var(--text-sm); text-transform: uppercase; margin-bottom: var(--space-2);">
              🎯 Proof Requirements
            </h4>
            <p style="color: var(--text-primary);">${m.proof_requirements}</p>
          </div>
        </div>
        
        <!-- Pool Visualization -->
        <div class="card" style="margin-bottom: var(--space-6);">
          <div class="section-header" style="margin-bottom: var(--space-4);">
            <h3 class="section-header__title">Market <span class="text-gradient">Pool</span></h3>
            <div style="font-family: var(--font-mono); font-size: var(--text-xl); font-weight: 700;">
              Total: <span id="ui-total-pool">${totalBets.toFixed(2)} OKB</span>
            </div>
          </div>
          
          <div class="pool-bar" style="height: 48px; margin-bottom: var(--space-4);">
            <div class="pool-bar__yes" id="ui-pool-yes" style="width: ${yesPercent}%">
              <span class="pool-bar__label" style="font-size: var(--text-lg);">YES <span id="ui-pct-yes">${yesPercent}</span>%</span>
            </div>
            <div class="pool-bar__no" id="ui-pool-no" style="width: ${100 - yesPercent}%">
              <span class="pool-bar__label" style="font-size: var(--text-lg);">NO <span id="ui-pct-no">${100 - yesPercent}</span>%</span>
            </div>
          </div>
          
          <div class="pool-stats">
            <div class="pool-stats__side pool-stats__side--yes">
              <span>YES Pool:</span> <strong id="ui-amt-yes">${totalYes.toFixed(2)} OKB</strong>
            </div>
            <div class="pool-stats__side pool-stats__side--no">
              <span>NO Pool:</span> <strong id="ui-amt-no">${totalNo.toFixed(2)} OKB</strong>
            </div>
          </div>
        </div>

        <!-- Activity Feed -->
        <div class="card">
          <h3 style="margin-bottom: var(--space-4);">Recent Activity</h3>
          <div id="activity-feed">
            ${renderActivityFeed(m, recentBets)}
          </div>
        </div>

      </div>
      
      <!-- Right Sidebar (Action Panel) -->
      <div>
        <div style="position: sticky; top: calc(var(--nav-height) + var(--space-6));">
          
          <!-- Action Panel -->
          <div class="bet-panel">
            ${renderActionPanel(m, isCreator, expired)}
          </div>
          
        </div>
      </div>
    </div>
  `;
}

function renderActionPanel(m, isCreator, expired) {
  if (m.status === 'active' && !expired) {
    if (isCreator) {
      return `
        <h3 style="margin-bottom: var(--space-4);">Your Milestone</h3>
        <p style="color: var(--text-secondary); margin-bottom: var(--space-4); font-size: var(--text-sm);">
          You cannot bet on your own milestone. Focus on executing!
        </p>
        <button class="btn btn--primary btn--full btn--lg" id="submit-proof-btn">
          Submit Proof
        </button>
      `;
    }
    
    return `
      <h3 style="margin-bottom: var(--space-4);">Place Your Bet</h3>
      <button class="btn btn--yes btn--full btn--lg" style="margin-bottom: var(--space-3);" onclick="openBetModal('yes')">
        Bet YES
      </button>
      <button class="btn btn--no btn--full btn--lg" onclick="openBetModal('no')">
        Bet NO
      </button>
      <div style="background: rgba(163, 102, 255, 0.05); border: 1px solid rgba(163, 102, 255, 0.2); padding: var(--space-3); border-radius: var(--radius-md); margin-top: var(--space-4);">
        <p style="text-align: center; color: var(--text-secondary); font-size: var(--text-xs);">
          <strong>Tokenomics:</strong> Winning bets yield <strong>${m.token_ticker}</strong> tokens mathematically backed by the entire OKB pool. Sell tokens back to the pool to claim OKB at the floor price!
        </p>
      </div>
      <p style="text-align: center; color: var(--text-tertiary); font-size: var(--text-xs); margin-top: var(--space-4);">
        Connect wallet to bet. Gas fees apply on X Layer.
      </p>
    `;
  }
  
  if (m.status === 'active' && expired) {
    if (isCreator) {
       return `
        <h3 style="margin-bottom: var(--space-4);">Deadline Passed</h3>
        <p style="color: var(--warning-yellow); margin-bottom: var(--space-4); font-size: var(--text-sm);">
          The deadline has passed. Submit your proof now for verification.
        </p>
        <button class="btn btn--primary btn--full btn--lg" id="submit-proof-btn">
          Submit Proof
        </button>
      `;
    }
    return `
      <div class="empty-state" style="padding: var(--space-6) 0;">
        <div class="empty-state__icon" style="font-size: 2rem;">⌛</div>
        <h3 style="margin-bottom: var(--space-2);">Trading Closed</h3>
        <p style="color: var(--text-secondary); font-size: var(--text-sm);">
          The deadline has passed. Awaiting proof submission and resolution.
        </p>
      </div>
    `;
  }
  
  if (m.status === 'pending_resolution') {
    return `
      <div class="empty-state" style="padding: var(--space-6) 0;">
        <div class="spinner" style="margin: 0 auto var(--space-4);"></div>
        <h3 style="margin-bottom: var(--space-2); color: var(--accent-purple);">AI Verifying</h3>
        <p style="color: var(--text-secondary); font-size: var(--text-sm);">
          Proof has been submitted. The RockBottom Agent is currently analyzing the evidence.
        </p>
      </div>
    `;
  }
  
  if (m.status === 'resolved') {
    const isYes = m.resolution === 'yes';
    const color = isYes ? 'var(--yes-green)' : 'var(--no-red)';
    const text = isYes ? 'SUCCESS!' : 'FAILED';
    return `
      <div class="empty-state" style="padding: var(--space-6) 0;">
        <div class="empty-state__icon" style="font-size: 3rem;">${isYes ? '🎉' : '💀'}</div>
        <h3 style="margin-bottom: var(--space-2); color: ${color};">${text}</h3>
        <p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-4);">
          This milestone has been resolved. Winners can claim their payout in <strong>${m.token_ticker}</strong>.
        </p>
        <button class="btn btn--secondary btn--full" id="claim-btn" style="margin-bottom: var(--space-3);">
          Claim ${m.token_ticker} Winnings
        </button>
        <button class="btn btn--ghost btn--full" id="sell-btn">
          Sell Tokens for OKB
        </button>
      </div>
    `;
  }
  
  return '';
}

function renderActivityFeed(m, recentBets) {
  let items = [];
  
  // Resolution event
  if (m.resolved_at) {
    items.push(`
      <div class="activity-item">
        <div class="activity-item__icon ${m.resolution === 'yes' ? 'activity-item__icon--yes' : 'activity-item__icon--no'}">
          ${m.resolution === 'yes' ? '✅' : '❌'}
        </div>
        <div class="activity-item__text">
          Milestone resolved to <strong>${m.resolution.toUpperCase()}</strong> by AI verification
        </div>
        <div class="activity-item__time">${timeAgo(m.resolved_at)}</div>
      </div>
    `);
  }
  
  // Status changes
  if (m.status === 'pending_resolution' || m.resolved_at) {
     items.push(`
      <div class="activity-item">
        <div class="activity-item__icon activity-item__icon--proof">📄</div>
        <div class="activity-item__text">
          Proof submitted by creator for verification
        </div>
      </div>
    `);
  }
  
  // Bets
  if (recentBets && recentBets.length > 0) {
    const betHtml = recentBets.map(bet => `
      <div class="activity-item bet-item">
        <div class="activity-item__icon ${bet.side === 'yes' ? 'activity-item__icon--yes' : 'activity-item__icon--no'}">
          ${bet.side === 'yes' ? '📈' : '📉'}
        </div>
        <div class="activity-item__text">
          <strong>${formatAddress(bet.user_wallet)}</strong> bet <strong>${bet.amount} OKB</strong> on ${bet.side.toUpperCase()}
        </div>
        <div class="activity-item__time">${timeAgo(bet.placed_at)}</div>
      </div>
    `).join('');
    items.push(betHtml);
  }
  
  // Creation event
  items.push(`
    <div class="activity-item">
      <div class="activity-item__icon" style="background: rgba(163, 102, 255, 0.12);">🚀</div>
      <div class="activity-item__text">
        Milestone created and token <strong>${m.token_ticker}</strong> launched
      </div>
      <div class="activity-item__time">${timeAgo(m.created_at)}</div>
    </div>
  `);
  
  return items.join('');
}

function attachEventListeners(m) {
  // Expose to global so inline onclicks work
  window.openBetModal = (side) => {
    if (!state.wallet) {
      showToast('Please connect your wallet first', 'warning');
      // Trigger wallet connect click
      document.getElementById('wallet-btn').click();
      return;
    }
    showModal(renderBetModal(m, side));
    
    // Quick attach logic for bet modal
    setTimeout(() => {
      import('../components/bet-modal.js').then(module => {
        module.initBetModal(m);
      });
    }, 50);
  };
  
  const submitBtn = document.getElementById('submit-proof-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      window.location.hash = `#/proof-submit/${m.id}`;
    });
  }
  
  const claimBtn = document.getElementById('claim-btn');
  if (claimBtn) {
    claimBtn.addEventListener('click', () => {
      if (!state.wallet) {
        showToast('Please connect your wallet first', 'warning');
        return;
      }
      showToast(`Initiating claim for ${m.token_ticker} tokens...`, 'info');
      // This would hook into contract claim function
      setTimeout(() => {
        showToast(`Successfully claimed ${m.token_ticker}!`, 'success');
      }, 2000);
    });
  }

  const sellBtn = document.getElementById('sell-btn');
  if (sellBtn) {
    sellBtn.addEventListener('click', () => {
      if (!state.wallet) {
        showToast('Please connect your wallet first', 'warning');
        return;
      }
      showToast(`Burning ${m.token_ticker} to redeem OKB...`, 'info');
      setTimeout(() => {
        showToast('Successfully redeemed OKB!', 'success');
      }, 2000);
    });
  }
}

// Socket updates
function updatePoolUI(totalYes, totalNo) {
  const totalBets = totalYes + totalNo;
  let yesPercent = 50;
  if (totalBets > 0) yesPercent = Math.round((totalYes / totalBets) * 100);
  
  const uiTotal = document.getElementById('ui-total-pool');
  const uiPoolYes = document.getElementById('ui-pool-yes');
  const uiPoolNo = document.getElementById('ui-pool-no');
  const uiPctYes = document.getElementById('ui-pct-yes');
  const uiPctNo = document.getElementById('ui-pct-no');
  const uiAmtYes = document.getElementById('ui-amt-yes');
  const uiAmtNo = document.getElementById('ui-amt-no');
  
  if(uiTotal) uiTotal.textContent = `${totalBets.toFixed(2)} OKB`;
  if(uiPoolYes) uiPoolYes.style.width = `${yesPercent}%`;
  if(uiPoolNo) uiPoolNo.style.width = `${100 - yesPercent}%`;
  if(uiPctYes) uiPctYes.textContent = yesPercent;
  if(uiPctNo) uiPctNo.textContent = 100 - yesPercent;
  if(uiAmtYes) uiAmtYes.textContent = `${totalYes.toFixed(2)} OKB`;
  if(uiAmtNo) uiAmtNo.textContent = `${totalNo.toFixed(2)} OKB`;
}

function prependBetActivity(bet) {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  
  const div = document.createElement('div');
  div.className = 'activity-item bet-item';
  div.innerHTML = `
    <div class="activity-item__icon ${bet.side === 'yes' ? 'activity-item__icon--yes' : 'activity-item__icon--no'}">
      ${bet.side === 'yes' ? '📈' : '📉'}
    </div>
    <div class="activity-item__text">
      <strong>${formatAddress(bet.user_wallet)}</strong> bet <strong>${bet.amount} OKB</strong> on ${bet.side.toUpperCase()}
    </div>
    <div class="activity-item__time">Just now</div>
  `;
  
  feed.insertBefore(div, feed.firstChild);
}

// Cleanup on unmount
window.addEventListener('hashchange', () => {
  const socket = getSocket();
  if (socket && currentMilestone) {
    socket.emit('leave:room', `milestone:${currentMilestone.id}`);
  }
});
