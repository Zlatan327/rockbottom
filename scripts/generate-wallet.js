import { ethers } from "ethers";

function main() {
    const wallet = ethers.Wallet.createRandom();
    
    console.log("New Wallet Generated!");
    console.log("Address:", wallet.address);
    console.log("Private Key:", wallet.privateKey);
}

main();
