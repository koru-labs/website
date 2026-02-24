const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");

const Native_Registry_address = "0x0000000000000000000000000000000000002041";

const abi="[\n" +
    "  {\n" +
    "    \"inputs\": [\n" +
    "      {\n" +
    "        \"internalType\": \"string\",\n" +
    "        \"name\": \"name_\",\n" +
    "        \"type\": \"string\"\n" +
    "      },\n" +
    "      {\n" +
    "        \"internalType\": \"string\",\n" +
    "        \"name\": \"symbol_\",\n" +
    "        \"type\": \"string\"\n" +
    "      },\n" +
    "      {\n" +
    "        \"internalType\": \"uint8\",\n" +
    "        \"name\": \"decimals_\",\n" +
    "        \"type\": \"uint8\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"name\": \"createNativeToken\",\n" +
    "    \"outputs\": [\n" +
    "      {\n" +
    "        \"internalType\": \"address\",\n" +
    "        \"name\": \"tokenAddress\",\n" +
    "        \"type\": \"address\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"stateMutability\": \"nonpayable\",\n" +
    "    \"type\": \"function\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"inputs\": [\n" +
    "      {\n" +
    "        \"internalType\": \"address\",\n" +
    "        \"name\": \"tokenAddress\",\n" +
    "        \"type\": \"address\"\n" +
    "      },\n" +
    "      {\n" +
    "        \"internalType\": \"bool\",\n" +
    "        \"name\": \"disabled\",\n" +
    "        \"type\": \"bool\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"name\": \"enableOrDisableNativeToken\",\n" +
    "    \"outputs\": [],\n" +
    "    \"stateMutability\": \"nonpayable\",\n" +
    "    \"type\": \"function\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"inputs\": [],\n" +
    "    \"name\": \"getAllTokenAddresses\",\n" +
    "    \"outputs\": [\n" +
    "      {\n" +
    "        \"internalType\": \"address[]\",\n" +
    "        \"name\": \"\",\n" +
    "        \"type\": \"address[]\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"stateMutability\": \"view\",\n" +
    "    \"type\": \"function\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"inputs\": [],\n" +
    "    \"name\": \"getTokenCount\",\n" +
    "    \"outputs\": [\n" +
    "      {\n" +
    "        \"internalType\": \"uint256\",\n" +
    "        \"name\": \"\",\n" +
    "        \"type\": \"uint256\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"stateMutability\": \"view\",\n" +
    "    \"type\": \"function\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"inputs\": [\n" +
    "      {\n" +
    "        \"internalType\": \"address\",\n" +
    "        \"name\": \"tokenAddress\",\n" +
    "        \"type\": \"address\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"name\": \"getTokenMetadata\",\n" +
    "    \"outputs\": [\n" +
    "      {\n" +
    "        \"components\": [\n" +
    "          {\n" +
    "            \"internalType\": \"address\",\n" +
    "            \"name\": \"tokenAddress\",\n" +
    "            \"type\": \"address\"\n" +
    "          },\n" +
    "          {\n" +
    "            \"internalType\": \"string\",\n" +
    "            \"name\": \"name\",\n" +
    "            \"type\": \"string\"\n" +
    "          },\n" +
    "          {\n" +
    "            \"internalType\": \"string\",\n" +
    "            \"name\": \"symbol\",\n" +
    "            \"type\": \"string\"\n" +
    "          },\n" +
    "          {\n" +
    "            \"internalType\": \"uint8\",\n" +
    "            \"name\": \"decimals\",\n" +
    "            \"type\": \"uint8\"\n" +
    "          },\n" +
    "          {\n" +
    "            \"internalType\": \"bool\",\n" +
    "            \"name\": \"disabled\",\n" +
    "            \"type\": \"bool\"\n" +
    "          }\n" +
    "        ],\n" +
    "        \"internalType\": \"struct TokenRegistryTemplate.TokenMetadata\",\n" +
    "        \"name\": \"metadata\",\n" +
    "        \"type\": \"tuple\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"stateMutability\": \"view\",\n" +
    "    \"type\": \"function\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"inputs\": [\n" +
    "      {\n" +
    "        \"internalType\": \"address\",\n" +
    "        \"name\": \"tokenAddress\",\n" +
    "        \"type\": \"address\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"name\": \"isTokenRegistered\",\n" +
    "    \"outputs\": [\n" +
    "      {\n" +
    "        \"internalType\": \"bool\",\n" +
    "        \"name\": \"\",\n" +
    "        \"type\": \"bool\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"stateMutability\": \"view\",\n" +
    "    \"type\": \"function\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"anonymous\": false,\n" +
    "    \"inputs\": [\n" +
    "      {\n" +
    "        \"indexed\": true,\n" +
    "        \"internalType\": \"address\",\n" +
    "        \"name\": \"sender\",\n" +
    "        \"type\": \"address\"\n" +
    "      },\n" +
    "      {\n" +
    "        \"indexed\": true,\n" +
    "        \"internalType\": \"address\",\n" +
    "        \"name\": \"tokenAddress\",\n" +
    "        \"type\": \"address\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"name\": \"NativeTokenRegistered\",\n" +
    "    \"type\": \"event\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"anonymous\": false,\n" +
    "    \"inputs\": [\n" +
    "      {\n" +
    "        \"indexed\": true,\n" +
    "        \"internalType\": \"address\",\n" +
    "        \"name\": \"tokenAddress\",\n" +
    "        \"type\": \"address\"\n" +
    "      },\n" +
    "      {\n" +
    "        \"indexed\": false,\n" +
    "        \"internalType\": \"bool\",\n" +
    "        \"name\": \"disabled\",\n" +
    "        \"type\": \"bool\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"name\": \"NativeTokenStatusChanged\",\n" +
    "    \"type\": \"event\"\n" +
    "  }\n" +
    "]"

async function testGetAllNativeTokens() {
    const [signer] = await ethers.getSigners();
    const registry = new ethers.Contract(
        Native_Registry_address,
        abi,
        signer
    );
    let response = await registry.getAllTokenAddresses();
    console.log(response);
}

async function testCreateNativeToken() {
    const [signer] = await ethers.getSigners();

    const registry = new ethers.Contract(
        Native_Registry_address,
        abi,
        signer
    );
    let tx = await registry.createNativeToken("wlin-native2", "$w", 6);
    let r = await tx.wait();

    console.log(r);

    const iface = new ethers.Interface(abi);

    for (const log of r.logs) {
        try {
            const parsed = iface.parseLog(log);
            console.log("Event:", parsed.name);
            console.log("Args:", parsed.args);
        } catch {}
    }
}

async  function getTokenDetails(){
    const [signer] = await ethers.getSigners();
    const registry = new ethers.Contract(
        Native_Registry_address,
        abi,
        signer
    );
    let response = await registry.getTokenMetadata("0xc2a5eFA5ED18627cB965aab4349389Ba5267b249");
    console.log(response);
}

async function testDisableToken(){
    const [signer] = await ethers.getSigners();
    const registry = new ethers.Contract(
        Native_Registry_address,
        abi,
        signer
    );
    let tx = await registry.enableOrDisableNativeToken("0xc2a5eFA5ED18627cB965aab4349389Ba5267b249", false);
    await tx.wait();
}

// testGetAllNativeTokens().then();
// testCreateNativeToken().then();
// testDisableToken().then();
getTokenDetails().then();