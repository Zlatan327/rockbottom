// =============================================
// RockBottom — Landing Page
// =============================================

import { formatCompact, formatOKB } from '../utils/helpers.js';

export function renderLanding() {
  return `
    <div class="landing">
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero__badge">
          <span class="hero__badge-dot"></span>
          Built on X Layer • OKX.AI Agent
        </div>

        <h1 class="hero__title">
          Turn Your <span class="text-gradient">Milestones</span><br/>
          Into Meme Coins
        </h1>

        <p class="hero__subtitle">
          Create a goal. Launch a token. Let the world bet YES or NO.
          Hit your milestone and everyone wins — or the doubters take it all.
        </p>

        <div class="hero__actions">
          <a href="#/agent" class="btn btn--primary btn--xl" id="hero-create-btn">
            Create Milestone
          </a>
          <a href="#/markets" class="btn btn--secondary btn--xl" id="hero-markets-btn">
            Browse Markets
          </a>
        </div>

        <div class="hero__stats" id="hero-stats">
          <div class="stat">
            <span class="stat__value stat__value--purple" id="stat-milestones">0</span>
            <span class="stat__label">Milestones Created</span>
          </div>
          <div class="stat">
            <span class="stat__value stat__value--cyan" id="stat-volume">0 OKB</span>
            <span class="stat__label">Total Volume</span>
          </div>
          <div class="stat">
            <span class="stat__value stat__value--green" id="stat-resolved">0</span>
            <span class="stat__label">Milestones Completed</span>
          </div>
          <div class="stat">
            <span class="stat__value" style="color: var(--accent-pink)" id="stat-users">0</span>
            <span class="stat__label">Active Users</span>
          </div>
        </div>
      </section>

      <!-- How It Works -->
      <section class="steps">
        <div class="section-header">
          <h2 class="section-header__title">How It <span class="text-gradient">Works</span></h2>
        </div>

        <div class="step">
          <div class="step__number">1</div>
          <div class="step__content">
            <h3 class="step__title">Create a Milestone</h3>
            <p class="step__desc">
              Chat with the RockBottom Agent to define your goal. "Ship my product and get 50 paying users in 30 days."
              The agent helps you create a verifiable milestone with clear proof requirements.
            </p>
          </div>
        </div>

        <div class="step">
          <div class="step__number">2</div>
          <div class="step__content">
            <h3 class="step__title">Token Launch on X Layer</h3>
            <p class="step__desc">
              A meme token is automatically deployed for your milestone. The agent holds 75% in a locked contract — no dumping.
              Your token gets a ticker like $SHIP50 and goes live instantly.
            </p>
          </div>
        </div>

        <div class="step">
          <div class="step__number">3</div>
          <div class="step__content">
            <h3 class="step__title">Community Bets YES or NO</h3>
            <p class="step__desc">
              Believers buy into the YES pool. Skeptics bet NO. This creates real stakes, natural price action,
              and a community rooting for (or against) your success.
            </p>
          </div>
        </div>

        <div class="step">
          <div class="step__number">4</div>
          <div class="step__content">
            <h3 class="step__title">Prove It or Lose It</h3>
            <p class="step__desc">
              Submit proof of completion. The AI verification engine analyzes your evidence and scores confidence.
              If you hit your milestone → YES wins. If you fail → NO takes it all.
            </p>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="features">
        <div class="section-header">
          <h2 class="section-header__title">Why <span class="text-gradient-pink">RockBottom</span></h2>
        </div>

        <div class="grid grid--3">
          <div class="feature-card">
            <h3 class="feature-card__title">Anti-Dump Protection</h3>
            <p class="feature-card__desc">
              75% of token supply is locked in a vested contract. Even the creator can't dump.
              Tokens only unlock on milestone resolution.
            </p>
          </div>

          <div class="feature-card">
            <h3 class="feature-card__title">AI Verification</h3>
            <p class="feature-card__desc">
              The RockBottom Agent analyzes proof submissions — screenshots, links, videos, on-chain data.
              Confidence scoring ensures fair resolution.
            </p>
          </div>

          <div class="feature-card">
            <h3 class="feature-card__title">On-Chain Settlement</h3>
            <p class="feature-card__desc">
              Every bet, every token, every resolution happens on X Layer.
              Transparent, verifiable, and trustless.
            </p>
          </div>

          <div class="feature-card">
            <h3 class="feature-card__title">Execution Score</h3>
            <p class="feature-card__desc">
              Build your reputation. Complete milestones to increase your on-chain Execution Score.
              Higher scores unlock better token allocations.
            </p>
          </div>

          <div class="feature-card">
            <h3 class="feature-card__title">Anti-Manipulation</h3>
            <p class="feature-card__desc">
              Self-betting detection, wash trading prevention, whale limits, and slashing for fake proofs.
              Fair markets for everyone.
            </p>
          </div>

          <div class="feature-card">
            <h3 class="feature-card__title">Meme + Utility</h3>
            <p class="feature-card__desc">
              Every milestone becomes its own narrative. Success stories go viral.
              It's the meme coin meta — but with real consequences.
            </p>
          </div>
        </div>
      </section>

      <!-- Live Markets Preview -->
      <section class="live-preview">
        <div class="section-header">
          <h2 class="section-header__title">Live <span class="text-gradient">Markets</span></h2>
          <a href="#/markets" class="btn btn--ghost btn--sm">View All →</a>
        </div>

        <div class="grid grid--auto" id="landing-markets">
          ${renderDemoMarkets()}
        </div>
      </section>

      <!-- CTA -->
      <section class="hero" style="padding-top: var(--space-16);">
        <h2 style="font-size: var(--text-4xl); margin-bottom: var(--space-4);">
          Ready to <span class="text-gradient">Execute</span>?
        </h2>
        <p class="hero__subtitle">
          Set a goal. Launch a token. Prove you can ship.
        </p>
        <div class="hero__actions">
          <a href="#/agent" class="btn btn--primary btn--xl">
            Hit Rock Bottom
          </a>
        </div>
      </section>
    </div>
  `;
}

