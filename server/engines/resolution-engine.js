import { getMilestone, getProofsByMilestone, updateMilestone, getBetsByMilestone, getUserByWallet, updateUser } from '../db/queries.js';
import { updateScore } from './reputation-engine.js';
import { resolveOnChain } from '../services/contract-service.js';

export function evaluateResolution(db, milestoneId) {
  const milestone = getMilestone(db, milestoneId);
  if (!milestone) return { canResolve: false, reason: "Milestone not found" };
  
  if (milestone.status !== 'active' && milestone.status !== 'proof-submitted') {
    return { canResolve: false, reason: "Milestone is not active" };
  }

  const proofs = getProofsByMilestone(db, milestoneId);
  if (proofs.length === 0) {
    const deadline = new Date(milestone.deadline);
    if (new Date() > deadline) {
      return { canResolve: true, autoOutcome: 'NO', confidence: 100, reason: "Deadline passed with no proofs" };
    }
    return { canResolve: false, reason: "No proofs submitted yet" };
  }

  // Calculate average AI score across all proofs
  const avgScore = proofs.reduce((sum, p) => sum + p.ai_score, 0) / proofs.length;
  
  if (avgScore >= 75) {
    return { canResolve: true, autoOutcome: 'YES', confidence: avgScore, reason: "High confidence in proofs" };
  } else if (avgScore < 25) {
    return { canResolve: true, autoOutcome: 'NO', confidence: 100 - avgScore, reason: "Low confidence in proofs" };
  } else {
    return { canResolve: false, reason: "Confidence too ambiguous, requires manual resolution or more proofs", confidence: avgScore };
  }
}

export async function executeResolution(db, milestoneId, outcome) {
  const milestone = getMilestone(db, milestoneId);
  if (!milestone) throw new Error("Milestone not found");
  
  if (milestone.status === 'resolved') throw new Error("Already resolved");

  // Update milestone
  const resolvedMilestone = updateMilestone(db, milestoneId, {
    status: 'resolved',
    resolution: outcome,
    resolved_at: new Date().toISOString()
  });

  // Update creator stats and rep
  const creator = getUserByWallet(db, milestone.creator_wallet);
  if (creator) {
    if (outcome === 'YES') {
      updateUser(db, creator.wallet_address, { 
        milestones_completed: creator.milestones_completed + 1 
      });
      updateScore(db, creator.wallet_address, 'milestone_completed');
    } else {
      updateUser(db, creator.wallet_address, { 
        milestones_failed: creator.milestones_failed + 1 
      });
      updateScore(db, creator.wallet_address, 'milestone_failed');
    }
  }

  // Process bets and rep for bettors
  const bets = getBetsByMilestone(db, milestoneId);
  const winners = bets.filter(b => b.side === outcome);
  const losers = bets.filter(b => b.side !== outcome);

  // In a real app we'd calculate proportional payouts here based on total pool
  // For simulation, just update reputation
  winners.forEach(b => updateScore(db, b.user_wallet, 'bet_won'));
  losers.forEach(b => updateScore(db, b.user_wallet, 'bet_lost'));

  // Execute on-chain contract resolution
  await resolveOnChain(milestone.factory_id, outcome);

  return resolvedMilestone;
}
