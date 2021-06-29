import {
  Bytes, BigInt, store, ethereum, log
} from "@graphprotocol/graph-ts";
import {
  Cluster, Stash, Token,
  State, DelegatorReward,
  Delegator, Network, RewardWithdrawl,
} from '../generated/schema';
import {
  STATUS_REGISTERED,
  BIGINT_ZERO,
  WITHDRAW_REWARDS_FUNC_SIG,
  UPDATE_REWARDS_FUNC_SIG,
  FIRST_V2_BLOCK,
} from "./utils/constants";
import {
  ClusterRegistered,
  RewardAddressUpdated,
  ClientKeyUpdated,
  NetworkSwitchRequested,
  CommissionUpdateRequested,
  ClusterUnregisterRequested,
} from '../generated/ClusterRegistry/ClusterRegistry';
import {
  StashCreated,
  StashSplit,
  StashesMerged,
  StashDelegated,
  StashUndelegated,
  AddedToStash,
  StashWithdrawn,
  StashClosed,
  TokenAdded,
  TokenRemoved,
  TokenUpdated,
  Redelegated,
  RedelegationRequested,
  RedelegationCancelled,
  StashUndelegationCancelled
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
  updateStashTokens,
  updateClustersInfo,
  updateNetworkClusters,
  updateAllClustersList,
  updateActiveClusterCount,
  updateClusterDelegation,
  updateClusterDelegatorInfo,
  updateNetworkClustersReward,
  updateDelegatorTotalDelegation,
} from "./utils/helpers";

export function handleClusterRegistered(
  event: ClusterRegistered
): void {
  handleBlock(event.block);
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  if (cluster == null) {
    cluster = new Cluster(id);
  }
  cluster.commission = event.params.commission;
  cluster.rewardAddress = event.params.rewardAddress;
  cluster.clientKey = event.params.clientKey;
  cluster.networkId = event.params.networkId;
  cluster.status = STATUS_REGISTERED;
  cluster.delegators = [];
  cluster.pendingRewards = BIGINT_ZERO;
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
  let stash = Stash.load(id);
  if (stash == null) {
    stash = new Stash(id);
  }

  stash.stashId = event.params.stashId;
  stash.staker = event.params.creator;
  stash.delegatedCluster = "";
  stash.tokensDelegatedId = [];
  stash.tokensDelegatedAmount = [];
  stash.isActive = true;
  stash.createdAt = event.block.number;
  stash.save();

  let tokens = event.params.tokens as Bytes[];
  let amounts = event.params.amounts as BigInt[];

  updateStashTokens(id, tokens, amounts, "add", true);
  let delegatorId = event.params.creator.toHexString();
  let delegator = Delegator.load(delegatorId)
  if (delegator == null) {
    delegator = new Delegator(delegatorId);
    delegator.address = delegatorId;
    delegator.totalPendingReward = BIGINT_ZERO;
    delegator.stashes = [];
    delegator.totalRewardsClaimed = BIGINT_ZERO;
  }
  let stashes = delegator.stashes;
  stashes.push(id);
  delegator.stashes = stashes;
  delegator.save();
}

export function handleStashSplit(
  event: StashSplit
): void {
  handleBlock(event.block);
  let oldStashId = event.params._stashId.toHexString();
  let newStashId = event.params._newStashId.toHexString();
  let oldStash = Stash.load(oldStashId);
  let newStash = Stash.load(newStashId);

  // this check not necessary
  if (newStash == null) {
    newStash = new Stash(newStashId);
    newStash.stashId = event.params._newStashId;
    newStash.staker = oldStash.staker;
    newStash.delegatedCluster = oldStash.delegatedCluster;
    newStash.tokensDelegatedId = [];
    newStash.tokensDelegatedAmount = [];
    newStash.isActive = true;
    newStash.createdAt = event.block.number;
    newStash.save();
  }
  let tokens = event.params._splitTokens as Bytes[];
  let amounts = event.params._splitAmounts as BigInt[];
  updateStashTokens(oldStashId, tokens, amounts, "withdraw", false);
  updateStashTokens(newStashId, tokens, amounts, "add", false);

  // add new shash id to delegator array
  let delegatorId = oldStash.staker.toHexString();
  let delegator = Delegator.load(delegatorId);
  let stashes = delegator.stashes;
  stashes.push(newStashId);
  delegator.stashes = stashes;
  delegator.save();
}

