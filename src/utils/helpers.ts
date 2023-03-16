import { log, Bytes, BigInt, store, Address } from "@graphprotocol/graph-ts";
import { Cluster, Stash, Delegation, TokenData, Delegator, DelegatorToken, Network, State, DelegatorReward } from "../../generated/schema";
import { ClusterRewards as ClusterRewardsContract } from "../../generated/ClusterRewards/ClusterRewards";
import { RewardDelegators as RewardDelegatorsContract } from "../../generated/RewardDelegators/RewardDelegators";
import {
    BIGINT_ZERO,
    ZERO_ADDRESS,
    getRewardDelegatorAddress,
    STATUS_NOT_REGISTERED,
    BIGINT_ONE,
    DELEGATOR_TOKEN_ACTION,
    NETWORK_CLUSTER_OPERATION,
    ACTIVE_CLUSTER_COUNT_OPERATION,
    saveClusterHistory,
    CLUSTER_OPERATION
} from "./constants";

export function stashDeposit(stashId: string, tokens: Bytes[], amounts: BigInt[]): void {
    let stash = Stash.load(stashId);
    if (!stash) {
        stash = new Stash(stashId);
    }
    let tokensDelegatedId = stash.tokensDelegatedId as Bytes[];
    let tokensDelegatedAmount = stash.tokensDelegatedAmount as BigInt[];

    for (let i = 0; i < tokens.length; i++) {
        let tokenDataId = tokens[i].toHexString() + stashId;
        let tokenData = TokenData.load(tokenDataId);
        if (tokenData == null) {
            tokenData = new TokenData(tokenDataId);
            tokenData.token = tokens[i].toHexString();
            tokenData.stash = stashId;
            tokenData.amount = BIGINT_ZERO;

            let tokenIds = stash.tokenIds as Bytes[];
            tokenIds.push(tokens[i]);
            stash.tokenIds = tokenIds;
        }

        tokenData.amount = tokenData.amount.plus(amounts[i]);

        tokenData.save();

        if (!tokensDelegatedId.includes(tokens[i])) {
            tokensDelegatedId.push(tokens[i]);
            stash.tokensDelegatedId = tokensDelegatedId;

            tokensDelegatedAmount.push(tokenData.amount);
            stash.tokensDelegatedAmount = tokensDelegatedAmount;
        } else {
            let index = tokensDelegatedId.indexOf(tokens[i]);

            tokensDelegatedAmount[index] = tokenData.amount;

            stash.tokensDelegatedAmount = tokensDelegatedAmount;
        }

        updateDelegatorTokens(stash.staker.toHexString(), tokens[i].toHexString(), amounts[i], DELEGATOR_TOKEN_ACTION.ADD);
    }

    stash.save();
}

export function stashWithdraw(stashId: string, tokens: Bytes[], amounts: BigInt[]): void {
    let stash = Stash.load(stashId);
    if (!stash) {
        stash = new Stash(stashId);
    }

    let tokensDelegatedId = stash.tokensDelegatedId as Bytes[];
    let tokensDelegatedAmount = stash.tokensDelegatedAmount as BigInt[];

    for (let i = 0; i < tokens.length; i++) {
        if (amounts[i].equals(BIGINT_ZERO)) continue;
        let tokenDataId = tokens[i].toHexString() + stashId;
        let tokenData = TokenData.load(tokenDataId);
        if (!tokenData) {
            tokenData = new TokenData(tokenDataId);
        }
        tokenData.amount = tokenData.amount.minus(amounts[i]);

        tokenData.save();

        let index = tokensDelegatedId.indexOf(tokens[i]);

        tokensDelegatedAmount[index] = tokenData.amount;

        stash.tokensDelegatedAmount = tokensDelegatedAmount;

        updateDelegatorTokens(stash.staker.toHexString(), tokens[i].toHexString(), amounts[i], DELEGATOR_TOKEN_ACTION.WITHDRAW);
    }

    stash.save();
}

