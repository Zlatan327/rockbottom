export function createUser(db, user) {
  db.run(
    "INSERT INTO users (id, wallet_address, display_name, avatar_seed, created_at) VALUES (?, ?, ?, ?, ?)",
    [user.id, user.wallet_address, user.display_name, user.avatar_seed, user.created_at]
  );
  return getUserByWallet(db, user.wallet_address);
}

export function getUserByWallet(db, wallet_address) {
  const [result] = db.exec("SELECT * FROM users WHERE wallet_address = ?", [wallet_address]);
  if (!result || !result.values || result.values.length === 0) return null;
  
  const columns = result.columns;
  const values = result.values[0];
  const user = {};
  columns.forEach((col, i) => user[col] = values[i]);
  return user;
}

export function updateUser(db, wallet_address, updates) {
  const keys = Object.keys(updates);
  if (keys.length === 0) return getUserByWallet(db, wallet_address);
  
  const setString = keys.map(k => `${k} = ?`).join(", ");
  const values = keys.map(k => updates[k]);
  values.push(wallet_address);
  
  db.run(`UPDATE users SET ${setString} WHERE wallet_address = ?`, values);
  return getUserByWallet(db, wallet_address);
}

export function getLeaderboard(db) {
  const [result] = db.exec("SELECT wallet_address, display_name, avatar_seed, execution_score, milestones_completed, total_earned FROM users ORDER BY execution_score DESC LIMIT 10");
  if (!result || !result.values) return [];
  
  return result.values.map(row => {
    const user = {};
    result.columns.forEach((col, i) => user[col] = row[i]);
    return user;
  });
}

export function createMilestone(db, milestone) {
  db.run(
    `INSERT INTO milestones (
      id, creator_wallet, title, description, proof_requirements, 
      token_name, token_ticker, token_contract, pool_contract, 
      total_supply, status, deadline, created_at, tx_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      milestone.id, milestone.creator_wallet, milestone.title, milestone.description, 
      milestone.proof_requirements, milestone.token_name, milestone.token_ticker, 
      milestone.token_contract, milestone.pool_contract, milestone.total_supply, 
      milestone.status, milestone.deadline, milestone.created_at, milestone.tx_hash
    ]
  );
  return getMilestone(db, milestone.id);
}

export function getMilestone(db, id) {
  const [result] = db.exec("SELECT * FROM milestones WHERE id = ?", [id]);
  if (!result || !result.values || result.values.length === 0) return null;
  
  const milestone = {};
  result.columns.forEach((col, i) => milestone[col] = result.values[0][i]);
  return milestone;
}

export function listMilestones(db, filters = {}) {
  let query = "SELECT * FROM milestones";
  const params = [];
  
  if (filters.status) {
    query += " WHERE status = ?";
    params.push(filters.status);
  }
  
  query += " ORDER BY created_at DESC";
  
  const [result] = db.exec(query, params);
  if (!result || !result.values) return [];
  
  return result.values.map(row => {
    const milestone = {};
    result.columns.forEach((col, i) => milestone[col] = row[i]);
    return milestone;
  });
}

export function updateMilestone(db, id, updates) {
  const keys = Object.keys(updates);
  if (keys.length === 0) return getMilestone(db, id);
  
  const setString = keys.map(k => `${k} = ?`).join(", ");
  const values = keys.map(k => updates[k]);
  values.push(id);
  
  db.run(`UPDATE milestones SET ${setString} WHERE id = ?`, values);
  return getMilestone(db, id);
}

export function createBet(db, bet) {
  db.run(
    "INSERT INTO bets (id, user_wallet, milestone_id, side, amount, tx_hash, placed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [bet.id, bet.user_wallet, bet.milestone_id, bet.side, bet.amount, bet.tx_hash, bet.placed_at]
  );
  return bet;
}

export function getBetsByMilestone(db, milestone_id) {
  const [result] = db.exec("SELECT * FROM bets WHERE milestone_id = ? ORDER BY placed_at DESC", [milestone_id]);
  if (!result || !result.values) return [];
  
  return result.values.map(row => {
    const bet = {};
    result.columns.forEach((col, i) => bet[col] = row[i]);
    return bet;
  });
}

export function getBetsByUser(db, user_wallet) {
  const [result] = db.exec("SELECT * FROM bets WHERE user_wallet = ? ORDER BY placed_at DESC", [user_wallet]);
  if (!result || !result.values) return [];
  
  return result.values.map(row => {
    const bet = {};
    result.columns.forEach((col, i) => bet[col] = row[i]);
    return bet;
  });
}

export function getTotalBets(db, milestone_id, side) {
  const [result] = db.exec("SELECT SUM(amount) as total FROM bets WHERE milestone_id = ? AND side = ?", [milestone_id, side]);
  if (!result || !result.values || result.values.length === 0) return 0;
  return result.values[0][0] || 0;
}

export function createProof(db, proof) {
  db.run(
    "INSERT INTO proofs (id, milestone_id, type, content, file_path, ai_score, ai_analysis, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [proof.id, proof.milestone_id, proof.type, proof.content, proof.file_path, proof.ai_score, proof.ai_analysis, proof.submitted_at]
  );
  return proof;
}

export function getProofsByMilestone(db, milestone_id) {
  const [result] = db.exec("SELECT * FROM proofs WHERE milestone_id = ? ORDER BY submitted_at DESC", [milestone_id]);
  if (!result || !result.values) return [];
  
  return result.values.map(row => {
    const proof = {};
    result.columns.forEach((col, i) => proof[col] = row[i]);
    return proof;
  });
}

export function addReputationEvent(db, event) {
  db.run(
    "INSERT INTO reputation_events (id, user_wallet, event_type, score_delta, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [event.id, event.user_wallet, event.event_type, event.score_delta, event.reason, event.created_at]
  );
  return event;
}

export function getReputationHistory(db, user_wallet) {
  const [result] = db.exec("SELECT * FROM reputation_events WHERE user_wallet = ? ORDER BY created_at DESC", [user_wallet]);
  if (!result || !result.values) return [];
  
  return result.values.map(row => {
    const evt = {};
    result.columns.forEach((col, i) => evt[col] = row[i]);
    return evt;
  });
}
