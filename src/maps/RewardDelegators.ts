import { log } from "@graphprotocol/graph-ts";
import {
    AddReward,
    ClusterRewardDistributed,
    RemoveReward,
    RewardsUpdated,
    RewardsWithdrawn
} from "../../generated/RewardDelegators/RewardDelegators";
import { Cluster, Delegator, DelegatorReward, RewardWithdrawl, Token } from "../../generated/schema";
import { BIGINT_ZERO, UPDATE_REWARDS_FUNC_SIG, WITHDRAW_REWARDS_FUNC_SIG } from "../utils/constants";
import { handleBlock } from "./common";

export function handleAddReward(event: AddReward): void {
    handleBlock(event.block);
    let id = event.params.tokenId.toHexString();
    let token = Token.load(id);
    if (!token) {
        token = new Token(id);
    }
    token.rewardFactor = event.params.rewardFactor;
    token.save();
}

export function handleRemoveReward(event: RemoveReward): void {
    handleBlock(event.block);
    let id = event.params.tokenId.toHexString();
    let token = Token.load(id);
    if (!token) {
        token = new Token(id);
    }
    token.rewardFactor = BIGINT_ZERO;
    token.save();
}

export function handleRewardsUpdated(event: RewardsUpdated): void {
    handleBlock(event.block);
    let id = event.params.tokenId.toHexString();
    let token = Token.load(id);
    if (!token) {
        token = new Token(id);
    }
    token.rewardFactor = event.params.rewardFactor;
    token.save();
}

export function handleClusterRewardDistributed(event: ClusterRewardDistributed): void {
    handleBlock(event.block);
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
}

export function handleRewardsWithdrawn(event: RewardsWithdrawn): void {
    handleBlock(event.block);
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
}