export function stashDelegation(stashId: string, cluster: string): void {
    let stash = Stash.load(stashId);
    if (!stash) {
        stash = new Stash(stashId);
    }
    let tokenIds = stash.tokenIds as Bytes[];

    let tokensDelegatedIdV2 = stash.tokensDelegatedIdV2 as Bytes[];
    let tokensDelegatedAmountV2 = stash.tokensDelegatedAmountV2 as BigInt[];
    let temp = BIGINT_ZERO;

    for (let i = 0; i < tokenIds.length; i++) {
        let tokenDataId = tokenIds[i].toHexString() + stashId;
        let tokenData = TokenData.load(tokenDataId);
        if (!tokenData) {
            tokenData = new TokenData(tokenDataId);
        }
        let amount = tokenData.amount;

        if (!tokensDelegatedIdV2.includes(tokenIds[i])) {
            tokensDelegatedIdV2.push(tokenIds[i]);
            stash.tokensDelegatedIdV2 = tokensDelegatedIdV2;

            tokensDelegatedAmountV2.push(amount);
            stash.tokensDelegatedAmountV2 = tokensDelegatedAmountV2;
        } else {
            let index = tokensDelegatedIdV2.indexOf(tokenIds[i]);

            amount = amount.minus(tokensDelegatedAmountV2[index]);
            tokensDelegatedAmountV2[index] = tokensDelegatedAmountV2[index].plus(amount);

            stash.tokensDelegatedAmountV2 = tokensDelegatedAmountV2;
        }

        stash.save();

        updateClusterDelegatorInfo(stashId, cluster, [tokenIds[i]], [amount], "delegated");
    }

    // for (let i = 0; i < tokensDelegatedIdV2.length; i++) {
    //     temp = temp.plus(tokensDelegatedAmountV2[i]);

    //     if (
    //         temp == BIGINT_ZERO &&
    //         i == tokensDelegatedIdV2.length - 1
    //     ) {
    //         stash.isActive = false;
    //     }
    // }

    stash.save();
}

export function stashUndelegation(stashId: string, cluster: string): void {
    let stash = Stash.load(stashId);
    if (!stash) {
        stash = new Stash(stashId);
    }

    let tokenIds = stash.tokenIds as Bytes[];

    let tokensDelegatedIdV2 = stash.tokensDelegatedIdV2 as Bytes[];
    let tokensDelegatedAmountV2 = stash.tokensDelegatedAmountV2 as BigInt[];

    for (let i = 0; i < tokenIds.length; i++) {
        let index = tokensDelegatedIdV2.indexOf(tokenIds[i]);

        log.info("SU1: {}, {}, {}", [stash.staker.toHexString(), tokenIds[i].toHexString(), tokensDelegatedAmountV2[index].toHexString()]);

        let amount = tokensDelegatedAmountV2[index];
        tokensDelegatedAmountV2[index] = BIGINT_ZERO;
        // tokensDelegatedAmountV2[index] = tokensDelegatedAmountV2[index]
        //     .minus(amount);

        {
            let stashLog = Stash.load(stashId);
            if (!stashLog) {
                stashLog = new Stash(stashId);
            }
            log.info("SU2: {}, {}, {}", [
                stashLog.staker.toHexString(),
                tokenIds[i].toHexString(),
                tokensDelegatedAmountV2[index].toHexString()
            ]);
        }

        updateClusterDelegatorInfo(stashId, cluster, [tokenIds[i]], [amount], "undelegated");
        {
            let stashLog = Stash.load(stashId);
            if (!stashLog) {
                stashLog = new Stash(stashId);
            }
            log.info("SU3: {}, {}, {}", [
                stashLog.staker.toHexString(),
                tokenIds[i].toHexString(),
                tokensDelegatedAmountV2[index].toHexString()
            ]);
        }
    }

    // for (let i = 0; i < tokensDelegatedIdV2.length; i++) {
    //     temp = temp.plus(tokensDelegatedAmountV2[i]);

    //     if (
    //         temp == BIGINT_ZERO &&
    //         i == tokensDelegatedIdV2.length - 1
    //     ) {
    //         stash.isActive = false;
    //     }
    // }

    stash.tokensDelegatedAmountV2 = tokensDelegatedAmountV2;
    stash.save();
}

export function updateClusterDelegatorInfo(
    stashId: string,
    clusterId: string,
    tokens: Bytes[],
    amounts: BigInt[],
    operation: string
): void {
    let stash = Stash.load(stashId);
    if (!stash) {
        stash = new Stash(stashId);
    }
    let cluster = Cluster.load(clusterId);
    if (cluster == null) {
        cluster = new Cluster(clusterId);
        cluster.commission = BIGINT_ZERO;
        cluster.rewardAddress = Bytes.fromHexString("0x");
        cluster.clientKey = Bytes.fromHexString("0x");
        cluster.networkId = Bytes.fromHexString("0x");
        cluster.status = STATUS_NOT_REGISTERED;
        cluster.delegators = [];
        cluster.pendingRewards = BIGINT_ZERO;
        cluster.updatedNetwork = null;
        cluster.networkUpdatesAt = BIGINT_ZERO;
        cluster.updatedCommission = null;
        cluster.commissionUpdatesAt = BIGINT_ZERO;
        cluster.clusterUnregistersAt = BIGINT_ZERO;
    }

    if (amounts[0].gt(BIGINT_ZERO) && operation === "delegated") {
        let delegators = cluster.delegators;
        // if(delegators.indexOf(stash.staker.toHexString()) == -1) {
        delegators.push(stash.staker.toHexString());
        cluster.delegators = delegators;
        // }
    } else if (amounts[0].gt(BIGINT_ZERO) && operation === "undelegated") {
        let delegators = cluster.delegators;
        // if(delegators.indexOf(stash.staker.toHexString()) != -1) {
        let index = delegators.indexOf(stash.staker.toHexString());
        delegators.splice(index, 1);
        cluster.delegators = delegators;
        // }
    }

    for (let i = 0; i < cluster.delegators.length; i++) {
        log.info("UCDI0: {}, {}, {}, {}", [i.toString(), clusterId, stashId, cluster.delegators[i]]);
    }

    cluster.save();

    updateClusterDelegation(clusterId, tokens, amounts, operation);
}

