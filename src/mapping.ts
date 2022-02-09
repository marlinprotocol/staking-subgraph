import {
  Bytes, BigInt, store, ethereum, log, Address
} from "@graphprotocol/graph-ts";
import {
  Cluster, Stash, Token,
  State, DelegatorReward,
  Delegator, Network, RewardWithdrawl, ClusterCount,
} from '../generated/schema';
import {
  STATUS_REGISTERED,
  BIGINT_ZERO,
  WITHDRAW_REWARDS_FUNC_SIG,
  UPDATE_REWARDS_FUNC_SIG,
  FIRST_V2_BLOCK,
  BIGINT_ONE,
  REDELEGATION_LOCK_SELECTOR,
} from "./utils/constants";
import {
  ClusterRegistered,
  RewardAddressUpdated,
  ClientKeyUpdated,
  NetworkSwitchRequested,
  CommissionUpdateRequested,
  ClusterUnregisterRequested,
  LockTimeUpdated,
} from '../generated/ClusterRegistry/ClusterRegistry';
import {
  StashCreated,
  StashDeposit,
  StashWithdraw,
  StashMove,
  StashDelegated,
  StashUndelegated,
  // AddedToStash,
  // StashWithdrawn,
  // StashClosed,
  TokenAdded,
  // TokenRemoved,
  TokenUpdated,
  // Redelegated,
  // RedelegationRequested,
  // RedelegationCancelled,
  // StashUndelegationCancelled,
  // UndelegationWaitTimeUpdated,
  // StashesBridged
  LockCreated,
  LockDeleted,
} from '../generated/StakeManager/StakeManager';
import {
  NetworkAdded,
  NetworkRemoved,
  NetworkRewardUpdated,
  ClusterRewarded,
} from '../generated/ClusterRewards/ClusterRewards';
import {
  AddReward,
  RemoveReward,
  RewardsUpdated,
  ClusterRewardDistributed,
  RewardsWithdrawn,
} from '../generated/RewardDelegators/RewardDelegators';
import {
  stashDeposit,
  stashWithdraw,
  stashDelegation,
  stashUndelegation,
  updateClustersInfo,
  updateNetworkClusters,
  updateAllClustersList,
  updateActiveClusterCount,
  updateClusterDelegation,
  updateClusterDelegatorInfo,
  updateNetworkClustersReward,
} from "./utils/helpers";

export function handleClusterRegistered(
  event: ClusterRegistered
): void {
  handleBlock(event.block);
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  if (cluster == null) {
    cluster = new Cluster(id);
    cluster.delegators = [];
    cluster.pendingRewards = BIGINT_ZERO;
  }
  cluster.commission = event.params.commission;
  cluster.rewardAddress = event.params.rewardAddress;
  cluster.clientKey = event.params.clientKey;
  cluster.networkId = event.params.networkId;
  cluster.status = STATUS_REGISTERED;
  cluster.updatedNetwork = null;
  cluster.networkUpdatesAt = BIGINT_ZERO;
  cluster.updatedCommission = null;
  cluster.commissionUpdatesAt = BIGINT_ZERO;
  cluster.clusterUnregistersAt = BIGINT_ZERO;
  cluster.save();

  updateAllClustersList(event.params.cluster);
  updateActiveClusterCount("register");
  updateNetworkClusters(
    new Bytes(0),
    event.params.networkId,
    event.params.cluster.toHexString(),
    "add",
  );
}

export function handleRewardAddressUpdated(
  event: RewardAddressUpdated
): void {

  handleBlock(event.block);
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.rewardAddress = event.params.updatedRewardAddress;
  cluster.save();
}

export function handleClientKeyUpdated(
  event: ClientKeyUpdated
): void {
  handleBlock(event.block);
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.clientKey = event.params.clientKey;
  cluster.save();
}

export function handleStashCreated(
  event: StashCreated
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();
  let stash = new Stash(id);

  stash.isBridged = false;
  stash.stashId = event.params.stashId;
  stash.staker = event.params.creator;
  stash.tokenIds = []
  stash.delegatedCluster = "";
  stash.tokensDelegatedId = [];
  stash.tokensDelegatedAmount = [];
  stash.tokensDelegatedIdV2 = [];
  stash.tokensDelegatedAmountV2 = [];
  stash.isActive = true;
  stash.createdAt = event.block.number;
  stash.save();

  let delegatorId = event.params.creator.toHexString();
  let delegator = Delegator.load(delegatorId)
  if (delegator == null) {
    delegator = new Delegator(delegatorId);
    delegator.address = delegatorId;
    delegator.totalPendingReward = BIGINT_ZERO;
    delegator.stashes = [];
    delegator.totalRewardsClaimed = BIGINT_ZERO;
    delegator.clusters = [];
  }
  let stashes = delegator.stashes;
  stashes.push(id);
  delegator.stashes = stashes;
  delegator.save();
}

