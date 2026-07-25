import { ethers } from 'ethers';

async function fundLocalWallet() {
  const targetAddress = '0xD29CC27f6D1545158a935EC97001ab3967FA4ee1';
  
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    // Using one of the default Hardhat rich accounts
    const richWallet = new ethers.Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', provider);
    
    console.log(`Sending 10 OKB to ${targetAddress} on Localhost...`);
    const tx = await richWallet.sendTransaction({
      to: targetAddress,
      value: ethers.parseEther('10.0')
    });
    
    await tx.wait();
    console.log('Successfully funded wallet for local testing!');
  } catch (e) {
    console.log('Failed to fund local wallet:', e.message);
  }
}

fundLocalWallet();
