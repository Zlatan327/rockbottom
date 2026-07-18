// =============================================
// RockBottom — Bet Modal Component
// =============================================

import { estimateReturn } from '../utils/helpers.js';
import { bets } from '../utils/api.js';
import { state, showToast, closeModal } from '../main.js';
import { POOL_ABI } from '../utils/contracts.js';
import { ethers } from 'ethers';

export function renderBetModal(milestone, initialSide) {
  const totalYes = milestone.total_yes || 0;
  const totalNo = milestone.total_no || 0;
  
  return `
    <div class="modal__header">
      <h2 class="modal__title">Place Bet</h2>
      <button class="modal__close" onclick="document.getElementById('modal-overlay').classList.remove('open')">✕</button>
    </div>
    
    <div class="bet-modal-content">
      <div style="margin-bottom: var(--space-4);">
        <h3 style="font-size: var(--text-base); margin-bottom: var(--space-1);">${milestone.title}</h3>
        <p style="color: var(--text-secondary); font-size: var(--text-sm);">Ticker: ${milestone.token_ticker}</p>
      </div>

      <div class="bet-panel__toggle" id="bet-side-toggle">
        <button class="bet-panel__toggle-btn ${initialSide === 'yes' ? 'active--yes' : ''}" data-side="yes">YES</button>
        <button class="bet-panel__toggle-btn ${initialSide === 'no' ? 'active--no' : ''}" data-side="no">NO</button>
      </div>

      <div class="bet-panel__amount">
        <div class="bet-panel__amount-label">
          <span>Amount</span>
          <span>Balance: <span id="wallet-balance">-- OKB</span></span>
        </div>
        <div style="position: relative;">
          <input type="number" id="bet-amount-input" class="bet-panel__amount-input" placeholder="0.0" min="0.001" step="0.01">
          <span style="position: absolute; right: var(--space-4); top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-weight: 600;">OKB</span>
        </div>
        <div class="bet-panel__quick-amounts">
          <button class="bet-panel__quick-btn" data-amt="1">1</button>
          <button class="bet-panel__quick-btn" data-amt="10">10</button>
          <button class="bet-panel__quick-btn" data-amt="50">50</button>
          <button class="bet-panel__quick-btn" data-amt="max">MAX</button>
        </div>
      </div>

      <div class="bet-panel__estimate">
        <div class="bet-panel__estimate-row">
          <span>Est. Return if Correct</span>
          <span style="color: var(--yes-green);" id="est-return-pct">0.00%</span>
        </div>
        <div class="bet-panel__estimate-row">
          <span>Potential Payout</span>
          <span id="est-payout">0.00 OKB</span>
        </div>
      </div>

      <button class="btn btn--primary btn--full btn--lg" id="confirm-bet-btn">
        Confirm & Sign Transaction
      </button>
      
      <p style="text-align: center; color: var(--text-tertiary); font-size: var(--text-xs); margin-top: var(--space-4);">
        This will open your wallet to sign the transaction on X Layer.
      </p>
    </div>
  `;
}

export function initBetModal(milestone) {
  const toggleBtns = document.querySelectorAll('#bet-side-toggle .bet-panel__toggle-btn');
  const input = document.getElementById('bet-amount-input');
  const quickBtns = document.querySelectorAll('.bet-panel__quick-btn');
  const confirmBtn = document.getElementById('confirm-bet-btn');
  
  const estPct = document.getElementById('est-return-pct');
  const estPayout = document.getElementById('est-payout');
  const balanceDisplay = document.getElementById('wallet-balance');
  
  let currentSide = document.querySelector('#bet-side-toggle .active--yes') ? 'yes' : 'no';
  let mockBalance = 100.5; // In reality, fetch from wallet util
  
  // Mock balance for demo
  if (balanceDisplay) balanceDisplay.textContent = `${mockBalance.toFixed(2)} OKB`;

  // Update Estimations
  const updateEstimates = () => {
    const amt = parseFloat(input.value) || 0;
    if (amt <= 0) {
      estPct.textContent = '0.00%';
      estPayout.textContent = '0.00 OKB';
      confirmBtn.disabled = true;
      return;
    }
    
    confirmBtn.disabled = amt > mockBalance;

    const totalYes = milestone.total_yes || 0;
    const totalNo = milestone.total_no || 0;
    
    const payout = estimateReturn(amt, currentSide, totalYes, totalNo);
    const returnPct = ((payout - amt) / amt) * 100;
    
    estPct.textContent = `+${returnPct.toFixed(2)}%`;
    estPayout.textContent = `${payout.toFixed(4)} OKB`;
  };

  // Listeners
  input.addEventListener('input', updateEstimates);

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      toggleBtns.forEach(b => {
        b.classList.remove('active--yes', 'active--no');
      });
      currentSide = e.target.dataset.side;
      e.target.classList.add(currentSide === 'yes' ? 'active--yes' : 'active--no');
      
      // Update styling of confirm button
      confirmBtn.className = `btn btn--full btn--lg btn--${currentSide === 'yes' ? 'yes' : 'no'}`;
      
      updateEstimates();
    });
  });

  quickBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const val = e.target.dataset.amt;
      if (val === 'max') {
        input.value = mockBalance - 0.01; // leave gas
      } else {
        input.value = val;
      }
      updateEstimates();
    });
  });

  // Submit action
  confirmBtn.addEventListener('click', async () => {
    const amount = parseFloat(input.value);
    if (!amount || amount <= 0) return;
    
    if (!state.wallet) {
      showToast('Wallet disconnected', 'error');
      closeModal();
      return;
    }

    try {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner spinner--sm"></span> Processing...';
      
      // Connect to the provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Instantiate contract
      const poolContract = new ethers.Contract(milestone.pool_contract, POOL_ABI, signer);
      
      // Execute the on-chain transaction
      const amountWei = ethers.parseEther(amount.toString());
      
      showToast('Please confirm the transaction in your wallet...', 'info');
      let tx;
      if (currentSide === 'yes') {
        tx = await poolContract.betYes({ value: amountWei });
      } else {
        tx = await poolContract.betNo({ value: amountWei });
      }
      
      showToast('Transaction submitted. Waiting for confirmation...', 'info');
      const receipt = await tx.wait();

      // Call backend API to index the bet
      await bets.place({
        user_wallet: state.wallet,
        milestone_id: milestone.id,
        side: currentSide,
        amount: amount,
        tx_hash: receipt.hash
      });
      
      showToast(`Successfully bet ${amount} OKB on ${currentSide.toUpperCase()}`, 'success');
      closeModal();
      
      // In a real app, the socket event 'pool:update' will refresh the UI
      
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Transaction failed', 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm & Sign Transaction';
    }
  });
  
  // Set initial button style
  confirmBtn.className = `btn btn--full btn--lg btn--${currentSide === 'yes' ? 'yes' : 'no'}`;
  confirmBtn.disabled = true;
}