export function handleStashDeposit(
  event: StashDeposit
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);

  let tokens = event.params.tokenIds as Bytes[];
  let amounts = event.params.amounts as BigInt[];
  stashDeposit(id, tokens, amounts);
}

export function handleStashWithdraw(
  event: StashWithdraw
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();

  let tokens = event.params.tokenIds as Bytes[];
  let amounts = event.params.amounts as BigInt[];
  stashWithdraw(id, tokens, amounts);
}

export function handleStashMove(
  event: StashMove
): void {
  handleBlock(event.block);
  let fromId = event.params.fromStashId.toHexString();
  let toId = event.params.toStashId.toHexString();
  let stash = Stash.load(fromId);
  let toStash = Stash.load(toId);
  toStash.delegatedCluster = stash.delegatedCluster;
  toStash.save();

  let tokens = event.params.tokenIds as Bytes[];
  let amounts = event.params.amounts as BigInt[];
  stashUndelegation(fromId, stash.delegatedCluster);
  stashWithdraw(fromId, tokens, amounts);
  stashDeposit(toId, tokens, amounts);
  stashDelegation(toId, stash.delegatedCluster);
}

export function handleStashDelegated(
  event: StashDelegated
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();
  let delegatedCluster = event.params.delegatedCluster.toHexString();
  let stash = Stash.load(id);

  // is this possible?
  if (stash == null) {
    stash = new Stash(id);
    stash.isBridged = false;
  }

  {
    let stashLog = Stash.load(id);
    for(let i = 0; i < (stashLog.tokensDelegatedAmount as BigInt[]).length; i++) {
      log.info("HSD1: {}, {}, {}", [
          stashLog.staker.toHexString(),
          stashLog.delegatedCluster,
          (stashLog.tokensDelegatedAmount as BigInt[])[i].toHexString(),
      ]);
    }
  }

  stash.delegatedCluster = delegatedCluster;
  stash.undelegationRequestedAt = null;
  stash.undelegatesAt = null;
  stash.save();

  stashDelegation(id, delegatedCluster);
  {
    let stashLog = Stash.load(id);
    for(let i = 0; i < (stashLog.tokensDelegatedAmount as BigInt[]).length; i++) {
      log.info("HSD2: {}, {}, {}", [
          stashLog.staker.toHexString(),
          stashLog.delegatedCluster,
          (stashLog.tokensDelegatedAmount as BigInt[])[i].toHexString(),
      ]);
    }
  }

}

export function handleStashUndelegated(
  event: StashUndelegated
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);

  {
    let stashLog = Stash.load(id);
    for(let i = 0; i < (stashLog.tokensDelegatedAmount as BigInt[]).length; i++) {
      log.info("HSU1: {}, {}, {}", [
          stashLog.staker.toHexString(),
          stashLog.delegatedCluster,
          (stashLog.tokensDelegatedAmount as BigInt[])[i].toHexString(),
      ]);
    }
  }
  stashUndelegation(
    id,
    stash.delegatedCluster,
  );

  stash = Stash.load(id);
  stash.delegatedCluster = "";
  stash.save();
  {
    let stashLog = Stash.load(id);
    for(let i = 0; i < (stashLog.tokensDelegatedAmount as BigInt[]).length; i++) {
      log.info("HSU2: {}, {}, {}", [
          stashLog.staker.toHexString(),
          stashLog.delegatedCluster,
          (stashLog.tokensDelegatedAmount as BigInt[])[i].toHexString(),
      ]);
    }
  }
}


export function handleLockCreated(
  event: LockCreated
): void {
  handleBlock(event.block);
  let id = event.params.key.toHexString();
  let stash = Stash.load(id);

  if(event.params.selector.toHexString() == REDELEGATION_LOCK_SELECTOR) {
    // redelegation
    stash.redelegationUpdateBlock = event.params.unlockTime;
    stash.redelegationUpdatedCluster = event.params.iValue.toHexString();
  } else {
    // undelegation
    stash.undelegationRequestedAt = event.block.timestamp;
    stash.undelegatesAt = event.params.unlockTime;
  }

  stash.save();
}


