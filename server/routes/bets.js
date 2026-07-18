import { Router } from 'express';
import { getDb } from '../db/schema.js';
import * as dbFuncs from '../db/queries.js';
import { checkBetManipulation } from '../middleware/anti-manipulation.js';
import { verifyBetOnChain } from '../services/contract-service.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { user_wallet, milestone_id, side, amount, tx_hash } = req.body;

    if (!user_wallet || !milestone_id || !side || !amount || !tx_hash) {
      return res.status(400).json({ error: "Missing required fields including tx_hash" });
    }

    // Verify on chain
    await verifyBetOnChain(tx_hash, user_wallet, side, amount);

    const bet = {
      id: `bet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      user_wallet,
      milestone_id,
      side,
      amount,
      tx_hash,
      placed_at: new Date().toISOString()
    };

    const created = dbFuncs.createBet(db, bet);
    
    if (req.app.get('io')) {
      req.app.get('io').emit('bet_placed', created);
    }

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/:wallet', async (req, res) => {
  try {
    const db = await getDb();
    const bets = dbFuncs.getBetsByUser(db, req.params.wallet);
    res.json(bets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/milestone/:id', async (req, res) => {
  try {
    const db = await getDb();
    const bets = dbFuncs.getBetsByMilestone(db, req.params.id);
    res.json(bets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
