import hre from "hardhat";

async function main() {
    console.log("Starting deployment...");

    const signers = await hre.ethers.getSigners();
    const agent = signers[0];
    
    console.log("Deploying contracts with account:", agent.address);

    const Factory = await hre.ethers.getContractFactory("RockBottomFactory");
    const factory = await Factory.deploy();

    await factory.waitForDeployment();
    
    const address = await factory.getAddress();
    console.log("RockBottomFactory deployed to:", address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
