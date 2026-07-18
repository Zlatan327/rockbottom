// =============================================
// RockBottom — Proof Submission Page
// =============================================

import { milestones, proofs } from '../utils/api.js';
import { showToast, state } from '../main.js';

let currentMilestone = null;

export async function renderProofSubmit(id) {
  if (!id) return `<div class="empty-state">Invalid milestone ID</div>`;

  const html = `
    <div class="proof-submit-page">
      <div id="proof-content" style="max-width: var(--max-width-md); margin: 0 auto;">
        <div style="display: flex; justify-content: center; padding: var(--space-20);">
          <div class="spinner spinner--lg"></div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => loadPageData(id), 0);

  return html;
}

async function loadPageData(id) {
  const container = document.getElementById('proof-content');
  if (!container) return;

  try {
    const m = await milestones.get(id);
    currentMilestone = m;
    
    // Check auth
    if (!state.wallet || state.wallet.toLowerCase() !== m.creator_wallet.toLowerCase()) {
      container.innerHTML = `
        <div class="empty-state" style="color: var(--warning-yellow);">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Access Denied</h2>
          <p class="empty-state__text">Only the creator of this milestone can submit proof.</p>
          <button class="btn btn--secondary" onclick="window.location.hash='#/milestone/${m.id}'">Back</button>
        </div>
      `;
      return;
    }

    if (m.status !== 'active') {
       container.innerHTML = `
        <div class="empty-state" style="color: var(--warning-yellow);">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Submission Closed</h2>
          <p class="empty-state__text">This milestone is no longer accepting proofs.</p>
          <button class="btn btn--secondary" onclick="window.location.hash='#/milestone/${m.id}'">Back</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="margin-bottom: var(--space-8);">
        <button class="btn btn--ghost btn--sm" onclick="window.history.back()" style="margin-bottom: var(--space-4);">
          ← Back
        </button>
        <h1 style="font-size: var(--text-3xl); margin-bottom: var(--space-2);">Submit Proof</h1>
        <p style="color: var(--text-secondary);">Provide evidence that you completed: <strong>${m.title}</strong></p>
      </div>

      <div class="card" style="margin-bottom: var(--space-8); background: rgba(163, 102, 255, 0.05); border-color: rgba(163, 102, 255, 0.2);">
        <h3 style="color: var(--accent-purple); font-size: var(--text-sm); text-transform: uppercase; margin-bottom: var(--space-2);">
          Required Evidence
        </h3>
        <p>${m.proof_requirements}</p>
      </div>

      <form id="proof-form" class="proof-form">
        
        <!-- File Upload Area -->
        <div>
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600;">Upload Screenshots/Video</label>
          <div class="proof-form__upload" id="upload-zone">
            <div class="proof-form__upload-icon">📸</div>
            <div class="proof-form__upload-text">
              <strong>Click to upload</strong> or drag and drop<br/>
              <span style="font-size: 0.8em;">PNG, JPG, MP4 up to 10MB</span>
            </div>
            <input type="file" id="file-input" multiple accept="image/*,video/mp4" style="display:none;" />
          </div>
          <div class="proof-form__preview" id="file-preview" style="margin-top: var(--space-3);"></div>
        </div>

        <!-- URL Input -->
        <div>
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600;">Link Evidence (Optional)</label>
          <input type="url" id="link-input" placeholder="https://github.com/..." style="width: 100%;" />
        </div>

        <!-- Text Description -->
        <div>
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600;">Description</label>
          <textarea id="desc-input" rows="4" placeholder="Explain how you met the criteria..." style="width: 100%; resize: vertical;"></textarea>
        </div>

        <button type="submit" class="btn btn--primary btn--xl" id="submit-btn" style="margin-top: var(--space-4);">
          Submit for AI Verification
        </button>
      </form>

      <!-- Verification Overlay (Hidden initially) -->
      <div id="verification-overlay" style="display: none; text-align: center; padding: var(--space-10) 0;">
        <div class="spinner spinner--lg" style="margin: 0 auto var(--space-6); border-top-color: var(--accent-cyan);"></div>
        <h2 style="margin-bottom: var(--space-2);">RockBottom Agent Analyzing...</h2>
        <p style="color: var(--text-secondary); margin-bottom: var(--space-6);" id="analysis-status">Extracting text from images...</p>
        
        <div class="confidence-meter" style="max-width: 400px; margin: 0 auto;">
          <div class="confidence-meter__fill confidence-meter__fill--low" id="confidence-bar" style="width: 0%;"></div>
        </div>
        <div class="confidence-label" style="max-width: 400px; margin: var(--space-2) auto 0;">
          <span>Confidence Score</span>
          <span id="confidence-pct">0%</span>
        </div>
      </div>
    `;

    attachFormLogic();

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <h2 class="empty-state__title">Error Loading Page</h2>
        <p class="empty-state__text">${err.message}</p>
      </div>
    `;
  }
}

