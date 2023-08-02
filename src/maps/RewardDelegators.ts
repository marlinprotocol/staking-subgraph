import { log } from "@graphprotocol/graph-ts";
import {
    AddReward,
    ClusterRewardDistributed,
    ReceiverBalanceAdded,
    ReceiverRewardPerEpochUpdated,
    RemoveReward,
    RewardsUpdated,
    RewardsWithdrawn,
    Upgraded
} from "../../generated/RewardDelegators/RewardDelegators";
import { Cluster, ClusterRewardTracker, Delegator, DelegatorReward, ReceiverReward, RewardWithdrawl, Token } from "../../generated/schema";
import {
    BIGINT_ONE,
    BIGINT_ZERO,
    CLUSTER_OPERATION,
    REWARD_DELEGATORS,
    saveClusterHistory,
    UPDATE_REWARDS_FUNC_SIG,
    WITHDRAW_REWARDS_FUNC_SIG
} from "../utils/constants";
import { saveContract } from "./common";

export function handleAddReward(event: AddReward): void {
    let id = event.params.tokenId.toHexString();
    let token = Token.load(id);
    if (!token) {
        token = new Token(id);
    }
    token.rewardFactor = event.params.rewardFactor;
    token.save();
}

export function handleRemoveReward(event: RemoveReward): void {
    let id = event.params.tokenId.toHexString();
    let token = Token.load(id);
    if (!token) {
        token = new Token(id);
    }
    token.rewardFactor = BIGINT_ZERO;
    token.save();
}

export function handleRewardsUpdated(event: RewardsUpdated): void {
    let id = event.params.tokenId.toHexString();
    let token = Token.load(id);
    if (!token) {
        token = new Token(id);
    }
    token.rewardFactor = event.params.rewardFactor;
    token.save();
}

export function handleClusterRewardDistributed(event: ClusterRewardDistributed): void {
    let clusterId = event.params.cluster.toHexString();
    let cluster = Cluster.load(clusterId);
    let txHash = event.transaction.hash.toHexString();

    let id = txHash;
    let clutserRewardWithdrawl = RewardWithdrawl.load(id);
    while (clutserRewardWithdrawl != null) {
        id = id + "0";
        clutserRewardWithdrawl = RewardWithdrawl.load(id);
    }
    clutserRewardWithdrawl = new RewardWithdrawl(id);

    clutserRewardWithdrawl.isAuto = true;

    if (event.transaction.input.toHexString().substr(0, 10) == UPDATE_REWARDS_FUNC_SIG) {
        clutserRewardWithdrawl.isAuto = false;
    }

    clutserRewardWithdrawl.cluster = clusterId;
    if (!cluster) {
        cluster = new Cluster(clusterId);
    }
    clutserRewardWithdrawl.amount = cluster.pendingRewards;
    clutserRewardWithdrawl.timestamp = event.block.timestamp;
    clutserRewardWithdrawl.delegator = null;
    clutserRewardWithdrawl.txHash = txHash;
    clutserRewardWithdrawl.save();

    cluster.pendingRewards = BIGINT_ZERO;
    cluster.save();

    let tracker = ClusterRewardTracker.load(event.params.cluster.toHexString());
    if (!tracker) {
        tracker = new ClusterRewardTracker(event.params.cluster.toHexString());
    }

    tracker.reward = BIGINT_ONE;
    saveClusterHistory(clusterId, CLUSTER_OPERATION.CLUSTER_REWARD_DISTRIBUTED, event.transaction.hash, event.block.timestamp);
}

export function handleRewardsWithdrawn(event: RewardsWithdrawn): void {
    let clusterId = event.params.cluster.toHexString();
    let delegatorId = event.params.delegator.toHexString();

    let delegatorReward = DelegatorReward.load(delegatorId + clusterId);

    if (delegatorReward == null) {
        delegatorReward = new DelegatorReward(delegatorId + clusterId);
        delegatorReward.cluster = clusterId;
        delegatorReward.delegator = delegatorId;
    }

    delegatorReward.amount = BIGINT_ZERO;
    delegatorReward.save();

    let delegator = Delegator.load(delegatorId);
    let amount = event.params.rewards;

    if (!delegator) {
        delegator = new Delegator(delegatorId);
    }
    if (delegator.totalPendingReward.lt(amount)) {
        log.warning("Amount more than pending reward is withdrawn", [
            delegator.totalPendingReward.toString(),
            amount.toString(),
            delegator.address.toString()
        ]);
        amount = delegator.totalPendingReward;
    }

    delegator.totalPendingReward = delegator.totalPendingReward.minus(amount);
    delegator.totalRewardsClaimed = delegator.totalRewardsClaimed.plus(amount);
    delegator.save();
    let txHash = event.transaction.hash.toHexString();

    let id = txHash;
    let rewardWithdrawl = RewardWithdrawl.load(id);
    while (rewardWithdrawl != null) {
        id = id + "0";
        rewardWithdrawl = RewardWithdrawl.load(id);
    }
    rewardWithdrawl = new RewardWithdrawl(id);

    rewardWithdrawl.isAuto = true;

    if (event.transaction.input.toHexString().substr(0, 10) == WITHDRAW_REWARDS_FUNC_SIG) {
        rewardWithdrawl.isAuto = false;
    }

    rewardWithdrawl.cluster = event.params.cluster.toHexString();
    rewardWithdrawl.amount = event.params.rewards;
    rewardWithdrawl.delegator = delegatorId;
    rewardWithdrawl.timestamp = event.block.timestamp;
    rewardWithdrawl.txHash = txHash;
    rewardWithdrawl.save();

    saveClusterHistory(clusterId, CLUSTER_OPERATION.REWARD_WITHDRAWN, event.transaction.hash, event.block.timestamp, [
        event.params.rewards
    ]);
}

export function handleRewardDelegatorsInitialized(event: Upgraded): void {
    saveContract(REWARD_DELEGATORS, event.address.toHexString());
}

export function handleReceiverBalanceAdded(event: ReceiverBalanceAdded): void {
    let receiverReward = ReceiverReward.load(event.params.receiver.toHexString());
    if (!receiverReward) {
        receiverReward = new ReceiverReward(event.params.receiver.toHexString());
        receiverReward.rewardPerEpoch = BIGINT_ZERO;
        receiverReward.amount = BIGINT_ZERO;
    }
    receiverReward.amount = receiverReward.amount.plus(event.params.amount);
    receiverReward.save();
}

export function handleReceiverRewardPerEpochUpdated(event: ReceiverRewardPerEpochUpdated): void {
    let receiverReward = ReceiverReward.load(event.params.receiver.toHexString());
    if (!receiverReward) {
        receiverReward = new ReceiverReward(event.params.receiver.toHexString());
        receiverReward.amount = BIGINT_ZERO;
    }
    receiverReward.rewardPerEpoch = event.params.amount;
    receiverReward.save();
}