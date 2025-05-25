const {ethers} = require("hardhat")

/**
 *    struct MinterAllowedSetEvent  {
        address setter;
        address account;
        TokenModel.ElGamal limit;
    }
 *
 * @returns {Promise<void>}
 */
async function encodeMinterAllowedSet(){

    const types = [
        "tuple(address setter, address account, tuple(uint256 cl_x, uint256 cl_y, uint256 cr_x, uint256 cr_y) limit)"
    ];

    const value = [{
        setter: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
        account: "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C",
        limit: {
            cl_x: "0x0674c295e0f0892fbf309a316af3adacf8023d5e597bf55533806bd0362170c6",
            cl_y: "0x0cb84b5c84cadfa88f4edf89d2fcf051c100aa015a80c202f517a008296c0359",
            cr_x: "0x1e347c17ddd4fc6ac3ec66da2d2eb23e866b1fe9cab8493a5f1137a49fdcd2fd",
            cr_y: "0x2f2419a3e2efa0de0a9ebe16b0dd90fe8dbcba985b7bd0d1546f197226a5759f"
        }
    }];

    console.log("encoded:", await ethers.AbiCoder.defaultAbiCoder().encode(types, value))
}

encodeMinterAllowedSet().then();