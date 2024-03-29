import {
    log,
    Bytes,
    BigInt,
    store,
    Address,
} from "@graphprotocol/graph-ts";
import {
    Cluster,
    Stash,
    Delegation,
    TokenData,
    Delegator,
    DelegatorToken,
    Network,
    State,
    DelegatorReward,
} from '../../generated/schema';
import {
    ClusterRewards as ClusterRewardsContract,
} from '../../generated/ClusterRewards/ClusterRewards';
import {
    RewardDelegators as RewardDelegatorsContract,
} from '../../generated/RewardDelegators/RewardDelegators';
import {
    BIGINT_ZERO,
    ZERO_ADDRESS,
    getRewardDelegatorAddress,
    STATUS_NOT_REGISTERED,
    BIGINT_ONE,
} from './constants';

export function updateStashTokens(
    stashId: string,
    tokens: Bytes[],
    amounts: BigInt[],
    action: string,
    updateTotalDele: boolean,
): void {
    let stash = Stash.load(stashId);
    let delegatedCluster = stash.delegatedCluster;
    let tokensDelegatedId = stash.tokensDelegatedId as Bytes[];
    let tokensDelegatedAmount = stash.tokensDelegatedAmount as BigInt[];
    let temp = BIGINT_ZERO;

    for (let i = 0; i < tokens.length; i++) {
        let tokenDataId = tokens[i].toHexString() + stashId;
        let tokenData = TokenData.load(tokenDataId);

        if (action === "add") {
            if (tokenData == null) {
                tokenData = new TokenData(tokenDataId);
                tokenData.token = tokens[i].toHexString();
                tokenData.stash = stashId;
                tokenData.amount = BIGINT_ZERO;
            }

            tokenData.amount = tokenData.amount.plus(
                amounts[i]
            );

            if (!tokensDelegatedId.includes(tokens[i])) {
                tokensDelegatedId.push(tokens[i]);
                stash.tokensDelegatedId = tokensDelegatedId;

                tokensDelegatedAmount.push(amounts[i]);
                stash.tokensDelegatedAmount = tokensDelegatedAmount;
            } else {
                let index = tokensDelegatedId.indexOf(
                    tokens[i]
                );

                tokensDelegatedAmount[index] = tokensDelegatedAmount[index]
                    .plus(amounts[i]);

                stash.tokensDelegatedAmount = tokensDelegatedAmount;
            }
        } else if (action === "withdraw") {
            tokenData.amount = tokenData.amount.minus(
                amounts[i]
            );

            let index = tokensDelegatedId.indexOf(
                tokens[i]
            );

            tokensDelegatedAmount[index] = tokensDelegatedAmount[index]
                .minus(amounts[i]);

            stash.tokensDelegatedAmount = tokensDelegatedAmount;
        }
        
        tokenData.save();

        if (delegatedCluster.length > 0 && updateTotalDele) {
            updateDelegatorTokens(
                stash.staker.toHexString(),
                tokens[i].toHexString(),
                amounts[i],
                action,
            );
        }
    };

    for (let i = 0; i < tokensDelegatedId.length; i++) {
        temp = temp.plus(tokensDelegatedAmount[i]);

        if (
            temp == BIGINT_ZERO &&
            i == tokensDelegatedId.length - 1
        ) {
            stash.isActive = false;
        }
    }

    stash.save();
}

export function updateClusterDelegatorInfo(
    stashId: string,
    clusterId: string,
    operation: string,
): void {
    let stash = Stash.load(stashId);
    let cluster = Cluster.load(clusterId);
    if (cluster == null) {
        cluster = new Cluster(clusterId);
        cluster.commission = BIGINT_ZERO;
        cluster.rewardAddress = null;
        cluster.clientKey = null;
        cluster.networkId = null;
        cluster.status = STATUS_NOT_REGISTERED;
        cluster.delegators = [];
        cluster.pendingRewards = BIGINT_ZERO;
        cluster.updatedNetwork = null;
        cluster.networkUpdatesAt = BIGINT_ZERO;
        cluster.updatedCommission = null;
        cluster.commissionUpdatesAt = BIGINT_ZERO;
        cluster.clusterUnregistersAt = BIGINT_ZERO;
    }

    let tokens = stash.tokensDelegatedId as Bytes[];
    let amounts = stash.tokensDelegatedAmount as BigInt[];

    if (operation === "delegated") {
        let delegators = cluster.delegators;
        delegators.push(stash.staker.toHexString());
        cluster.delegators = delegators;
    } else if (operation === "undelegated") {
        let delegators = cluster.delegators;
        let index = delegators.indexOf(
            stash.staker.toHexString()
        );
        delegators.splice(index, 1);
        cluster.delegators = delegators;
    }

    cluster.save();

    updateClusterDelegation(
        clusterId,
        tokens,
        amounts,
        operation,
    );
};