export function handleLockDeleted(
  event: LockDeleted
): void {
  handleBlock(event.block);
  let id = event.params.key.toHexString();
  let stash = Stash.load(id);

  if(event.params.selector.toHexString() == REDELEGATION_LOCK_SELECTOR) {
    // redelegation
    stash.redelegationUpdateBlock = null;
    stash.redelegationUpdatedCluster = null;
  } else {
    // undelegation
    stash.undelegationRequestedAt = null;
    stash.undelegatesAt = null;
  }

  stash.save();
}


// export function handleStashUndelegationCancelled(
//   event: StashUndelegationCancelled
// ): void {
//   handleBlock(event.block);
//   let id = event.params._stashId.toHexString();
//   let stash = Stash.load(id);

//   stash.undelegationRequestedAt = null;
//   stash.undelegatesAt = null;
//   stash.save();
// }

// export function handleAddedToStash(
//   event: AddedToStash
// ): void {
//   handleBlock(event.block);
//   let id = event.params.stashId.toHexString();
//   let stash = Stash.load(id);

//   let tokens = event.params.tokens as Bytes[];
//   let amounts = event.params.amounts as BigInt[];
//   updateStashTokens(id, tokens, amounts, "add", true);

//   if (stash.delegatedCluster != "") {
//     updateClusterDelegation(
//       stash.delegatedCluster,
//       tokens,
//       amounts,
//       "delegated",
//     );
//   }
// }

// export function handleStashWithdrawn(
//   event: StashWithdrawn
// ): void {
//   handleBlock(event.block);
//   let id = event.params.stashId.toHexString();

//   let tokens = event.params.tokens as Bytes[];
//   let amounts = event.params.amounts as BigInt[];
//   updateStashTokens(id, tokens, amounts, "withdraw", true);
// }

// export function handleStashClosed(
//   event: StashClosed
// ): void {
//   handleBlock(event.block);
//   let id = event.params.stashId.toHexString();
//   let staker = Stash.load(id).staker;
//   store.remove('Stash', id);
//   let delegator = Delegator.load(staker.toHexString());
//   let stashes = delegator.stashes;
//   let stashIndex = stashes.indexOf(id);
//   stashes.splice(stashIndex, 1);
//   delegator.stashes = stashes;
//   delegator.save()
// }

export function handleTokenAdded(
  event: TokenAdded
): void {
  handleBlock(event.block);
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  if (token == null) {
    token = new Token(id);
  }

  token.tokenId = event.params.tokenId;
  token.tokenAddress = event.params.tokenAddress;
  token.rewardFactor = BIGINT_ZERO;
  token.enabled = true;
  token.save();
}

// export function handleTokenRemoved(
//   event: TokenRemoved
// ): void {
//   handleBlock(event.block);
//   let id = event.params.tokenId.toHexString();
//   let token = Token.load(id);
//   token.enabled = false;
//   token.save();
// }

export function handleTokenUpdated(
  event: TokenUpdated
): void {
  handleBlock(event.block);
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.tokenId = event.params.tokenId;
  token.tokenAddress = event.params.newTokenAddress;
  token.save();
}

// export function handleRedelegated(
//   event: Redelegated
// ): void {
//   handleBlock(event.block);
//   let id = event.params.stashId.toHexString();
//   let stash = Stash.load(id);
//   let prevCluster = stash.delegatedCluster;

//   if(stash.delegatedCluster != "") {
//     updateClusterDelegatorInfo(
//       id,
//       prevCluster,
//       "undelegated",
//     );
//   } else {
//     updateDelegatorTotalDelegation(
//       stash.staker,
//       stash.tokensDelegatedId as Bytes[],
//       stash.tokensDelegatedAmount as BigInt[],
//       "delegated",
//     );
//   }

//   stash.delegatedCluster = event.params
//     .updatedCluster.toHexString();
//   stash.redelegationUpdateBlockV1 = null;
//   stash.redelegationUpdateBlock = null;
//   stash.redelegationUpdatedClusterV1 = null;
//   stash.redelegationUpdatedCluster = null;
//   stash.save();

//   updateClusterDelegatorInfo(
//     id,
//     stash.delegatedCluster,
//     "delegated",
//   );

