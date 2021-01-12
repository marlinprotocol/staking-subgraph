import {
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
} from '../../generated/schema';
import {
    ClusterRewards as ClusterRewardsContract,
} from '../../generated/ClusterRewards/ClusterRewards';
import {
    RewardDelegators as RewardDelegatorsContract,
} from '../../generated/RewardDelegators/RewardDelegators';
import {
    BIGINT_ZERO,
    CLUSTER_REWARDS_ADDRESS,
    REWARD_DELEGATOR_ADDRESS,
} from './constants';

let clusterRewardsContract = ClusterRewardsContract.bind(
    CLUSTER_REWARDS_ADDRESS
);

export function updateStashTokens(
    stashId: string,
    tokens: Bytes[],
    amounts: BigInt[],
    action: string,
): void {
    for (let i = 0; i < tokens.length; i++) {
        let tokenDataId = tokens[i].toHexString() + stashId;
        let tokenData = TokenData.load(tokenDataId);
        let stash = Stash.load(stashId);
        let delegatedCluster = stash.delegatedCluster;
        let tokensDelegatedId = stash.tokensDelegatedId as Bytes[];
        let tokensDelegatedAmount = stash.tokensDelegatedAmount as BigInt[];

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

                tokensDelegatedAmount[index] = tokensDelegatedAmount[i]
                    .plus(amounts[i]);

                stash.tokensDelegatedAmount = tokensDelegatedAmount;
            }

            stash.save();
        } else if (action === "withdraw") {
            tokenData.amount = tokenData.amount.minus(
                amounts[i]
            );

            let index = tokensDelegatedId.indexOf(
                tokens[i]
            );

            tokensDelegatedAmount[index] = tokensDelegatedAmount[i]
                .minus(amounts[i]);

            stash.tokensDelegatedAmount = tokensDelegatedAmount;
            stash.save();
        }

        if (tokenData.amount == BIGINT_ZERO) {
            store.remove("TokenData", tokenDataId);
        } else {
            tokenData.save();
        }

        if (delegatedCluster.length > 0) {
            updateDelegatorTokens(
                stash.staker.toHexString(),
                tokens[i].toHexString(),
                amounts[i],
                action,
            );
        }
    };
}

export function updateClusterDelegatorInfo(
    stashId: string,
    clusterId: string,
    operation: string,
): void {
    let stash = Stash.load(stashId);
    let cluster = Cluster.load(stash.delegatedCluster);

    let tokens = stash.tokensDelegatedId as Bytes[];
    let amounts = stash.tokensDelegatedAmount as BigInt[];

    if (operation === "delegated") {
        let delegators = cluster.delegators;
        delegators.push(stash.staker.toHexString());
        cluster.delegators = delegators;
    } else if (operation === "undelegated") {
        let index = cluster.delegators.indexOf(
            stash.staker.toHexString()
        );

        if (index > -1) {
            let delegators = cluster.delegators;
            delegators.splice(index, 1);
            cluster.delegators = delegators;
        }
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
        delegator.pendingRewards = BIGINT_ZERO;
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
    } else if (action == "withdraw") {
        delegatorToken.amount = delegatorToken.amount.minus(
            amount
        );
    }

    if (delegatorToken.amount == BIGINT_ZERO) {
        store.remove("DelegatorToken", delegatorTokenId);
    } else {
        delegatorToken.save();
    }
}

export function updateNetworkClusters(
    networkId: Bytes,
    clusterId: Bytes,
    operation: string,
): void {
    if (operation === "changed") {
        let cluster = Cluster.load(clusterId.toHexString());
        let existingNetworkId = cluster.networkId;

        let existingNetwork = Network.load(
            existingNetworkId.toHexString()
        );
        let index = existingNetwork.clusters.indexOf(
            clusterId
        );

        if (index > -1) {
            let networkClusters = existingNetwork.clusters as Bytes[];
            networkClusters.splice(index, 1);
            existingNetwork.clusters = networkClusters;
            existingNetwork.save();
        }
    }

    let networkIdString = networkId.toHexString();
    let network = Network.load(networkIdString);

    if (network == null) {
        network = new Network(networkIdString);
        network.networkId = networkId;
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

export function updateNetworkClustersReward(
    networkId: string,
): void {
    let network = Network.load(networkId);
    let clusters = network.clusters as Bytes[];
    for (let i = 0; i < clusters.length; i++) {
        let cluster = Cluster.load(clusters[i].toHexString());
        let reward = clusterRewardsContract.clusterRewards(
            Address.fromString(
                clusters[i].toHexString()
            )
        );

        cluster.pendingRewards = reward;
        cluster.save();
    }
};

export function updateClusterDelegatorsReward(
    clusterId: string,
): void {
    let cluster = Cluster.load(clusterId);
    let delegators = cluster.delegators as string[];
    let contract = RewardDelegatorsContract.bind(
        REWARD_DELEGATOR_ADDRESS
    );

    for (let i = 0; i < delegators.length; i++) {
        let delegator = Delegator.load(delegators[i]);
        let reward = contract.withdrawRewards(
            Address.fromString(delegators[i]),
            Address.fromString(clusterId)
        );

        delegator.pendingRewards = delegator.pendingRewards
            .plus(reward);

        delegator.save();
    }
};

export function updateClusterPendingReward(
    clusterId: string,
): void {
    let cluster = Cluster.load(clusterId);
    cluster.pendingRewards = BIGINT_ZERO;
    cluster.save();
};
