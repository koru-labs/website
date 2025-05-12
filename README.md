# ucl-contract
this code repo is used to test and deploy ucl smart contract in different environments:
1. local ganache
2. local besu
3. hams besu


to run  a local besu environment, follow the steps below
```shell
git clone https://github.com/Consensys/besu-qbft-docker.git
cd besu-qbft-docker
docker-compose up
```

# Deploy smart contract
## localhost
npm run zk4-local-rm
## server
npm run zk4-server-besu-rm


# test L2
# localhost L2
--network localL2
##  server L2 test
--network serverL2