export function updateClusterDelegation(clusterId: string, tokens: Bytes[], amounts: BigInt[], operation: string): void {
    if (operation === "delegated") {
        for (let i = 0; i < tokens.length; i++) {
            let id = tokens[i].toHexString() + clusterId;
            let delegation = Delegation.load(id);
            if (amounts[i] == BIGINT_ZERO) {
                continue;
            }

            if (!delegation) {
                delegation = new Delegation(id);
                delegation.token = tokens[i].toHexString();
                delegation.cluster = clusterId;
                delegation.amount = BIGINT_ZERO;
            }

            delegation.amount = delegation.amount.plus(amounts[i]);

            delegation.save();
        }
    } else if (operation === "undelegated") {
        for (let i = 0; i < tokens.length; i++) {
            let id = tokens[i].toHexString() + clusterId;

            let delegation = Delegation.load(id);
            if (!delegation) {
                delegation = new Delegation(id);
                delegation.token = tokens[i].toHexString();
                delegation.cluster = clusterId;
                delegation.amount = BIGINT_ZERO;

                if (amounts[i].equals(BIGINT_ZERO)) {
                    continue;
                }
            }

            delegation.amount = delegation.amount.minus(amounts[i]);

            if (delegation.amount.equals(BIGINT_ZERO)) {
                store.remove("Delegation", id);
            } else {
                delegation.save();
            }
        }
    }
}

export function updateDelegatorTokens(delegatorId: string, token: string, amount: BigInt, action: DELEGATOR_TOKEN_ACTION): void {
    log.info("UDT: {}, {}, {}, {}", [delegatorId, token, amount.toHexString(), action.toString()]);
    let delegator = Delegator.load(delegatorId);

    if (!delegator) {
        delegator = new Delegator(delegatorId);
        delegator.address = delegatorId;
        delegator.totalPendingReward = BIGINT_ZERO;
        delegator.stashes = [];
        delegator.totalRewardsClaimed = BIGINT_ZERO;
        delegator.clusters = [];
        delegator.save();
    }

    let delegatorTokenId = delegatorId + token;
    let delegatorToken = DelegatorToken.load(delegatorTokenId);

    if (action === DELEGATOR_TOKEN_ACTION.ADD) {
        if (!delegatorToken) {
            delegatorToken = new DelegatorToken(delegatorTokenId);
            delegatorToken.delegator = delegatorId;
            delegatorToken.token = token;
            delegatorToken.amount = BIGINT_ZERO;
        }

        delegatorToken.amount = delegatorToken.amount.plus(amount);
    } else if (action === DELEGATOR_TOKEN_ACTION.WITHDRAW) {
        if (!delegatorToken && amount.equals(BIGINT_ZERO)) {
            return;
        }
        if (delegatorToken) {
            delegatorToken.amount = delegatorToken.amount.minus(amount);
        }
    }

    // if delegatorToken.amount is null then its not comparable to BIGINT_ZERO
    if (delegatorToken && delegatorToken.amount.notEqual(BIGINT_ZERO)) {
        delegatorToken.save();
    } else {
        store.remove("DelegatorToken", delegatorTokenId);
    }

    // if (delegatorToken?.amount.equals(BIGINT_ZERO)) {
    //     store.remove("DelegatorToken", delegatorTokenId);
    // } else {
    //     delegatorToken.save();
    // }
}

