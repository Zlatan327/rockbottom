import { ethers } from 'ethers';

async function checkBalance() {
  const pk = '0xa1c4fc70e2891351278bd5836fa7630d08eebe156425c8a068743e211312767a';
  
  try {
    const xlayerProvider = new ethers.JsonRpcProvider('https://testrpc.xlayer.tech');
    const walletXlayer = new ethers.Wallet(pk, xlayerProvider);
    console.log('Wallet Address:', walletXlayer.address);
    
    const balanceXlayer = await xlayerProvider.getBalance(walletXlayer.address);
    console.log('X Layer Testnet Balance:', ethers.formatEther(balanceXlayer), 'OKB');
  } catch (e) {
    console.log('X Layer check failed:', e.message);
  }

  try {
    const localProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const walletLocal = new ethers.Wallet(pk, localProvider);
    const balanceLocal = await localProvider.getBalance(walletLocal.address);
    console.log('Local Hardhat Balance:', ethers.formatEther(balanceLocal), 'ETH/OKB');
  } catch (e) {
    console.log('Local Hardhat check failed:', e.message);
  }
}

checkBalance();
