import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getDb } from '../db/schema.js';
import * as dbFuncs from '../db/queries.js';
import { analyzeProof } from '../engines/verify-engine.js';
import { evaluateResolution } from '../engines/resolution-engine.js';

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

router.post('/', upload.single('proof_file'), async (req, res) => {
  try {
    const db = await getDb();
    const { milestone_id, type, content } = req.body;
    const file_path = req.file ? `uploads/\${req.file.filename}` : null;

    if (!milestone_id || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const milestone = dbFuncs.getMilestone(db, milestone_id);
    if (!milestone) return res.status(404).json({ error: "Milestone not found" });

    const tempProof = { type, content, file_path };
    const { score, analysis } = analyzeProof(tempProof, milestone);

    const proof = {
      id: `p_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}`,
      milestone_id,
      type,
      content,
      file_path,
      ai_score: score,
      ai_analysis: analysis,
      submitted_at: new Date().toISOString()
    };

    const created = dbFuncs.createProof(db, proof);
    
    // Update milestone status if needed
    if (milestone.status === 'active') {
      dbFuncs.updateMilestone(db, milestone_id, { status: 'proof-submitted' });
    }

    // Check if we can auto-resolve
    const resolutionEval = evaluateResolution(db, milestone_id);
    if (resolutionEval.canResolve && resolutionEval.autoOutcome) {
      // In a real app we might execute this asynchronously or require a delay
      // For now we just log it or we could execute it
      console.log(`Auto-resolving milestone \${milestone_id} to \${resolutionEval.autoOutcome} based on proof.`);
    }

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:milestoneId', async (req, res) => {
  try {
    const db = await getDb();
    const proofs = dbFuncs.getProofsByMilestone(db, req.params.milestoneId);
    res.json(proofs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
