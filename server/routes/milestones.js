import { Router } from 'express';
import { getDb } from '../db/schema.js';
import * as dbFuncs from '../db/queries.js';
import { executeResolution } from '../engines/resolution-engine.js';
import { getPoolStateFromChain } from '../services/contract-service.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const statusFilter = req.query.status;
    const filters = statusFilter ? { status: statusFilter } : {};
    
    const milestones = dbFuncs.listMilestones(db, filters);
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const milestone = dbFuncs.getMilestone(db, req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    
    // Mix in pool data
    const poolData = await getPoolStateFromChain(milestone.pool_contract);
    milestone.pool = poolData;
    
    res.json(milestone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const data = req.body;
    
    const milestone = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ...data,
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    const created = dbFuncs.createMilestone(db, milestone);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/resolve', async (req, res) => {
  try {
    const db = await getDb();
    const outcome = req.body.outcome; // 'YES' or 'NO'
    if (!['YES', 'NO'].includes(outcome)) {
      return res.status(400).json({ error: 'Outcome must be YES or NO' });
    }
    
    const resolved = await executeResolution(db, req.params.id, outcome);
    
    // Emit event if io is attached
    if (req.app.get('io')) {
      req.app.get('io').emit('milestone_resolved', resolved);
    }
    
    res.json(resolved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