export function handleStashesMerged(
  event: StashesMerged
): void {
  handleBlock(event.block);
  let stashId1 = event.params._stashId1.toHexString();
  let stashId2 = event.params._stashId2.toHexString();
  let stash2 = Stash.load(stashId2);

  updateStashTokens(stashId1,
    stash2.tokensDelegatedId as Bytes[],
    stash2.tokensDelegatedAmount as BigInt[],
    "add",
    false
  );
  updateStashTokens(stashId2,
    stash2.tokensDelegatedId as Bytes[],
    stash2.tokensDelegatedAmount as BigInt[],
    "withdraw",
    false
  );
  
  // remove the stash from delegator
  let staker = Stash.load(stashId2).staker;
  store.remove('Stash', stashId2);
  let delegator = Delegator.load(staker.toHexString());
  let stashes = delegator.stashes;
  let stashIndex = stashes.indexOf(stashId2);
  stashes.splice(stashIndex, 1);
  delegator.stashes = stashes;
  delegator.save()
}

export function handleStashDelegated(
  event: StashDelegated
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);
  if (stash == null) {
    stash = new Stash(id);
  }

  stash.delegatedCluster = event.params.delegatedCluster
    .toHexString();
  stash.undelegatesAt = null;
  stash.save();

  updateClusterDelegatorInfo(
    event.params.stashId.toHexString(),
    event.params.delegatedCluster.toHexString(),
    "delegated",
  );

  updateDelegatorTotalDelegation(
    stash.staker,
    stash.tokensDelegatedId as Bytes[],
    stash.tokensDelegatedAmount as BigInt[],
    "delegated",
  );
}

export function handleStashUndelegated(
  event: StashUndelegated
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);

  updateClusterDelegatorInfo(
    id,
    stash.delegatedCluster,
    "undelegated",
  );

  stash.delegatedCluster = "";
  stash.undelegatesAt = event.params.undelegatesAt;
  stash.save();

  updateDelegatorTotalDelegation(
    stash.staker,
    stash.tokensDelegatedId as Bytes[],
    stash.tokensDelegatedAmount as BigInt[],
    "undelegated",
  );

  // cancel redelegation of all stashes of the user
  let delegator = Delegator.load(stash.staker.toHexString());
  let stashes = delegator.stashes;
  for(let i=0; i < stashes.length; i++) {
    let _stash = Stash.load(stashes[i]);
    _stash.redelegationUpdateBlockV1 = null;
    _stash.redelegationUpdateBlock = null;
    _stash.redelegationUpdatedClusterV1 = null;
    _stash.redelegationUpdatedCluster = null;
    _stash.save()
  }
}

export function handleStashUndelegationCancelled(
  event: StashUndelegationCancelled
): void {
  handleBlock(event.block);
  let id = event.params._stashId.toHexString();
  let stash = Stash.load(id);

  stash.undelegatesAt = null;
  stash.save();
}

export function handleAddedToStash(
  event: AddedToStash
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);

  let tokens = event.params.tokens as Bytes[];
  let amounts = event.params.amounts as BigInt[];
  updateStashTokens(id, tokens, amounts, "add", true);

  if (stash.delegatedCluster != "") {
    updateClusterDelegation(
      stash.delegatedCluster,
      tokens,
      amounts,
      "delegated",
    );
  }
}

export function handleStashWithdrawn(
  event: StashWithdrawn
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();

  let tokens = event.params.tokens as Bytes[];
  let amounts = event.params.amounts as BigInt[];
  updateStashTokens(id, tokens, amounts, "withdraw", true);
}

export function handleStashClosed(
  event: StashClosed
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();
  let staker = Stash.load(id).staker;
  store.remove('Stash', id);
  let delegator = Delegator.load(staker.toHexString());
  let stashes = delegator.stashes;
  let stashIndex = stashes.indexOf(id);
  stashes.splice(stashIndex, 1);
  delegator.stashes = stashes;
  delegator.save()
}

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

export function handleTokenRemoved(
  event: TokenRemoved
): void {
  handleBlock(event.block);
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.enabled = false;
  token.save();
}

export function handleTokenUpdated(
  event: TokenUpdated
): void {
  handleBlock(event.block);
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.tokenId = event.params.tokenId;
  token.tokenAddress = event.params.tokenAddress;
  token.save();
}