export function updateClusterDelegation(
    clusterId: string,
    tokens: Bytes[],
    amounts: BigInt[],
    operation: string,
): void {
    if (operation === "delegated") {
        for (let i = 0; i < tokens.length; i++) {
            let id = tokens[i].toHexString() + clusterId;
            let delegation = Delegation.load(id);
            if(amounts[i] == BIGINT_ZERO) {
                continue;
            }

            if (delegation == null) {
                delegation = new Delegation(id);
                delegation.token = tokens[i].toHexString();
                delegation.cluster = clusterId;
                delegation.amount = BIGINT_ZERO;
            }

            delegation.amount = delegation.amount.plus(
                amounts[i]
            );

            delegation.save();
        }
    } else if (operation === "undelegated") {
        for (let i = 0; i < tokens.length; i++) {
            let id = tokens[i].toHexString() + clusterId;

            let delegation = Delegation.load(id);

            if(delegation == null && amounts[i] == BIGINT_ZERO) {
                continue;
            }

            delegation.amount = delegation.amount.minus(
                amounts[i]
            );

            if (delegation.amount == BIGINT_ZERO) {
                store.remove("Delegation", id);
            } else {
                delegation.save();
            }
        }
    }
};

export function updateDelegatorTotalDelegation(
    delegatorId: Bytes,
    tokens: Bytes[],
    amounts: BigInt[],
    action: string,
): void {
    for (let i = 0; i < tokens.length; i++) {
        let operation = action == "delegated" ?
            "add" : "withdraw";

        updateDelegatorTokens(
            delegatorId.toHexString(),
            tokens[i].toHexString(),
            amounts[i],
            operation,
        );
    }
};

