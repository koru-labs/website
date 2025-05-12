async function getEvents() {
    try {
        const event_address = "0xe94fa3040d20a01a1b8f42De7c430A11c27e2524";
        const l1Bridge = await hre.ethers.getContractAt("TokenScBase", event_address);


        const endBlock = await hre.ethers.provider.getBlockNumber();  // 最新区块
        const startBlock = endBlock - 10000;  // 起始区块
        const batchSize = 1000;  // 每次查询的区块范围

        // 事件名称（确保事件名称正确）
        const eventName = "TokenSplitDebugEvent";  // 请根据实际情况修改事件名称

        for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += batchSize) {
            const toBlock = Math.min(fromBlock + batchSize - 1, endBlock);

            console.log(`Fetching events from block ${fromBlock} to ${toBlock}...`);

            // 获取指定事件名称的事件
            const events = await l1Bridge.queryFilter(eventName, fromBlock, toBlock);

            if (events.length === 0) {
                console.log(`No events found from block ${fromBlock} to ${toBlock}`);
            }

            events.forEach(event => {
                console.log('Event Name:', event.eventName);  // 事件名称
                console.log('Event Data:', event.args);   // 事件数据
                console.log('-----------------------------');
            });
        }
    } catch (err) {
        console.error('Error fetching events:', err);
    }
}

getEvents();