export function handleRedelegated(
  event: Redelegated
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);

  if(stash.delegatedCluster != "") {
    updateClusterDelegatorInfo(
      event.params.stashId.toHexString(),
      stash.delegatedCluster,
      "undelegated",
    );
  }

  stash.delegatedCluster = event.params
    .updatedCluster.toHexString();
  stash.redelegationUpdateBlockV1 = null;
  stash.redelegationUpdateBlock = null;
  stash.redelegationUpdatedClusterV1 = null;
  stash.redelegationUpdatedCluster = null;
  stash.save();

  updateClusterDelegatorInfo(
    event.params.stashId.toHexString(),
    event.params.updatedCluster.toHexString(),
    "delegated",
  );
  
  if(stash.delegatedCluster == "") {
    updateDelegatorTotalDelegation(
      stash.staker,
      stash.tokensDelegatedId as Bytes[],
      stash.tokensDelegatedAmount as BigInt[],
      "delegated",
    );
  }
}

export function handleRedelegationCancelled(
  event: RedelegationCancelled
): void {
  handleBlock(event.block);
  let id = event.params._stashId.toHexString();
  let stash = Stash.load(id);
  stash.redelegationUpdateBlockV1 = null;
  stash.redelegationUpdateBlock = null;
  stash.redelegationUpdatedClusterV1 = null;
  stash.redelegationUpdatedCluster = null;
  stash.save();
}

export function handleRedelegationRequested(
  event: RedelegationRequested
): void {
  handleBlock(event.block);
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);
  
  // check if the block is V2
  if (event.block.number.gt(FIRST_V2_BLOCK)) {
    stash.redelegationUpdateBlock = event.params
    .redelegatesAt;
    stash.redelegationUpdatedCluster = event.params
    .updatedCluster.toHexString();
  } else {
    stash.redelegationUpdateBlockV1 = event.params
    .redelegatesAt;
    stash.redelegationUpdatedClusterV1 = event.params
    .updatedCluster.toHexString();
  }

  stash.save();
}

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
  updateNetworkClustersReward(id);
}

export function handleClusterRewardDistributed(
  event: ClusterRewardDistributed
): void {
  handleBlock(event.block);
  let clusterId = event.params.cluster.toHexString();
  let cluster = Cluster.load(clusterId);

  let clutserRewardWithdrawl = new RewardWithdrawl(
    event.transaction.hash.toHexString()
  );

  clutserRewardWithdrawl.isAuto = true;
  
  if(event.transaction.input.toHexString().substr(0, 10) == UPDATE_REWARDS_FUNC_SIG) {
    clutserRewardWithdrawl.isAuto = false;
  }

  clutserRewardWithdrawl.cluster = clusterId;
  clutserRewardWithdrawl.amount = cluster.pendingRewards;
  clutserRewardWithdrawl.timestamp = event.block.timestamp;
  clutserRewardWithdrawl.delegator = null;
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
  let amount = delegator.totalPendingReward.ge(
    event.params.rewards
  ) ? event.params.rewards : BIGINT_ZERO;

  delegator.totalPendingReward = delegator
    .totalPendingReward.minus(amount);
  delegator.totalRewardsClaimed = delegator.totalRewardsClaimed.plus(amount);
  delegator.save();

  let rewardWithdrawl = new RewardWithdrawl(
    event.transaction.hash.toHexString()
  );

  rewardWithdrawl.isAuto = true;
  
  if(event.transaction.input.toHexString().substr(0, 10) == WITHDRAW_REWARDS_FUNC_SIG) {
    rewardWithdrawl.isAuto = false;
  }

  rewardWithdrawl.cluster = event.params.cluster
    .toHexString();
  rewardWithdrawl.amount = event.params.rewards;
  rewardWithdrawl.delegator = delegatorId;
  rewardWithdrawl.timestamp = event.block.timestamp;
  rewardWithdrawl.save();
}

export function handleBlock(
  block: ethereum.Block
): void {
  let blockNumber = block.number;
  let state = State.load("state");

  if (state == null) {
    state = new State("state");
    state.clusters = [];
    state.activeClusterCount = BIGINT_ZERO;
    state.save();
  }

  let clusters = state.clusters as string[];
  updateClustersInfo(blockNumber, clusters);
}
