// =============================================
// RockBottom — Agent Chat Interface
// =============================================

import { getSocket } from '../utils/socket.js';
import { state, showToast } from '../main.js';

let chatState = {
  status: 'DISCONNECTED', // DISCONNECTED, CONNECTED, LAUNCHING, COMPLETED
  milestoneData: null,
};

export function renderAgentChat() {
  if (!state.wallet) {
    return `
      <div class="empty-state" style="margin-top: 10vh;">
        <div class="empty-state__icon">🤖</div>
        <h2 class="empty-state__title">Connect Wallet to Chat</h2>
        <p class="empty-state__text">You need to connect your wallet to start a conversation with the RockBottom Agent and launch a milestone.</p>
        <button class="btn btn--primary" onclick="document.getElementById('wallet-btn').click()">Connect Wallet</button>
      </div>
    `;
  }

  const html = `
    <div class="chat">
      <div class="section-header" style="margin-bottom: 0;">
        <h1 class="section-header__title" style="font-size: var(--text-2xl);">Agent <span class="text-gradient">Console</span></h1>
        <div class="badge badge--active" id="chat-status">● Connecting...</div>
      </div>
      
      <div class="chat__messages" id="chat-messages">
        <!-- Messages injected here -->
      </div>
      
      <div class="chat__input-area">
        <textarea 
          class="chat__input" 
          id="chat-input" 
          placeholder="Describe your milestone... (e.g. 'I want to get 100 stars on my repo by next week')"
          rows="1"
          disabled
        ></textarea>
        <button class="chat__send" id="chat-send-btn" disabled>
          ➤
        </button>
      </div>
    </div>
  `;

  setTimeout(initChat, 0);

  return html;
}