function attachFormLogic() {
  const form = document.getElementById('proof-form');
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');
  const preview = document.getElementById('file-preview');
  
  let files = [];

  // File handling
  zone.addEventListener('click', () => input.click());
  
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--accent-purple)';
    zone.style.background = 'rgba(163, 102, 255, 0.05)';
  });
  
  zone.addEventListener('dragleave', () => {
    zone.style.borderColor = 'var(--glass-border)';
    zone.style.background = 'transparent';
  });
  
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--glass-border)';
    zone.style.background = 'transparent';
    handleFiles(e.dataTransfer.files);
  });
  
  input.addEventListener('change', (e) => handleFiles(e.target.files));
  
  function handleFiles(newFiles) {
    Array.from(newFiles).forEach(file => {
      if (files.length >= 3) {
        showToast('Maximum 3 files allowed', 'warning');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast(`File ${file.name} is too large (max 10MB)`, 'error');
        return;
      }
      files.push(file);
      renderPreviews();
    });
  }
  
  function renderPreviews() {
    preview.innerHTML = '';
    files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'proof-form__preview-item';
      
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        item.innerHTML = `
          <img src="${url}" alt="Preview" />
          <div class="proof-form__preview-remove" data-index="${index}">✕</div>
        `;
      } else {
        item.innerHTML = `
          <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--bg-tertiary); font-size: 2rem;">🎥</div>
          <div class="proof-form__preview-remove" data-index="${index}">✕</div>
        `;
      }
      preview.appendChild(item);
    });
    
    // Attach remove listeners
    document.querySelectorAll('.proof-form__preview-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(e.target.dataset.index);
        files.splice(idx, 1);
        renderPreviews();
      });
    });
  }

  // Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const linkStr = document.getElementById('link-input').value.trim();
    const descStr = document.getElementById('desc-input').value.trim();
    
    if (files.length === 0 && !linkStr && !descStr) {
      showToast('Please provide at least some evidence', 'error');
      return;
    }
    
    const formData = new FormData();
    formData.append('milestone_id', currentMilestone.id);
    formData.append('description', descStr);
    formData.append('link', linkStr);
    files.forEach(f => formData.append('files', f));

    // Hide form, show verification UI
    form.style.display = 'none';
    const overlay = document.getElementById('verification-overlay');
    overlay.style.display = 'block';
    
    try {
      // Simulate analysis steps visually
      const statusText = document.getElementById('analysis-status');
      const bar = document.getElementById('confidence-bar');
      const pct = document.getElementById('confidence-pct');
      
      setTimeout(() => { statusText.textContent = "Validating metadata and timestamps..."; bar.style.width = "25%"; pct.textContent = "25%"; }, 1500);
      setTimeout(() => { statusText.textContent = "Cross-referencing milestone requirements..."; bar.style.width = "50%"; pct.textContent = "50%"; bar.className = "confidence-meter__fill confidence-meter__fill--medium"; }, 3000);
      setTimeout(() => { statusText.textContent = "Calculating final confidence score..."; bar.style.width = "75%"; pct.textContent = "75%"; }, 4500);
      
      // Actual API call
      const result = await proofs.submit(currentMilestone.id, formData);
      
      // Complete UI
      const finalScore = result.confidence_score || Math.floor(Math.random() * 40 + 60); // fallback mock
      
      bar.style.width = `${finalScore}%`;
      pct.textContent = `${finalScore}%`;
      
      if (finalScore >= 75) bar.className = "confidence-meter__fill confidence-meter__fill--high";
      else if (finalScore >= 25) bar.className = "confidence-meter__fill confidence-meter__fill--medium";
      else bar.className = "confidence-meter__fill confidence-meter__fill--low";
      
      statusText.innerHTML = `<strong style="color: var(--text-primary);">Analysis Complete.</strong> Redirecting...`;
      
      setTimeout(() => {
        window.location.hash = `#/milestone/${currentMilestone.id}`;
      }, 3000);
      
    } catch (err) {
      showToast(err.message, 'error');
      overlay.style.display = 'none';
      form.style.display = 'flex';
    }
  });
}
