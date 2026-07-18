import { processMessage } from '../engines/agent-engine.js';
import { getDb } from '../db/schema.js';
import * as dbFuncs from '../db/queries.js';
import { deployMilestoneOnChain } from '../services/contract-service.js';

export default function setupAgentSockets(io) {
  const agentStates = new Map(); // socket.id -> state object

  io.on('connection', (socket) => {
    console.log(`Client connected to agent socket: \${socket.id}`);
    
    // Initialize state
    agentStates.set(socket.id, { state: 'GREETING', data: {} });

    // Send initial greeting
    const { response, newState } = processMessage('GREETING', '');
    agentStates.set(socket.id, { ...agentStates.get(socket.id), state: newState });
    socket.emit('agent:message', { text: response });

    socket.on('agent:message', (msg) => {
      const currentState = agentStates.get(socket.id);
      
      const { newState, response, milestonePreview } = processMessage(currentState.state, msg);
      
      agentStates.set(socket.id, { 
        ...currentState, 
        state: newState,
        preview: milestonePreview || currentState.preview 
      });

      socket.emit('agent:message', { 
        text: response, 
        preview: milestonePreview 
      });
    });

    socket.on('agent:launch', async (data) => {
      try {
        const currentState = agentStates.get(socket.id);
        const preview = currentState.preview;
        
        if (!preview) {
          return socket.emit('agent:error', { message: "No milestone draft found to launch." });
        }

        const creatorWallet = data.wallet_address;
        if (!creatorWallet) {
          return socket.emit('agent:error', { message: "Wallet address required to launch." });
        }

        const db = await getDb();
        
        // Ensure user exists
        let user = dbFuncs.getUserByWallet(db, creatorWallet);
        if (!user) {
           user = dbFuncs.createUser(db, {
             id: `u_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}`,
             wallet_address: creatorWallet,
             display_name: `Anon_\${creatorWallet.substring(2,6)}`,
             avatar_seed: Math.random().toString(36).substring(7),
             created_at: new Date().toISOString()
           });
        }

        const deadlineDate = new Date(Date.now() + 7 * 86400000);
        const deadlineSecs = Math.floor(deadlineDate.getTime() / 1000);

        socket.emit('agent:message', { text: "Deploying contracts to X Layer... hold tight." });
        
        const contracts = await deployMilestoneOnChain(
          creatorWallet,
          preview.title,
          preview.token_name || preview.ticker + "Token",
          preview.ticker || preview.token_ticker,
          preview.supply || preview.total_supply || 1000000,
          deadlineSecs
        );
        
        const milestone = {
          id: `m_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}`,
          creator_wallet: creatorWallet,
          title: preview.title,
          description: preview.description || preview.proofReqs,
          proof_requirements: preview.proofReqs || preview.proof_requirements,
          token_name: preview.token_name || preview.ticker + "Token",
          token_ticker: preview.ticker || preview.token_ticker,
          total_supply: preview.supply || preview.total_supply || 1000000,
          token_contract: contracts.tokenContract,
          pool_contract: contracts.poolContract,
          tx_hash: contracts.txHash,
          deadline: deadlineDate.toISOString(),
          factory_id: contracts.id,

          status: 'active',
          created_at: new Date().toISOString()
        };

        const created = dbFuncs.createMilestone(db, milestone);
        
        // Advance state
        agentStates.set(socket.id, { ...currentState, state: 'LAUNCHED' });
        
        socket.emit('agent:launched', created);
        socket.emit('agent:message', { text: `Boom. It's live. TxHash: \${contracts.txHash.substring(0,10)}...` });
        
        // Notify everyone a new milestone was created
        io.emit('milestone_created', created);
        
      } catch (err) {
        socket.emit('agent:error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      agentStates.delete(socket.id);
      console.log(`Client disconnected: \${socket.id}`);
    });
  });
}