//   // if(stash.delegatedCluster == "") {
//   //   updateDelegatorTotalDelegation(
//   //     stash.staker,
//   //     stash.tokensDelegatedId as Bytes[],
//   //     stash.tokensDelegatedAmount as BigInt[],
//   //     "delegated",
//   //   );
//   // }
// }

// export function handleRedelegationCancelled(
//   event: RedelegationCancelled
// ): void {
//   handleBlock(event.block);
//   let id = event.params._stashId.toHexString();
//   let stash = Stash.load(id);
//   stash.redelegationUpdateBlockV1 = null;
//   stash.redelegationUpdateBlock = null;
//   stash.redelegationUpdatedClusterV1 = null;
//   stash.redelegationUpdatedCluster = null;
//   stash.save();
// }

// export function handleRedelegationRequested(
//   event: RedelegationRequested
// ): void {
//   handleBlock(event.block);
//   let id = event.params.stashId.toHexString();
//   let stash = Stash.load(id);

//   // check if the block is V2
//   if (event.block.number.gt(FIRST_V2_BLOCK)) {
//     stash.redelegationUpdateBlock = event.params
//     .redelegatesAt;
//     stash.redelegationUpdatedCluster = event.params
//     .updatedCluster.toHexString();
//   } else {
//     stash.redelegationUpdateBlockV1 = event.params
//     .redelegatesAt;
//     stash.redelegationUpdatedClusterV1 = event.params
//     .updatedCluster.toHexString();
//   }

//   stash.save();
// }

export function handleNetworkAdded(
  event: NetworkAdded
): void {
  handleBlock(event.block);
  let id = event.params.networkId.toHexString();
  let network = Network.load(id);
  if (network == null) {
    network = new Network(id);
    network.networkId = event.params.networkId;
    network.rewardPerEpoch = event.params.rewardPerEpoch;
    network.clusters = [];
    network.save();
  }
}

export function handleNetworkRemoved(
  event: NetworkRemoved
): void {
  handleBlock(event.block);
  let id = event.params.networkId.toHexString();
  store.remove('Network', id);
}

export function handleNetworkRewardUpdated(
  event: NetworkRewardUpdated
): void {
  handleBlock(event.block);
  let id = event.params.networkId.toHexString();
  let network = Network.load(id);
  network.rewardPerEpoch = event.params.updatedRewardPerEpoch;
  network.save();
}

export function handleNetworkSwitchRequested(
  event: NetworkSwitchRequested
): void {
  handleBlock(event.block);
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.updatedNetwork = event.params.networkId;
  cluster.networkUpdatesAt = event.params.effectiveBlock;
  cluster.save();
}

export function handleCommissionUpdateRequested(
  event: CommissionUpdateRequested
): void {
  handleBlock(event.block);
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.updatedCommission = event.params.commissionAfterUpdate;
  cluster.commissionUpdatesAt = event.params.effectiveBlock;
  cluster.save();
}

export function handleClusterUnregisterRequested(
  event: ClusterUnregisterRequested
): void {
  handleBlock(event.block);
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.clusterUnregistersAt = event.params.effectiveBlock;
  cluster.save();
}

export function handleAddReward(
  event: AddReward
): void {
  handleBlock(event.block);
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.rewardFactor = event.params.rewardFactor;
  token.save();
}

export function handleRemoveReward(
  event: RemoveReward
): void {
  handleBlock(event.block);
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.rewardFactor = BIGINT_ZERO;
  token.save();
}

export function handleRewardsUpdated(
  event: RewardsUpdated
): void {
  handleBlock(event.block);
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.rewardFactor = event.params.rewardFactor;
  token.save();
}

export function handleClusterRewarded(
  event: ClusterRewarded
): void {
  handleBlock(event.block);
  let id = event.params.networkId.toHexString();

  updateNetworkClustersReward(id, event.address);
}

