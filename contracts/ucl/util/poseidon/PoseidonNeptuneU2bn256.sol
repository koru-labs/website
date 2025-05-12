// SPDX-License-Identifier: MIT
// Nova Contracts
pragma solidity ^0.8.0;

// This contract is for debugging/testing purposes
library PoseidonU2bn256 {
    struct HashInputs3 {
        uint256 t0;
        uint256 t1;
        uint256 t2;
    }

    function mix(HashInputs3 memory i, uint256 q) internal pure {
        HashInputs3 memory o;

        o.t0 = 0;
        o.t0 = addmod(o.t0, mulmod(i.t0, 0x2042def740cbc01bd03583cf0100e59370229adafbd0f5b62d414e62a0000001, q), q);
        o.t0 = addmod(o.t0, mulmod(i.t1, 0x244b3ad628e5381f4a3c3448e1210245de26ee365b4b146cf2e9782ef4000001, q), q);
        o.t0 = addmod(o.t0, mulmod(i.t2, 0x135b52945a13d9aa49b9b57c33cd568ba9ae5ce9ca4a2d06e7f3fbd4c6666667, q), q);

        o.t1 = 0;
        o.t1 = addmod(o.t1, mulmod(i.t0, 0x244b3ad628e5381f4a3c3448e1210245de26ee365b4b146cf2e9782ef4000001, q), q);
        o.t1 = addmod(o.t1, mulmod(i.t1, 0x135b52945a13d9aa49b9b57c33cd568ba9ae5ce9ca4a2d06e7f3fbd4c6666667, q), q);
        o.t1 = addmod(o.t1, mulmod(i.t2, 0x285396b510feb022c442e4c2c1411ef84c2b4191bac53323b891a1fb48000001, q), q);

        o.t2 = 0;
        o.t2 = addmod(o.t2, mulmod(i.t0, 0x135b52945a13d9aa49b9b57c33cd568ba9ae5ce9ca4a2d06e7f3fbd4c6666667, q), q);
        o.t2 = addmod(o.t2, mulmod(i.t1, 0x285396b510feb022c442e4c2c1411ef84c2b4191bac53323b891a1fb48000001, q), q);
        o.t2 = addmod(o.t2, mulmod(i.t2, 0x06e9c21069503b73ac9dc0d0edede80d4ee2d80a5a8834a709b290cbfdb6db6e, q), q);

        i.t0 = o.t0;
        i.t1 = o.t1;
        i.t2 = o.t2;
    }

    function ark(HashInputs3 memory i, uint256 q, HashInputs3 memory c) internal pure {
        HashInputs3 memory o;

        o.t0 = addmod(i.t0, c.t0, q);
        o.t1 = addmod(i.t1, c.t1, q);
        o.t2 = addmod(i.t2, c.t2, q);

        i.t0 = o.t0;
        i.t1 = o.t1;
        i.t2 = o.t2;
    }

    function sbox_full(HashInputs3 memory i, uint256 q) internal pure {
        HashInputs3 memory o;

        o.t0 = mulmod(i.t0, i.t0, q);
        o.t0 = mulmod(o.t0, o.t0, q);
        o.t0 = mulmod(i.t0, o.t0, q);
        o.t1 = mulmod(i.t1, i.t1, q);
        o.t1 = mulmod(o.t1, o.t1, q);
        o.t1 = mulmod(i.t1, o.t1, q);
        o.t2 = mulmod(i.t2, i.t2, q);
        o.t2 = mulmod(o.t2, o.t2, q);
        o.t2 = mulmod(i.t2, o.t2, q);

        i.t0 = o.t0;
        i.t1 = o.t1;
        i.t2 = o.t2;
    }

    function sbox_partial(HashInputs3 memory i, uint256 q) internal pure {
        HashInputs3 memory o;

        o.t0 = mulmod(i.t0, i.t0, q);
        o.t0 = mulmod(o.t0, o.t0, q);
        o.t0 = mulmod(i.t0, o.t0, q);

        i.t0 = o.t0;
    }

    function hash(HashInputs3 memory i, uint256 q) internal pure returns (uint256) {
        // validate inputs
        require(i.t0 < q, "INVALID_INPUT");
        require(i.t1 < q, "INVALID_INPUT");
        require(i.t2 < q, "INVALID_INPUT");

        // round 0
        ark(
            i,
            q,
            HashInputs3(
                0x1051abd795bb781c5bcb3d4c7320b88f033cb1904c5b8559bf08995be4d6305d,
                0x2680c4e5e102394a8c53c7ca99003cbeb3422caedbfa62c2373862e367a3dd00,
                0x132e8252ba372e32578a441ca6b0865f73d890c968dd8b7642f5b483676160b6
            )
        );
        sbox_full(i, q);
        mix(i, q);
        // round 1
        ark(
            i,
            q,
            HashInputs3(
                0x0dff6973df3b1f559d2e21ede06b857c63e4da1bd50a03e4d500e226dd108be7,
                0x05e9463e0290d75eb2948587b1f9a7ca52ea91c9e57b322cdfab3c4822f1abbd,
                0x2365c6a8b9928e31609cb8190336a6a2eebf69b015bc7958840576fd4e42da38
            )
        );
        sbox_full(i, q);
        mix(i, q);
        // round 2
        ark(
            i,
            q,
            HashInputs3(
                0x16aa8ba01611f750811cbb3d4257f53a969fccaec3130b7a6441c39c9bae8458,
                0x2717b1a58bf1978c6af4069069429e64ea024efd3b9be8fe8aa2bf1d8c28f42d,
                0x2d26bd604c702d7c74850099492efb38bc836c3cb88602e1679ddb53557292bf
            )
        );
        sbox_full(i, q);
        mix(i, q);
        // round 3
        ark(
            i,
            q,
            HashInputs3(
                0x174a4de6c44cab3c9781597fa27c024f7c7a114632a541ed7fed2deb245a85e1,
                0x1d3e5ecbb083875c59541464dc6e7d1a59b4f68d985a213b28314a3004ec6809,
                0x014edb6e589987b69e282db5f52c1b0bbe8704e601154c6a0afe84b52f9a4aae
            )
        );
        sbox_full(i, q);
        mix(i, q);
        // round 4
        ark(
            i,
            q,
            HashInputs3(
                0x0e0d8d1e063d74b601a548eae7d368fd8ac907dd9145beaf63f2e2a6a28fccd5,
                0x0602ae8ffb9d13f3cce1e3ae3c2f494b03d3fc2fc6426d5fe6cc1c312d068da2,
                0x23868f037d108e9346a8d63130d6d9aab87e701c1828c574fa67cc8c1177a6b3
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 5
        ark(
            i,
            q,
            HashInputs3(
                0x1073b5a9ce850e2d6f16e5776b4ee254146ed65bbd8f50d36e17747778af00d2,
                0x073da226b5a2639fe26496cdc3dbd5fd769984dc39e44003781d9140596543c4,
                0x2cfbfacaaab3b3526fd0dc6d369646f3fe3948da0fa8a132f0dbde96b5ddc9e6
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 6
        ark(
            i,
            q,
            HashInputs3(
                0x0fc0855a69b277b726ac164b86ffba19954c0d59802838c4f032df5ca38ae88e,
                0x2649f096f1e407adbe09b44a07c54ec03f23cdef4b1e4c96d81f632df917e0e0,
                0x0f9c0aa8c10f48a205c7ed49d1cffa12829b53ac76840f3a0aff6cb10418ca40
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 7
        ark(
            i,
            q,
            HashInputs3(
                0x11547a7f704f1eb0394663d4afc2fe19823910bebe3147b6f0ffb7f8433838e1,
                0x16aff7c7076d3487c8d10e640da7652a5f3a007967eaa7282ced25e89b61787d,
                0x011a06492822359dbd9406c3afba3bfa469147f483f0ae78c80f9077de480b86
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 8
        ark(
            i,
            q,
            HashInputs3(
                0x0d7f084fe4f168dd3b06a36866399b1c4c3c6a7f247f317d8463d9e447608134,
                0x078b6029f46dc32407770079ff46c9b20accea7cd0120ef5fdca18a7cb65b127,
                0x2dea4e22de864b493684aebb0a692f939ce841aebf83330c13f2ee57071793ae
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 9
        ark(
            i,
            q,
            HashInputs3(
                0x08cbcba0c91b3981c0207f75e4b0f032feaf5480e4aa243c946d938a2a57645f,
                0x02d8f99ea79dbde1025ea741c56c3e6978e7eb7b820eb30148d6c059bb8c365e,
                0x109b2d0bcdbd121d2764beeec0284a1b13cdb171ab316e729f6980adb7e219a3
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 10
        ark(
            i,
            q,
            HashInputs3(
                0x06a25826dc6271bf8c924962da4cda44dc320d0c66f31fd2efef0bd9b9f8fe35,
                0x1a63e4e11c99ecbb52b14e202fd651a9872e560e9403fa2d9f33d20bcc32bca4,
                0x03fb5deb4cdadf1ce955fa3c091f2dfb8c58951760769d1484f06ccf3a687d5b
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 11
        ark(
            i,
            q,
            HashInputs3(
                0x0bdac171754f43976c5cafd607771b9c7704e9d1c5576b87fe2aa0d80ab0fe01,
                0x253a502bcfb721c80a2774434713ef20fad993dc5751c0673f44ef976d5ce751,
                0x0e21300aec534829255add130d31da0dc54282656e893cba45b81b123671c2c5
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 12
        ark(
            i,
            q,
            HashInputs3(
                0x0d9d748361f6bbb3782751508fd274913d9153eff951dba21f3b20e69f229a36,
                0x1eafe91d860ad0794059d7abe25ffa38d1e0229f64f81d34eeffadb1575edfc8,
                0x1208792af32377cd04bf0b77947ef589d4069b8743bc8b4878d09daa669b6b9b
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 13
        ark(
            i,
            q,
            HashInputs3(
                0x0c8593f0fd900eba22c520adca2fac43ef1e22676c396804a421cb9b10ec78a4,
                0x1bd21887ff52ef7fc2535b98dc27cf269baa0905b006bc8c347518da237c0eba,
                0x1f286d70c425a4f9c587777c055274940a860def2ee096dd382b3098b526a211
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 14
        ark(
            i,
            q,
            HashInputs3(
                0x12f295cba6747661e15782c98dfc37986ff39910b5ade0af270359a0240ac15c,
                0x27b574790203bde222f06ec565eeb97b5cb638d48b91d696406ad922c5cef4aa,
                0x0b48c200ed9b9c2e06ccf0b4bf7879aa04a4f3c96a123c76b141014cf1cf3db7
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 15
        ark(
            i,
            q,
            HashInputs3(
                0x102542507dd3efd2985a8c1f32b693db8bbdb68915ddfcde0495319274cb805e,
                0x179ecf51290f06d865c9a5f2b0e0c0d8538f1e0cd827aeebc17a52243892961a,
                0x095495252df2a4b0436c4ed7475418d3ddbceeedefa21c93f869d2ef7af8d0e7
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 16
        ark(
            i,
            q,
            HashInputs3(
                0x0199f70bfee188c09adc670d87ab0faf853a05009f4bf5f02ccc1118ebddfd04,
                0x2c4424651e6612ac440f1a0337c11ab8de4e454b02e541f0d9fd94c71fe8894e,
                0x1026a6b199faf95f5d25039aa4ac197858efccc396d022ef2a91b6e8daefd401
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 17
        ark(
            i,
            q,
            HashInputs3(
                0x1592410f12e9ed7cb9a4e179545bb25e1ccd1fe651a357384c25c4069c91f447,
                0x2eb2a6361decccd18af7220bf07acaba1aa2f72df3c8987f2de50550e2958ec1,
                0x004e18672f832f967bc48680deea67cfaa5239523c8300431b3a5d6841c6c83a
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 18
        ark(
            i,
            q,
            HashInputs3(
                0x15d58a38461f1a3ff4fa48c05893549ccc347de223c3defa6b62ad235f8f273c,
                0x2f8b363cb00ed6b4c59cdccdd8bc00c2b74a20692f50684554d26aded7e536fe,
                0x29723a5dce93cca5d1b5fa130caa23df1a0dc60d1b04a5af92cee4f9725c35c7
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 19
        ark(
            i,
            q,
            HashInputs3(
                0x2c54d95a6a6f7e09e4c3562ecf6d09641e29a72cc7a46e97555232044a6a8aaa,
                0x2a62c847a7404e47d198158bc9783f57a7e9e936a512ebdb6ed07ed81040f9d1,
                0x1276cfc056c55b3a9feb8734289c38bb99f2d4adb5df85b9c6baff7f42489ddc
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 20
        ark(
            i,
            q,
            HashInputs3(
                0x27074fb9a068da4dc423e47f968c2967012a8238c74008a2d3cfae739a454417,
                0x13b3cc235d66d3f0db7862ee5b3e78a7ae3fbcb379571af077693fa3a318baf6,
                0x1d4f5cbb8ed933063b61afb45c92a6e42cb80baac351ddd75efd8ada23535e31
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 21
        ark(
            i,
            q,
            HashInputs3(
                0x2d4a0453f7e3632194d15444457f033b28822ac9e46aa9e8141ec98968666229,
                0x0996408db77890304cec004cff24e7031f20d91245bf698b8d85185ba4c6ca3c,
                0x154c4433d7bc73b4bcbd880f933fd7ae87e618b381b3529bcffc2281cbb1ba7f
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 22
        ark(
            i,
            q,
            HashInputs3(
                0x0dfe738c2dfa783eeb594adf67c5e2b5581de47f8c9cfa8a37fffde204eeb4fd,
                0x009517fcab532346f0c8b3dbce4a6b24e901772bd3bfb55dd4f4cc1886be22cb,
                0x0e87f69b7ba84abd34fb9822c91cc4053914904860eb136b5f24dc56c7ea4ef2
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 23
        ark(
            i,
            q,
            HashInputs3(
                0x20f6ebe7f3b318d178af7fb4ebfe5e71b5d3380ee0ce07f275051f52fbce3d50,
                0x1f93934dc4dd378c4ef0c106dd721e55d59db5910d92cc721dbd1b71e8b16ac9,
                0x1c9601af9f45092f62ed342e62ce154a3ee2583025f089235ced1ae2f1f84f9d
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 24
        ark(
            i,
            q,
            HashInputs3(
                0x04dd1e6797a385c12d4b7f911a28ac12149e3ebbe1ad536870725a7b494b13b0,
                0x23e7a5d59830db614d16a0ed4eeaeaee5b793aa39af8ff56aa7ca3bfefcdefba,
                0x12f8f2d6c41e9d384e01d138695acff6a73b557f5d2606e598cb0ffec69f091d
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 25
        ark(
            i,
            q,
            HashInputs3(
                0x01376653f8bcf8fcec5ed8c851453e6bdc678f31fc9c8b94453230e99068d2b7,
                0x26b0bf23169407407b4c3b437d920b74c7ba13058818edcbe4eed125540eea78,
                0x03a8a2797f6d8244e383f51fdc0edc69873d81d75b6ac0b92643e4b02f67113d
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 26
        ark(
            i,
            q,
            HashInputs3(
                0x0758e495264cace99acef218843149d62c2de064a62936ad4161a862198b697f,
                0x1973c04a42a8996d5f38671e71d3be5778de8bd4854259e8bb461ffc56399278,
                0x2ff27debeb99ece34cb68ad054c3725eb8ee3857dc97961896e1691a1e76a6e5
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 27
        ark(
            i,
            q,
            HashInputs3(
                0x1b2316eab766bda304543e47474aef9ce91830a717686d5f74891d25eda9e3d2,
                0x29186c9e4543d1e838518a836cd160fea11d0399d40d4a44248b5b86773454d3,
                0x2fb5e09aaf4fb0f3e29d8037046242dfcfc25e0acb6942d709f339c80d62156f
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 28
        ark(
            i,
            q,
            HashInputs3(
                0x2d026814a08dc4497c6e249debdf0be4584d75fc1565dccb36549687fcdce5f7,
                0x1f530540f99193b2535359650505dcdbabd5dae0e7a25029eb427da77dfd29d5,
                0x059f1ad84cfaf236838c5dd78cf530e0f008631d7b911b108f9e9e35927a6a0c
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 29
        ark(
            i,
            q,
            HashInputs3(
                0x0f0cb8516e7358e13f8d29e3d7ca3b8772da3f34c38dd54b79f32a64d3a173a9,
                0x0a7b0e2f1fa2d3b05d30ba4010d38a04a413e0b31aefd44a62cfd75bdefaacb9,
                0x29785cee4a463f7c6a9d0faf92b5d7835e2cf7ed758ece279a896d3165f06e2a
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 30
        ark(
            i,
            q,
            HashInputs3(
                0x0550c951520a57c7ea1253ce4198f5151aaa801da0c49b6b1599e1c4e9cd4a41,
                0x0e4f3013a99a670d3b60456f721932b60627daa3be8aedfe7e4d84d5528d5a94,
                0x116159f5f5be7755a0d02232fed8d99f2bcf672536c1373bcbddc83cfe7fa461
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 31
        ark(
            i,
            q,
            HashInputs3(
                0x05f3b1526b9d0dcaec2d707ac31e87e8699a46c852ac9ef94abd5767de5cff47,
                0x095e04894544e210764ff538802121e800b39970585063fe611136276aa16fe5,
                0x2ade487b239c12bb48ff17f278758dca8dd1278972daef778f4c118dec3dcf39
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 32
        ark(
            i,
            q,
            HashInputs3(
                0x053e3aa1aba2476edb26d2463332a0e186ed428adeee869d822401930f9e4128,
                0x2df9eb23269d857b49c76080928a62e518402ec26aeace0c0d88790830e5e23f,
                0x224883469ecba978372e4e9412c3a434b7058d9d76f1d1869ca187ba7c1590d5
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 33
        ark(
            i,
            q,
            HashInputs3(
                0x0e0dba4c312b41bb89edcff913835681a106d97ea723735220c2cd806f16968b,
                0x2d9ce08f05ffc1eced293bd9f8fb89d7bef456b2b0fec016e795c4159325337b,
                0x162b649549c5adc5f781e37b7df61e7ce65f084b9825a23d9b6aa4bdc248e998
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 34
        ark(
            i,
            q,
            HashInputs3(
                0x2323a160c2346980dabf302e69e2cd88f307c1741dd583d36a06733f0a0936c8,
                0x047d629034c42906bff290342b2bafa612f08b0f888fd5c5ea02384c639adb87,
                0x16749375afac68bb87291b6167aa55e389e69932dacacbf3762fea925d7ee5c1
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 35
        ark(
            i,
            q,
            HashInputs3(
                0x14f633ba5f21231117f4d938bdba1ad6587f37312dd852ae22e508b2557524f9,
                0x2d02f2b341f65ad9d99e89cba23a797806168efeb2da8169f7893783c9acb782,
                0x25f565e2ea7cb2faff221c35deec04b825960e1b26edd936b39fd2c55a48bffa
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 36
        ark(
            i,
            q,
            HashInputs3(
                0x0febd4fef89c49b6b12c353e3efb358203aef5f13e2e25cdc88a9fae17a48ba9,
                0x11d001a9456099cd86c95cdef6bfda0434d6f52394944335cd6513bb41add7c3,
                0x1cc2b66fcd7d66e5ff81955bed3ce8d976aae481f100e40a5078171cfad690b4
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 37
        ark(
            i,
            q,
            HashInputs3(
                0x16a755dc1ad34b4562a9d57dd375ba68bbe5424df505a5df3d1d1c16fc6f516e,
                0x1c6d0e7f77d871f89f0324dad2cf370292f81cd8d567129b56384ebe8f14b078,
                0x278006a7fd3b154b9f25be54a013734b0a5372ff88377c26eb219039558a281d
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 38
        ark(
            i,
            q,
            HashInputs3(
                0x22eb2867a539a9b6ff51d4a48b4cd8419252d07c0665d0baf82acf8aef7de8ad,
                0x1a128b7188d4e3f1c22aa4bc4525bb26b50ebd80f50f267988bfe2e466e56a94,
                0x1d2faa5c28aa1d533513cba89750b93ce71b4510c4c215eb1974a59051c5b093
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 39
        ark(
            i,
            q,
            HashInputs3(
                0x28eb1c41a050dc8aa3f9a8037cb81f575e5b1acadc49e886e90bee7f1a485149,
                0x1e2586cbca2364027ac96ad1490271b866e723385e96c9f720a72b1f67078e6e,
                0x13c7e5c7724e33d7acec9e42ff8a4ee4f1ac8b6d0038f0faf4908e74ed06c9ba
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 40
        ark(
            i,
            q,
            HashInputs3(
                0x09bf059ab4925c39c6df84371572785d35e40be573fdf1be914ff6a87066923e,
                0x1b7375f3920e121871cbc71e92a2f47518d26a20f236f9194a5c48f86dfabd38,
                0x1494848f10672e535de527d6d0591019987f6e11ba33b6f6eb73dc59289c2e36
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 41
        ark(
            i,
            q,
            HashInputs3(
                0x195378dcafdea646a00ae78d9e30487a41aa8b8864ef4035a751c3b8ece36b0c,
                0x0b6a5c76a2a2a0db3843ef11176411388025f380e7a2d7ef1a6acafda5899b0e,
                0x0823e1d157f7c4712b4988af4a0396edb0950b1ccd001692e4eff681e14c2fef
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 42
        ark(
            i,
            q,
            HashInputs3(
                0x1633b048d2f14628309dbdf5a52736c0c5de9bf96d7fb9d13a2cb4562074b222,
                0x1f77ddd90f1eab23737895ec06a295467086513dec30b69738d226c82ed5e430,
                0x09c71939b3672bf6aaaebcf3717dab67765d8b94726c19d76d57e7aec751b94f
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 43
        ark(
            i,
            q,
            HashInputs3(
                0x048139270f0ef8f68d0b07c5d0005d7ad91d41fe306c8587bcf32d742ca1937d,
                0x003adfb1444cbf59321984d74e4434f3ed8a2f2376a41f5b9f52b1a6172c03e5,
                0x2eec4a7de823bf9531d3f842e9a9c74b0d0c4f8b56a5a25ede19b11f868b89ce
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 44
        ark(
            i,
            q,
            HashInputs3(
                0x0ea574b644b9f4cba43338122827d08f07484a4ceb24ac9d00c4a668838900af,
                0x054da055cd915cca9a0da4dd2cc86d99f08b287bba925305ecc28ed0bdd28990,
                0x02965a1d1f26fcd147af96711976f84bc3f08a50e8b8c38f7e83e8638b8f4706
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 45
        ark(
            i,
            q,
            HashInputs3(
                0x1f97b34b9622f33893182c89f86ef052ce8e46a3bfe2e33fa2a34c5e051d91b8,
                0x09a063b0b5ea468d93edeecfc089699f815eddbeb5e9369046740c7fea6d1cb5,
                0x1242820c24afd7cc595f7a3dd0534c6cf1f00c6a84291c65417397c07d46b778
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 46
        ark(
            i,
            q,
            HashInputs3(
                0x2983c402aec15b1d15f86a8d0378769832f0d5ed57aab1d11cc08b4509512da6,
                0x136371a4b44febffc233bd009ba8673764d2a73512e0eab44024cb97134a3dd8,
                0x2970729690bd8c8362bf5d0a76c215a03c26ef8a3e01eb91cb0e0c70ee25525e
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 47
        ark(
            i,
            q,
            HashInputs3(
                0x1c395ca2c5db9b254b9b0ef75ba5c0961750f646f9a6a68d60e33ca2ce84427d,
                0x02356c76528c4b9ae14f13f529206cce462782256984db7e1c3aad5d6f367f68,
                0x0c5a67378876463bdb3ff94d63e062ecef7bd040316eae92c8b035f693ec388e
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 48
        ark(
            i,
            q,
            HashInputs3(
                0x1b2aafe5f720bfc99ef31b5e48b35df72fcc920e66c3d90d86537ae35ce6bff5,
                0x067987b7638b9b082848f8eba41ee203d3e90fc591407a4d87f81f088f9612a5,
                0x148d4b0218744bcaccceb62b6313a57272a1545fd75d1a8ebbd736e4276d5e6d
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 49
        ark(
            i,
            q,
            HashInputs3(
                0x043f8986cc56fcf8e88680a1e8f1c247165bcdb9a6ca2d94c7418d10ad8ef847,
                0x1ef035d9ff4391c8001fbec565a65ca3cd3b7d0823bb062a9141503a79731f81,
                0x0a5162e6b35a320dec11ba8639a1192f6a0a464f84dd3899c4dab9d4ebbfe024
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 50
        ark(
            i,
            q,
            HashInputs3(
                0x2b5c89e9872aed76baa36b83f87eb830fe16d34169f9eb1628e6fbeaa940cf3b,
                0x0625c126499750374f2d3fd08940d1c0238fbd8da85bdf47928188e3f9010627,
                0x116bb85cfe6730c6448192438af1748221d2bb302b3258350cbebb1c5eccd965
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 51
        ark(
            i,
            q,
            HashInputs3(
                0x11aa65a2b09da598bb66377e54458c1dc4a7a3775f9c9cf51b2ebea5c871abfb,
                0x280fbd8eb1ccc50603dbc78eb0bf9cb903cd9df30f0f25f215ad4c3e1fb6baf5,
                0x0761a3e812087679e2748d24993af14664667aa3d713796c79507f2a63f8ed76
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 52
        ark(
            i,
            q,
            HashInputs3(
                0x2ba668f10abf878c8010155d539eb3cc30bb698f0062b1ed338c526fd12ac96d,
                0x2f4e05914ef7c1b2edf41c51266d3dc3e75c91b4c8dcefef873287120021ce0c,
                0x29274bd37d7863d5ec7a82f28bce6cf183fffd4f8176ad07b158f1df83c64804
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 53
        ark(
            i,
            q,
            HashInputs3(
                0x0c48fad80901003d9b0da5451971f8eee03e4c394ec29da5bf20a7bfad98e41b,
                0x16cf2cf2b9da985924e713d6559192ca6128ccf71b4fc7c7ee0142d1c32f20d9,
                0x00b7d9233273de8b110605a3a7820c13cf7019bacf7e5882a85d5689f15c8cc1
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 54
        ark(
            i,
            q,
            HashInputs3(
                0x0f291f5ae7e99aabc73894608962de3b6b76490754c0861de32a58b1cdb86e18,
                0x253406b596a33f5cf4b7e83f26116eb40d9707911b4290b2af400d58d92cf210,
                0x0812a4144d0d74bead1c5710d5239b640ccfc39fb66dab8eaf7cb3160fe35861
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 55
        ark(
            i,
            q,
            HashInputs3(
                0x2d81a6da9eebc5d5d239d13b961bdeebadcce19f0625de11a866bbcd0ef6f174,
                0x1a22dafad979cab2f645899290eb4daccd04feef3155d88567324d23646f5064,
                0x1bff73ae8dcaec7d09db8cdaf9ca7a9a5d685a1665855b0fd4ab9c15289f181a
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 56
        ark(
            i,
            q,
            HashInputs3(
                0x0a16f8b0834ada0c92b57e0f3e79e31f4bc6c4fbfe1e1c8a22cce904c33ee709,
                0x0ce7964c214c6389d581357e69009a141e16451def5e801d313bad966d99548e,
                0x2825c06bf975dfd5e8466bee81947fc45b6a3e704dfe0350a04a9ed19293b3e0
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 57
        ark(
            i,
            q,
            HashInputs3(
                0x265917cf756c617609b958a33522fbaad9bdef1dfde2da8fc4d33b067058283f,
                0x305a6987d779fbb9c92aad8c64fd4398a501b347cf24d3ac0374379c3b988e0c,
                0x19ba5a328c09be61df3216db8ccfca1392a45d45ef73c6d0bbdf798f52b0caea
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 58
        ark(
            i,
            q,
            HashInputs3(
                0x0569057f32180f19cf467121a3ff492228542300b440840ead6ed63ff96fc92e,
                0x300ade0e02d409aa9cbd650c5018bf52c8aa6b46c3523664404942451cdfd7f3,
                0x13e7afc3e5b8ae05421d3101c6dcd069e9730f8b9a4d28b707919627d82ed576
            )
        );
        sbox_partial(i, q);
        mix(i, q);
        // round 59
        ark(
            i,
            q,
            HashInputs3(
                0x302cebb80f47bc0d048b047e3ec4370a824d7741209189d6fafb2e923c95f674,
                0x0fec1e8606f9c19f09f3f6cbca8690f2a82c728121731c10b70a0a27425b7617,
                0x01b36c8b38abe36f31c85dfa0a4223c2127f9e70d6cb00acca7b4b820c42b4f8
            )
        );
        sbox_full(i, q);
        mix(i, q);
        // round 60
        ark(
            i,
            q,
            HashInputs3(
                0x1ae800dfd62a6f893226eaf46ed30630be2e658ca33bb2f8cb64a0ef6936167e,
                0x043f80240127ebfdfe64478e6b490c262943c0891c090e4f9e5da3a777397962,
                0x284cc004329f4e38c3ca0e7b3148a180f6769757d97698a510f153ed07c0618b
            )
        );
        sbox_full(i, q);
        mix(i, q);
        // round 61
        ark(
            i,
            q,
            HashInputs3(
                0x0a18cfea20c4b70b9cfafbd495e4fb978527dd3adcbb2a1b51338f37b58eef02,
                0x1bc11b2f6acc89e45bfc09641d1f50fe735abfd0fe6b4485e134afe45ad302a4,
                0x27af048a94639f26777e999118a6a53c031cc694291d09c52dc41cfbf548c07f
            )
        );
        sbox_full(i, q);
        mix(i, q);
        // round 62
        ark(
            i,
            q,
            HashInputs3(
                0x226ab5b34d54c58d1b8fdfa18c3718e0adb3382accc596eaaa90c06d43d6e8fd,
                0x2434cc868807d7dc6385a67ab520f6908cd692288595b76156d7b1191d024617,
                0x05f662504bc7e177ef21ed6b4d8ef9a3dce1e82b88b2d48c35c0e23b405a15cf
            )
        );
        sbox_full(i, q);
        mix(i, q);

        return i.t1;
    }
}