export function updateNetworkClusters(
    existingNetworkId: Bytes,
    updatedNetworkId: Bytes,
    clusterId: string,
    operation: NETWORK_CLUSTER_OPERATION
): void {
    if (operation !== NETWORK_CLUSTER_OPERATION.ADD) {
        let existingNetwork = Network.load(existingNetworkId.toHexString());
        if (!existingNetwork) {
            existingNetwork = new Network(existingNetworkId.toHexString());
        }
        let index = existingNetwork.clusters.indexOf(clusterId);

        if (index > -1) {
            let networkClusters = existingNetwork.clusters;
            networkClusters.splice(index, 1);
            existingNetwork.clusters = networkClusters;
            existingNetwork.save();
        }
    }

    if (operation !== NETWORK_CLUSTER_OPERATION.UNREGISTERED) {
        let networkIdString = updatedNetworkId.toHexString();
        let network = Network.load(networkIdString);

        if (!network) {
            network = new Network(networkIdString);
            network.networkId = updatedNetworkId;
            network.clusters = [];
        }

        let clustedIndex = network.clusters.indexOf(clusterId);

        if (clustedIndex < 0) {
            let clusters = network.clusters;
            clusters.push(clusterId);
            network.clusters = clusters;
            network.save();
        }
    }
}

export function updateNetworkClustersReward(networkId: string, clusterRewardsAddress: Address, hash: Bytes, timestamp: BigInt): void {
    let network = Network.load(networkId);
    if (!network) {
        network = new Network(networkId);
    }
    let clusters = network.clusters;
    let clusterRewardsContract = ClusterRewardsContract.bind(clusterRewardsAddress);
    for (let i = 0; i < clusters.length; i++) {
        let cluster = Cluster.load(clusters[i]);
        if (!cluster) {
            cluster = new Cluster(clusters[i]);
        }

        let result = clusterRewardsContract.clusterRewards(Address.fromString(clusters[i]));

        let reward = result;
        cluster.pendingRewards = reward.times(cluster.commission).div(BigInt.fromI32(100));

        cluster.save();

        updateClusterDelegatorsReward(clusters[i], clusterRewardsAddress);
        saveClusterHistory(clusters[i], CLUSTER_OPERATION.CLUSTER_REWARDED, hash, timestamp);
    }
}

export function updateClusterDelegatorsReward(clusterId: string, clusterRewardsAddress: Address): void {
    let cluster = Cluster.load(clusterId);
    if (!cluster) {
        cluster = new Cluster(clusterId);
    }
    let delegators = cluster.delegators;

    for (let i = 0; i < delegators.length; i++) {
        let delegatorRewardId = delegators[i] + clusterId;
        let delegatorReward = DelegatorReward.load(delegatorRewardId);
        let delegatorRewardStored = delegatorReward;
        if (delegatorReward == null) {
            delegatorReward = new DelegatorReward(delegatorRewardId);
            delegatorReward.cluster = clusterId;
            delegatorReward.amount = BIGINT_ZERO;
            delegatorReward.delegator = delegators[i];
        }

        let rewardDelegatorAddress = getRewardDelegatorAddress();

        if (rewardDelegatorAddress.toHexString() === ZERO_ADDRESS) {
            log.critical("rewardDelegator mapping doesnt exist for {}", [clusterRewardsAddress.toHexString()]);
        }

        let rewardDelegatorContract = RewardDelegatorsContract.bind(rewardDelegatorAddress);

        let result = rewardDelegatorContract.try_withdrawRewards(Address.fromString(delegators[i]), Address.fromString(clusterId));

        if (!result.reverted) {
            let reward = result.value;
            let delegator = Delegator.load(delegators[i]);
            if (!delegator) {
                delegator = new Delegator(delegators[i]);
            }
            delegator.totalPendingReward = delegator.totalPendingReward.plus(reward).minus(delegatorReward.amount);

            delegatorReward.amount = reward;
            delegator.save();
        }

        if (delegatorReward.amount.equals(BIGINT_ZERO)) {
            if (delegatorRewardStored != null) {
                store.remove("DelegatorReward", delegatorRewardId);
            }
        } else {
            delegatorReward.save();
        }
    }
}

export function updateAllClustersList(clusterId: Bytes): void {
    let state = State.load("state");
    if (!state) {
        state = new State("state");
        state.clusters = [];
        state.activeClusterCount = BIGINT_ZERO;
    }

    let clusters = state.clusters;
    clusters.push(clusterId.toHexString());
    state.clusters = clusters;
    state.save();
}

export function updateActiveClusterCount(operation: ACTIVE_CLUSTER_COUNT_OPERATION): void {
    let state = State.load("state");
    if (!state) {
        state = new State("state");
        state.clusters = [];
        state.activeClusterCount = BIGINT_ZERO;
    }
    if (operation === ACTIVE_CLUSTER_COUNT_OPERATION.REGISTER) {
        state.activeClusterCount = state.activeClusterCount.plus(BIGINT_ONE);
    } else {
        state.activeClusterCount = state.activeClusterCount.minus(BIGINT_ONE);
    }
    state.save();
}
