const fs = require("fs");
const path = require("path");

async function main() {
    // get latest build info file

    const buildInfoDir = path.join(__dirname, "../../artifacts/build-info");
    const files = fs.readdirSync(buildInfoDir);
    const latest = files[files.length - 1];
    const buildInfoPath = path.join(buildInfoDir, latest);

    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));

    const targetContract = process.argv[2]; // change to your contract name

    for (const [sourcePath, contracts] of Object.entries(buildInfo.output.contracts)) {
        if (contracts[targetContract]) {
            const layout = contracts[targetContract].storageLayout;
            console.log(`Storage layout for ${targetContract} (${sourcePath}):`);
            console.log(JSON.stringify(layout.storage, null, 2));
            return;
        }
    }

    console.error("❌ Contract not found in build info");
}

main().catch(console.error);