import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are present
const privateKey = process.env.AGENT_PRIVATE_KEY;
if (!privateKey) {
  console.error("WARNING: AGENT_PRIVATE_KEY not found in .env. Contract transactions will fail.");
}

const RPC_URL = process.env.RPC_URL || "https://testrpc.xlayer.tech";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Agent wallet
const wallet = privateKey ? new ethers.Wallet(privateKey, provider) : null;

// The Factory address must be injected into the env after deployment
export const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || "";

// Load ABI
const loadAbi = (contractName) => {
  try {
    const p = path.resolve(__dirname, `../../artifacts/contracts/${contractName}.sol/${contractName}.json`);
    const data = fs.readFileSync(p, 'utf8');
    return JSON.parse(data).abi;
  } catch(e) {
    console.error(`Failed to load ABI for ${contractName}`, e);
    return [];
  }
};

const factoryAbi = loadAbi("RockBottomFactory");
const poolAbi = loadAbi("MilestonePool");

/**
 * Deploys milestone contracts via the Factory using the agent wallet
 * @param {string} creator 
 * @param {string} title 
 * @param {string} tokenName 
 * @param {string} tokenTicker 
 * @param {number} supply 
 * @param {number} deadline 
 */
export async function deployMilestoneOnChain(creator, title, tokenName, tokenTicker, supply, deadline) {
  if (!wallet) throw new Error("Agent wallet not configured");
  if (!FACTORY_ADDRESS) throw new Error("FACTORY_ADDRESS not set in environment");

  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, wallet);
  
  // Convert supply to wei
  const totalSupplyWei = ethers.parseEther(supply.toString());
  
  console.log(`Agent deploying milestone for ${creator}...`);
  
  const tx = await factory.createMilestone(
    creator,
    title,
    tokenName,
    tokenTicker,
    totalSupplyWei,
    deadline
  );
  
  const receipt = await tx.wait();
  
  // Find MilestoneCreated event to get addresses
  const event = receipt.logs.find(
    log => log.fragment && log.fragment.name === 'MilestoneCreated'
  );
  
  if (!event) throw new Error("MilestoneCreated event not found in transaction logs");
  
  const id = event.args[0].toString();
  const tokenContract = event.args[1];
  const poolContract = event.args[2];
  
  return {
    id,
    tokenContract,
    poolContract,
    txHash: receipt.hash
  };
}

/**
 * Validates that a bet actually occurred on-chain before recording in DB
 */
export async function verifyBetOnChain(txHash, expectedUser, expectedSide, expectedAmount) {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    throw new Error("Transaction not found or failed on chain");
  }

  // Find the BetPlaced event to ensure the details match
  // Event: BetPlaced(address indexed user, bool isYes, uint256 amount)
  // To be perfectly robust, we parse the logs with the ABI
  const iface = new ethers.Interface(poolAbi);
  let matched = false;
  
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === 'BetPlaced') {
        const user = parsed.args[0];
        const isYes = parsed.args[1];
        const amountWei = parsed.args[2];
        const amountOKB = parseFloat(ethers.formatEther(amountWei));
        
        const sideStr = isYes ? 'yes' : 'no';
        
        if (user.toLowerCase() === expectedUser.toLowerCase() &&
            sideStr === expectedSide.toLowerCase() &&
            Math.abs(amountOKB - expectedAmount) < 0.01) {
            matched = true;
            break;
        }
      }
    } catch(e) {
      // Not a BetPlaced log from our pool
    }
  }
  
  if (!matched) {
    throw new Error("Transaction contents do not match expected bet parameters");
  }
  
  return true;
}

/**
 * Resolves a milestone on-chain using the agent wallet
 */
export async function resolveOnChain(factoryId, outcomeStr) {
  if (!wallet) throw new Error("Agent wallet not configured");
  
  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, wallet);
  const outcomeBool = outcomeStr.toLowerCase() === 'yes';
  
  const tx = await factory.resolveMilestone(factoryId, outcomeBool);
  const receipt = await tx.wait();
  
  return receipt.hash;
}

/**
 * Gets pool state directly from the chain
 */
export async function getPoolStateFromChain(poolContractAddress) {
  const pool = new ethers.Contract(poolContractAddress, poolAbi, provider);
  const state = await pool.getPoolState();
  
  return {
    yesPool: parseFloat(ethers.formatEther(state._totalYes)),
    noPool: parseFloat(ethers.formatEther(state._totalNo)),
    totalPool: parseFloat(ethers.formatEther(state._totalYes)) + parseFloat(ethers.formatEther(state._totalNo)),
    isResolved: state._isResolved,
    outcome: state._outcome ? 'yes' : 'no'
  };
}
