import { getMilestone, getBetsByUser, getTotalBets } from '../db/queries.js';

export function checkBetManipulation(db, userWallet, milestoneId, side, amount) {
  const milestone = getMilestone(db, milestoneId);
  if (!milestone) return { allowed: false, reason: "Milestone not found" };

  const userBets = getBetsByUser(db, userWallet);
  const milestoneBetsForUser = userBets.filter(b => b.milestone_id === milestoneId);

  // Check wash trading (same wallet on both sides)
  const opposingSide = side === 'YES' ? 'NO' : 'YES';
  const hasOpposingBet = milestoneBetsForUser.some(b => b.side === opposingSide);
  if (hasOpposingBet) {
    return { allowed: false, reason: "Wash trading detected: You cannot bet on both sides of a milestone." };
  }

  // Velocity check (max 3 bets per minute)
  const oneMinuteAgo = new Date(Date.now() - 60000);
  const recentBets = userBets.filter(b => new Date(b.placed_at) > oneMinuteAgo);
  if (recentBets.length >= 3) {
    return { allowed: false, reason: "Rate limit: Too many bets placed recently." };
  }

  // Whale check (single bet > 20% of pool is suspicious but allowed in early stages - we'll just flag it)
  // For the sake of this rule, let's block if amount is excessively large for a new pool
  const yesTotal = getTotalBets(db, milestoneId, 'YES');
  const noTotal = getTotalBets(db, milestoneId, 'NO');
  const poolTotal = yesTotal + noTotal;
  
  if (poolTotal > 0 && amount > poolTotal * 0.5) {
    return { allowed: false, reason: "Whale limit: Bet exceeds 50% of the current pool." };
  }

  // Self-betting (creator can't bet > 5% on their own)
  if (milestone.creator_wallet === userWallet) {
    if (poolTotal > 0 && amount > poolTotal * 0.05) {
      return { allowed: false, reason: "Creator limit: Cannot hold more than 5% of your own pool." };
    }
  }

  return { allowed: true };
}