export function updateDelegatorTokens(
    delegatorId: string,
    token: string,
    amount: BigInt,
    action: string,
): void {
    let delegator = Delegator.load(delegatorId);

    if (delegator == null) {
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

    if (action === "add") {
        if (delegatorToken == null) {
            delegatorToken = new DelegatorToken(delegatorTokenId);
            delegatorToken.delegator = delegatorId;
            delegatorToken.token = token;
            delegatorToken.amount = BIGINT_ZERO;
        }

        delegatorToken.amount = delegatorToken.amount.plus(
            amount
        );
    } else if (action === "withdraw") {
        if(delegatorToken == null && amount == BIGINT_ZERO) {
            return;
        }
        delegatorToken.amount = delegatorToken.amount.minus(
            amount
        );
    }

    // if delegatorToken.amount is null then its not comparable to BIGINT_ZERO
    if (delegatorToken.amount == BIGINT_ZERO) {
        store.remove("DelegatorToken", delegatorTokenId);
    } else {
        delegatorToken.save();
    }
}

export function updateNetworkClusters(
    existingNetworkId: Bytes,
    updatedNetworkId: Bytes,
    clusterId: string,
    operation: string,
): void {
    if (operation !== "add") {
        let existingNetwork = Network.load(
            existingNetworkId.toHexString()
        );
        let index = existingNetwork.clusters.indexOf(
            clusterId
        );

        if (index > -1) {
            let networkClusters = existingNetwork.clusters as string[];
            networkClusters.splice(index, 1);
            existingNetwork.clusters = networkClusters;
            existingNetwork.save();
        }
    }

    if (operation !== "unregistered") {
        let networkIdString = updatedNetworkId.toHexString();
        let network = Network.load(networkIdString);

        if (network == null) {
            network = new Network(networkIdString);
            network.networkId = updatedNetworkId;
            network.clusters = [];
        }

        let clustedIndex = network.clusters.indexOf(
            clusterId
        );

        if (clustedIndex < 0) {
            let clusters = network.clusters;
            clusters.push(clusterId);
            network.clusters = clusters;
            network.save();
        }
    }
}

export function updateNetworkClustersReward(
    networkId: string,
    clusterRewardsAddress: Address
): void {
    let network = Network.load(networkId);
    let clusters = network.clusters as string[];
    let clusterRewardsContract = ClusterRewardsContract.bind(clusterRewardsAddress);
    for (let i = 0; i < clusters.length; i++) {
        let cluster = Cluster.load(clusters[i]);

        let result = clusterRewardsContract.clusterRewards(
            Address.fromString(
                clusters[i]
            )
        );

        let reward = result;
        cluster.pendingRewards = (reward.times(cluster.commission))
            .div(BigInt.fromI32(100));

        cluster.save();

        updateClusterDelegatorsReward(clusters[i], clusterRewardsAddress);
    }
};

export function updateClusterDelegatorsReward(
    clusterId: string,
    clusterRewardsAddress: Address
): void {
    let cluster = Cluster.load(clusterId);
    let delegators = cluster.delegators as string[];

    for (let i = 0; i < delegators.length; i++) {
        let delegatorRewardId = delegators[i] + clusterId;
        let delegatorReward = DelegatorReward.load(
            delegatorRewardId
        );
        let delegatorRewardStored = delegatorReward;
        if (delegatorReward == null) {
            delegatorReward = new DelegatorReward(
                delegatorRewardId
            );
            delegatorReward.cluster = clusterId;
            delegatorReward.amount = BIGINT_ZERO;
            delegatorReward.delegator = delegators[i];
        }

        let rewardDelegatorContract = RewardDelegatorsContract.bind(
            getRewardDelegatorAddress(clusterRewardsAddress)
        );
        

        let result = rewardDelegatorContract.try_withdrawRewards(
            Address.fromString(delegators[i]),
            Address.fromString(clusterId)
        );

        if (!result.reverted) {
            let reward = result.value;
            let delegator = Delegator.load(delegators[i]);

            delegator.totalPendingReward = delegator
                .totalPendingReward.plus(reward)
                .minus(delegatorReward.amount);

            delegatorReward.amount = reward;
            delegator.save();
        }

        if(delegatorReward.amount.equals(BIGINT_ZERO)) {
            if(delegatorRewardStored != null) {
                store.remove('DelegatorReward', delegatorRewardId);
            }
        } else {
            delegatorReward.save();
        }
    }
};

export function updateAllClustersList(
    clusterId: Bytes
): void {
    let state = State.load("state");
    if (state == null) {
        state = new State("state");
        state.clusters = [];
        state.activeClusterCount = BIGINT_ZERO;
    }

    let clusters = state.clusters;
    clusters.push(clusterId.toHexString());
    state.clusters = clusters;
    state.save();
}

export function updateClustersInfo(
    blockNumber: BigInt,
    clusters: string[]
): void {
    if (clusters.length > 0) {
        for (let i = 0; i < clusters.length; i++) {
            let cluster = Cluster.load(clusters[i]);

            let networkUpdateBlock =
                cluster.networkUpdatesAt as BigInt;
            let commissionUpdateBlock =
                cluster.commissionUpdatesAt as BigInt;
            let unregisterBlock =
                cluster.clusterUnregistersAt as BigInt;

            if (
                networkUpdateBlock.gt(BIGINT_ZERO) &&
                blockNumber.ge(networkUpdateBlock)
            ) {
                updateNetworkClusters(
                    cluster.networkId,
                    cluster.updatedNetwork as Bytes,
                    clusters[i],
                    "changed",
                );

                cluster.networkId = cluster.updatedNetwork as Bytes;
                cluster.updatedNetwork = null;
                cluster.networkUpdatesAt = BIGINT_ZERO;
            }

            if (
                commissionUpdateBlock.gt(BIGINT_ZERO) &&
                blockNumber.ge(commissionUpdateBlock)
            ) {
                cluster.commission = cluster.updatedCommission as BigInt;
                cluster.updatedCommission = null;
                cluster.commissionUpdatesAt = BIGINT_ZERO;
            }

            if (
                unregisterBlock.gt(BIGINT_ZERO) &&
                blockNumber.ge(unregisterBlock)
            ) {
                cluster.status = STATUS_NOT_REGISTERED;
                cluster.clusterUnregistersAt = BIGINT_ZERO;

                updateNetworkClusters(
                    cluster.networkId,
                    new Bytes(0),
                    clusters[i],
                    "unregistered",
                );
                updateActiveClusterCount("unregister");
            }

            cluster.save();
        };
    }
}

export function updateActiveClusterCount(operation: string): void {
    let state = State.load("state");
    if (state == null) {
        state = new State("state");
        state.clusters = [];
        state.activeClusterCount = BIGINT_ZERO;
    }
    if (operation == "register") {
        state.activeClusterCount = state.activeClusterCount.plus(BIGINT_ONE);
    } else {
        state.activeClusterCount = state.activeClusterCount.minus(BIGINT_ONE);
    }
    state.save();
}