export function handleClusterRewardDistributed(
  event: ClusterRewardDistributed
): void {
  handleBlock(event.block);
  let clusterId = event.params.cluster.toHexString();
  let cluster = Cluster.load(clusterId);
  let txHash = event.transaction.hash.toHexString();

  let id = txHash;
  let clutserRewardWithdrawl = RewardWithdrawl.load(id);
  while(clutserRewardWithdrawl != null) {
      id = id + "0";
      clutserRewardWithdrawl = RewardWithdrawl.load(id);
  }
  clutserRewardWithdrawl = new RewardWithdrawl(id);

  clutserRewardWithdrawl.isAuto = true;

  if(event.transaction.input.toHexString().substr(0, 10) == UPDATE_REWARDS_FUNC_SIG) {
    clutserRewardWithdrawl.isAuto = false;
  }

  clutserRewardWithdrawl.cluster = clusterId;
  clutserRewardWithdrawl.amount = cluster.pendingRewards;
  clutserRewardWithdrawl.timestamp = event.block.timestamp;
  clutserRewardWithdrawl.delegator = null;
  clutserRewardWithdrawl.txHash = txHash;
  clutserRewardWithdrawl.save();

  cluster.pendingRewards = BIGINT_ZERO;
  cluster.save();
}

export function handleRewardsWithdrawn(
  event: RewardsWithdrawn
): void {
  handleBlock(event.block);
  let clusterId = event.params.cluster.toHexString();
  let delegatorId = event.params.delegator.toHexString();

  let delegatorReward = DelegatorReward.load(
    delegatorId + clusterId
  );

  if(delegatorReward == null) {
    delegatorReward = new DelegatorReward(delegatorId + clusterId);
    delegatorReward.cluster = clusterId;
    delegatorReward.delegator = delegatorId;
  }

  delegatorReward.amount = BIGINT_ZERO;
  delegatorReward.save();

  let delegator = Delegator.load(delegatorId);
  let amount = event.params.rewards;

  if(delegator.totalPendingReward.lt(amount)) {
    log.warning("Amount more than pending reward is withdrawn", [delegator.totalPendingReward.toString(), amount.toString(), delegator.address.toString()]);
    amount = delegator.totalPendingReward;
  }

  delegator.totalPendingReward = delegator
    .totalPendingReward.minus(amount);
  delegator.totalRewardsClaimed = delegator.totalRewardsClaimed.plus(amount);
  delegator.save();
  let txHash = event.transaction.hash.toHexString();

  let id = txHash;
  let rewardWithdrawl = RewardWithdrawl.load(id);
  while(rewardWithdrawl != null) {
      id = id + "0";
      rewardWithdrawl = RewardWithdrawl.load(id);
  }
  rewardWithdrawl = new RewardWithdrawl(id);

  rewardWithdrawl.isAuto = true;

  if(event.transaction.input.toHexString().substr(0, 10) == WITHDRAW_REWARDS_FUNC_SIG) {
    rewardWithdrawl.isAuto = false;
  }

  rewardWithdrawl.cluster = event.params.cluster
    .toHexString();
  rewardWithdrawl.amount = event.params.rewards;
  rewardWithdrawl.delegator = delegatorId;
  rewardWithdrawl.timestamp = event.block.timestamp;
  rewardWithdrawl.txHash = txHash;
  rewardWithdrawl.save();
}

// export function handleUndelegationWaitTimeUpdated(
//   event: UndelegationWaitTimeUpdated
// ): void {
//   handleBlock(event.block);
//   let state = State.load("state");
//   state.undelegationWaitTime = event.params.undelegationWaitTime;
//   state.save();
// }

export function handleLockTimeUpdated(
  event: LockTimeUpdated
): void {
  handleBlock(event.block);
  let state = State.load("state");

  if(event.params.selector.toHexString() == REDELEGATION_LOCK_SELECTOR) {
    state.redelegationWaitTime = event.params.updatedLockTime;
    state.save();
  }
}

export function handleBlock(
  block: ethereum.Block
): void {
  let blockNumber = block.timestamp;
  let state = State.load("state");

  if (state == null) {
    state = new State("state");
    state.clusters = [];
    state.lastUpdatedBlock = blockNumber;
    state.activeClusterCount = BIGINT_ZERO;
    // NOTE: This is initialized to 0 to avoid usage of stake contract in constants
    state.undelegationWaitTime = BIGINT_ZERO;
    state.redelegationWaitTime = BIGINT_ZERO;
    state.save();
  }

  if(blockNumber.gt(state.lastUpdatedBlock)) {
    let clusters = state.clusters as string[];
    updateClustersInfo(blockNumber, clusters);
  }
}

// export function handleStashBridged(
//   event: StashesBridged
// ): void {
//   let bridgedStashes = event.params._stashIds;
//   for(let i=0; i < bridgedStashes.length; i++) {
//     let stashId = bridgedStashes[i].toHexString();
//     let stash = Stash.load(stashId);

//     stash.isBridged = true;
//     stash.save();
//   }
// }
