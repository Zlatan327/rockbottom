import { getUserByWallet, updateUser, addReputationEvent } from '../db/queries.js';

export function updateScore(db, wallet_address, eventType) {
  const user = getUserByWallet(db, wallet_address);
  if (!user) return null;

  let delta = 0;
  let reason = "";

  switch (eventType) {
    case 'milestone_completed':
      delta = 20;
      reason = "Successfully completed a milestone";
      break;
    case 'milestone_failed':
      delta = -15;
      reason = "Failed to complete a milestone";
      break;
    case 'bet_won':
      delta = 5;
      reason = "Won a bet";
      break;
    case 'bet_lost':
      delta = -3;
      reason = "Lost a bet";
      break;
    case 'slashed':
      delta = -30;
      reason = "Caught attempting to manipulate or game the system";
      break;
    default:
      return null;
  }

  let newScore = (user.execution_score || 50) + delta;
  newScore = Math.max(0, Math.min(100, newScore)); // Clamp 0-100

  updateUser(db, wallet_address, { execution_score: newScore });

  addReputationEvent(db, {
    id: `rep_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}`,
    user_wallet: wallet_address,
    event_type: eventType,
    score_delta: delta,
    reason: reason,
    created_at: new Date().toISOString()
  });

  return newScore;
}