function initChat() {
  const socket = getSocket();
  const statusBadge = document.getElementById('chat-status');
  const messagesDiv = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  
  if (!socket) {
    if(statusBadge) {
      statusBadge.className = 'badge badge--expired';
      statusBadge.textContent = '❌ Offline';
    }
    showToast('Cannot connect to agent server', 'error');
    return;
  }

  // --- UI Helpers ---
  
  const scrollToBottom = () => {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const addMessage = (text, sender = 'agent', isHtml = false) => {
    const bubble = document.createElement('div');
    bubble.className = `chat__bubble chat__bubble--${sender}`;
    if (isHtml) {
      bubble.innerHTML = text;
    } else {
      bubble.textContent = text;
    }
    messagesDiv.appendChild(bubble);
    scrollToBottom();
  };

  const addTypingIndicator = () => {
    const id = `typing-${Date.now()}`;
    const indicator = document.createElement('div');
    indicator.className = 'chat__typing';
    indicator.id = id;
    indicator.innerHTML = `
      <div class="chat__typing-dot"></div>
      <div class="chat__typing-dot"></div>
      <div class="chat__typing-dot"></div>
    `;
    messagesDiv.appendChild(indicator);
    scrollToBottom();
    return id;
  };

  const removeTypingIndicator = (id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  };
  
  const renderMilestonePreview = (previewData) => {
    if (!previewData) return '';
    chatState.milestoneData = previewData;
    
    return `
      <div class="milestone-preview">
        <div class="milestone-preview__header">
          <span class="milestone-preview__label">DRAFT MILESTONE</span>
          <span class="badge badge--ticker">${previewData.ticker || '???'}</span>
        </div>
        <div class="milestone-preview__title">${previewData.title || 'Untitled Goal'}</div>
        <div class="milestone-preview__detail">
          <span>Deadline:</span>
          <span>${previewData.deadlineText || 'TBD'}</span>
        </div>
        <div class="milestone-preview__detail">
          <span>Total Supply:</span>
          <span style="font-family: var(--font-mono);">${previewData.supply ? previewData.supply.toLocaleString() : 'TBD'}</span>
        </div>
        <div style="margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--glass-border);">
          <span style="display:block; font-size: var(--text-xs); color: var(--accent-purple); margin-bottom: var(--space-1);">PROOF REQS:</span>
          <p style="font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.4;">${previewData.proofReqs || 'Pending formulation...'}</p>
        </div>
      </div>
    `;
  };

  // --- Socket Listeners ---

  socket.on('connect', () => {
    chatState.status = 'CONNECTED';
    statusBadge.className = 'badge badge--active';
    statusBadge.textContent = '● Online';
    input.disabled = false;
    sendBtn.disabled = false;
    
    // Request greeting
    socket.emit('agent:start_session', { wallet: state.wallet });
  });

  socket.on('disconnect', () => {
    chatState.status = 'DISCONNECTED';
    statusBadge.className = 'badge badge--expired';
    statusBadge.textContent = '❌ Offline';
    input.disabled = true;
    sendBtn.disabled = true;
  });

  socket.on('agent:typing', () => {
    window._typingId = addTypingIndicator();
  });

  socket.on('agent:reply', (data) => {
    if (window._typingId) {
      removeTypingIndicator(window._typingId);
      window._typingId = null;
    }
    
    let messageHtml = data.text;
    
    // Format text specifically for rendering
    messageHtml = messageHtml.replace(/\n/g, '<br/>');
    
    if (data.preview) {
      messageHtml += renderMilestonePreview(data.preview);
    }
    
    addMessage(messageHtml, 'agent', true);
    
    if (data.state === 'CONFIRMATION') {
      // Create quick reply buttons
      const btnDiv = document.createElement('div');
      btnDiv.style.display = 'flex';
      btnDiv.style.gap = 'var(--space-2)';
      btnDiv.style.marginTop = 'var(--space-2)';
      btnDiv.innerHTML = `
        <button class="btn btn--primary" id="btn-confirm-launch">🚀 Launch It</button>
        <button class="btn btn--secondary" id="btn-edit">Edit Details</button>
      `;
      messagesDiv.appendChild(btnDiv);
      scrollToBottom();
      
      document.getElementById('btn-confirm-launch').addEventListener('click', () => {
        btnDiv.remove();
        addMessage('Launch it!', 'user');
        socket.emit('agent:message', { text: 'yes proceed' });
      });
      document.getElementById('btn-edit').addEventListener('click', () => {
        btnDiv.remove();
        addMessage('I want to make changes.', 'user');
        socket.emit('agent:message', { text: 'I want to change something' });
      });
    } else if (data.state === 'LAUNCHED') {
      chatState.status = 'COMPLETED';
      input.disabled = true;
      sendBtn.disabled = true;
      
      // Confetti animation
      createConfetti();
      
      const btnDiv = document.createElement('div');
      btnDiv.style.marginTop = 'var(--space-4)';
      btnDiv.innerHTML = `
        <a href="#/milestone/${data.milestoneId}" class="btn btn--primary btn--full btn--lg" style="box-shadow: 0 0 30px rgba(50, 205, 100, 0.4); background: var(--yes-green);">
          View Live Market
        </a>
      `;
      messagesDiv.appendChild(btnDiv);
      scrollToBottom();
    }
  });

  // --- Input Handlers ---
  
  const sendMessage = () => {
    const text = input.value.trim();
    if (!text || chatState.status !== 'CONNECTED') return;
    
    addMessage(text, 'user');
    input.value = '';
    
    // Simulate thinking delay then send
    setTimeout(() => {
      socket.emit('agent:message', { text });
    }, 200);
  };

  sendBtn.addEventListener('click', sendMessage);
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  input.addEventListener('input', () => {
    // Auto-resize
    input.style.height = 'auto';
    input.style.height = (input.scrollHeight) + 'px';
  });

  // Trigger initial connection state if already connected
  if (socket.connected) {
    chatState.status = 'CONNECTED';
    socket.emit('agent:start_session', { wallet: state.wallet });
    statusBadge.className = 'badge badge--active';
    statusBadge.textContent = '● Online';
    input.disabled = false;
    sendBtn.disabled = false;
  } else {
    // Manually force connect if it's acting weird
    socket.connect();
  }
}

function createConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  
  const colors = ['#A366FF', '#00D2D3', '#FF66A3', '#32CD64', '#FFD700'];
  
  for (let i = 0; i < 100; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.top = -10 + 'px';
    piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
    piece.style.animationDelay = Math.random() * 2 + 's';
    container.appendChild(piece);
  }
  
  setTimeout(() => {
    container.remove();
  }, 5000);
}
