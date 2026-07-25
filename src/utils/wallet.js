// =============================================
// RockBottom — Wallet Connection Utilities
// Supports MetaMask & OKX Wallet on X Layer
// =============================================

const X_LAYER_TESTNET = {
  chainId: '0xc3', // 195
  chainName: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: ['https://testrpc.xlayer.tech'],
  blockExplorerUrls: ['https://www.oklink.com/xlayer-test'],
};

const X_LAYER_MAINNET = {
  chainId: '0xc4', // 196
  chainName: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: ['https://rpc.xlayer.tech'],
  blockExplorerUrls: ['https://www.oklink.com/xlayer'],
};

const LOCAL_TESTNET = {
  chainId: '0x7a69', // 31337
  chainName: 'Local Hardhat Testnet',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['http://127.0.0.1:8545']
};

// Use X Layer Testnet for production (Railway)
const TARGET_CHAIN = X_LAYER_TESTNET;

/**
 * Detect available wallet providers
 */
export function detectProvider() {
  if (window.okxwallet) return window.okxwallet;
  if (window.ethereum) return window.ethereum;
  return null;
}

/**
 * Connect wallet and switch to X Layer testnet
 * @returns {{ address: string, provider: object, signer: object }} Connection details
 */
export async function connectWallet() {
  const provider = detectProvider();
  if (!provider) {
    throw new Error('No wallet detected. Please install MetaMask or OKX Wallet.');
  }

  // Request accounts
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found. Please unlock your wallet.');
  }

  // Switch to X Layer testnet
  await switchToXLayer(provider);

  // Create ethers provider (imported dynamically to avoid bundling issues)
  const address = accounts[0];

  return {
    address,
    provider,
  };
}

/**
 * Switch wallet to X Layer network
 */
export async function switchToXLayer(provider) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: TARGET_CHAIN.chainId }],
    });
  } catch (switchError) {
    // Chain not added yet — add it
    if (switchError.code === 4902 || switchError.code === -32603) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [TARGET_CHAIN],
        });
      } catch (addError) {
        if (TARGET_CHAIN.chainId === '0x7a69') {
          alert("MetaMask requires HTTPS to programmatically add a network. Please manually select 'Localhost 8545' in your MetaMask networks list.");
        } else {
          throw addError;
        }
      }
    } else {
      throw switchError;
    }
  }
}

/**
 * Get wallet balance in OKB
 */
export async function getBalance(provider, address) {
  const balance = await provider.request({
    method: 'eth_getBalance',
    params: [address, 'latest'],
  });
  // Convert from hex wei to OKB (18 decimals)
  return parseInt(balance, 16) / 1e18;
}

/**
 * Sign a message for authentication
 */
export async function signMessage(provider, address, message) {
  return await provider.request({
    method: 'personal_sign',
    params: [message, address],
  });
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Generate avatar color from wallet address
 */
export function getAvatarColor(address) {
  if (!address) return 'hsl(270, 100%, 65%)';
  const hash = parseInt(address.slice(2, 8), 16);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

/**
 * Generate avatar initials from wallet address
 */
export function getAvatarInitials(address) {
  if (!address) return '??';
  return address.slice(2, 4).toUpperCase();
}

/**
 * Listen for account/chain changes
 */
export function onAccountChange(provider, callback) {
  if (provider?.on) {
    provider.on('accountsChanged', (accounts) => {
      callback(accounts[0] || null);
    });
  }
}

export function onChainChange(provider, callback) {
  if (provider?.on) {
    provider.on('chainChanged', (chainId) => {
      callback(chainId);
    });
  }
}

/**
 * Disconnect (clear local state only — wallets don't support programmatic disconnect)
 */
export function disconnectWallet() {
  // Clear any stored state
  localStorage.removeItem('rb_wallet');
  return true;
}

/**
 * Check if wallet was previously connected
 */
export function getPreviousWallet() {
  return localStorage.getItem('rb_wallet');
}

/**
 * Store connected wallet address
 */
export function storeWallet(address) {
  localStorage.setItem('rb_wallet', address);
}
