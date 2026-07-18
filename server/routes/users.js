import { Router } from 'express';
import { getDb } from '../db/schema.js';
import * as dbFuncs from '../db/queries.js';

const router = Router();

router.post('/connect', async (req, res) => {
  try {
    const db = await getDb();
    const { wallet_address, display_name } = req.body;
    
    if (!wallet_address) return res.status(400).json({ error: "wallet_address required" });

    let user = dbFuncs.getUserByWallet(db, wallet_address);
    
    if (!user) {
      user = {
        id: `u_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}`,
        wallet_address,
        display_name: display_name || `Anon_\${wallet_address.substring(2,6)}`,
        avatar_seed: Math.random().toString(36).substring(7),
        created_at: new Date().toISOString()
      };
      user = dbFuncs.createUser(db, user);
    } else if (display_name && display_name !== user.display_name) {
      user = dbFuncs.updateUser(db, wallet_address, { display_name });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const db = await getDb();
    const leaders = dbFuncs.getLeaderboard(db);
    res.json(leaders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:wallet', async (req, res) => {
  try {
    const db = await getDb();
    const user = dbFuncs.getUserByWallet(db, req.params.wallet);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const repHistory = dbFuncs.getReputationHistory(db, req.params.wallet);
    res.json({ ...user, reputation_history: repHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