function renderDemoMarkets() {
  const demos = [
    {
      title: 'Ship my SaaS and get 50 paying users',
      ticker: '$SHIP50',
      creator: '0x1a2b...3c4d',
      yesPercent: 68,
      totalPool: '12.4 OKB',
      deadline: '5d 12h',
      status: 'active',
    },
    {
      title: 'Run a marathon under 4 hours',
      ticker: '$RUN4H',
      creator: '0x5e6f...7g8h',
      yesPercent: 42,
      totalPool: '8.7 OKB',
      deadline: '12d 6h',
      status: 'active',
    },
    {
      title: 'Learn Solidity and deploy 3 contracts',
      ticker: '$SOL3',
      creator: '0x9i0j...1k2l',
      yesPercent: 85,
      totalPool: '24.1 OKB',
      deadline: '2d 18h',
      status: 'active',
    },
  ];

  return demos.map(m => `
    <div class="market-card" onclick="window.location.hash='#/markets'">
      <div class="market-card__header">
        <span class="badge badge--ticker">${m.ticker}</span>
        <span class="badge badge--active">● LIVE</span>
      </div>
      <h3 class="market-card__title">${m.title}</h3>
      <div class="market-card__creator">
        <div class="avatar avatar--sm" style="background: ${getColorFromString(m.creator)}; font-size: 10px;">${m.creator.slice(2,4).toUpperCase()}</div>
        ${m.creator}
      </div>
      <div class="pool-bar" style="height: 32px;">
        <div class="pool-bar__yes" style="width: ${m.yesPercent}%">
          <span class="pool-bar__label">YES ${m.yesPercent}%</span>
        </div>
        <div class="pool-bar__no" style="width: ${100 - m.yesPercent}%">
          <span class="pool-bar__label">NO ${100 - m.yesPercent}%</span>
        </div>
      </div>
      <div class="market-card__meta">
        <span class="market-card__meta-item">Pool: ${m.totalPool}</span>
        <span class="market-card__meta-item">Time: ${m.deadline}</span>
      </div>
      <div class="market-card__footer">
        <button class="market-card__bet-btn market-card__bet-btn--yes">Bet YES</button>
        <button class="market-card__bet-btn market-card__bet-btn--no">Bet NO</button>
      </div>
    </div>
  `).join('');
}

function getColorFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash % 360)}, 70%, 55%)`;
}
