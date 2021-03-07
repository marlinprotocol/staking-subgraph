import {
  Bytes, BigInt, store, ethereum,
} from "@graphprotocol/graph-ts";
import {
  Cluster, Stash, Token, Network,
  State, RewardWithdrawl, DelegatorReward,
} from '../generated/schema';
import {
  STATUS_REGISTERED,
  BIGINT_ZERO,
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
  updateClusterDelegation,
  updateClusterDelegatorInfo,
  updateClusterPendingReward,
  updateNetworkClustersReward,
  updateClusterDelegatorsReward,
  updateDelegatorTotalDelegation,
} from "./utils/helpers";

export function handleClusterRegistered(
  event: ClusterRegistered
): void {
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
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.rewardAddress = event.params.updatedRewardAddress;
  cluster.save();
}

export function handleClientKeyUpdated(
  event: ClientKeyUpdated
): void {
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.clientKey = event.params.clientKey;
  cluster.save();
}

export function handleStashCreated(
  event: StashCreated
): void {
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);
  if (stash == null) {
    stash = new Stash(id);
  }

  stash.stashId = event.params.stashId;
  stash.staker = event.params.creator;
  stash.delegatedCluster = null;
  stash.tokensDelegatedId = [];
  stash.tokensDelegatedAmount = [];
  stash.isActive = true;
  stash.save();

  let tokens = event.params.tokens as Bytes[];
  let amounts = event.params.amounts as BigInt[];

  updateStashTokens(id, tokens, amounts, "add");
}

export function handleStashDelegated(
  event: StashDelegated
): void {
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
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);

  updateClusterDelegatorInfo(
    id,
    stash.delegatedCluster,
    "undelegated",
  );

  stash.delegatedCluster = null;
  stash.undelegatesAt = event.params.undelegatesAt;
  stash.save();

  updateDelegatorTotalDelegation(
    stash.staker,
    stash.tokensDelegatedId as Bytes[],
    stash.tokensDelegatedAmount as BigInt[],
    "undelegated",
  );
}

export function handleAddedToStash(
  event: AddedToStash
): void {
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);

  let tokens = event.params.tokens as Bytes[];
  let amounts = event.params.amounts as BigInt[];
  updateStashTokens(id, tokens, amounts, "add");

  updateClusterDelegation(
    stash.delegatedCluster,
    tokens,
    amounts,
    "delegated",
  );
}

export function handleStashWithdrawn(
  event: StashWithdrawn
): void {
  let id = event.params.stashId.toHexString();

  let tokens = event.params.tokens as Bytes[];
  let amounts = event.params.amounts as BigInt[];
  updateStashTokens(id, tokens, amounts, "withdraw");
}

export function handleStashClosed(
  event: StashClosed
): void {
  let id = event.params.stashId.toHexString();
  store.remove('Stash', id);
}

export function handleTokenAdded(
  event: TokenAdded
): void {
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
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.enabled = false;
  token.save();
}

export function handleTokenUpdated(
  event: TokenUpdated
): void {
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.tokenId = event.params.tokenId;
  token.tokenAddress = event.params.tokenAddress;
  token.save();
}

export function handleRedelegated(
  event: Redelegated
): void {
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);

  updateClusterDelegatorInfo(
    event.params.stashId.toHexString(),
    stash.delegatedCluster,
    "undelegated",
  );

  stash.delegatedCluster = event.params
    .updatedCluster.toHexString();
  stash.redelegationUpdateBlock = null;
  stash.redelegationUpdatedCluster = null;
  stash.save();

  updateClusterDelegatorInfo(
    event.params.stashId.toHexString(),
    event.params.updatedCluster.toHexString(),
    "delegated",
  );
}

export function handleRedelegationRequested(
  event: RedelegationRequested
): void {
  let id = event.params.stashId.toHexString();
  let stash = Stash.load(id);

  stash.redelegationUpdateBlock = event.params
    .redelegatesAt;
  stash.redelegationUpdatedCluster = event.params
    .updatedCluster.toHexString();
  stash.save();
}

export function handleNetworkAdded(
  event: NetworkAdded
): void {
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
  let id = event.params.networkId.toHexString();
  store.remove('Network', id);
}

export function handleNetworkRewardUpdated(
  event: NetworkRewardUpdated
): void {
  let id = event.params.networkId.toHexString();
  let network = Network.load(id);
  network.rewardPerEpoch = event.params.updatedRewardPerEpoch;
  network.save();
}

export function handleNetworkSwitchRequested(
  event: NetworkSwitchRequested
): void {
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.updatedNetwork = event.params.networkId;
  cluster.networkUpdatesAt = event.params.effectiveBlock;
  cluster.save();
}

export function handleCommissionUpdateRequested(
  event: CommissionUpdateRequested
): void {
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.updatedCommission = event.params.commissionAfterUpdate;
  cluster.commissionUpdatesAt = event.params.effectiveBlock;
  cluster.save();
}

export function handleClusterUnregisterRequested(
  event: ClusterUnregisterRequested
): void {
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.clusterUnregistersAt = event.params.effectiveBlock;
  cluster.save();
}

export function handleAddReward(
  event: AddReward
): void {
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.rewardFactor = event.params.rewardFactor;
  token.save();
}

export function handleRemoveReward(
  event: RemoveReward
): void {
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.rewardFactor = BIGINT_ZERO;
  token.save();
}

export function handleRewardsUpdated(
  event: RewardsUpdated
): void {
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.rewardFactor = event.params.rewardFactor;
  token.save();
}

export function handleClusterRewarded(
  event: ClusterRewarded
): void {
  let id = event.params.networkId.toHexString();
  updateNetworkClustersReward(id);
}

export function handleClusterRewardDistributed(
  event: ClusterRewardDistributed
): void {
  let id = event.params.cluster.toHexString();
  updateClusterPendingReward(id);
  updateClusterDelegatorsReward(id);
}

export function handleRewardsWithdrawn(
  event: RewardsWithdrawn
): void {
  let clusterId = event.params.cluster.toHexString();
  let delegatorId = event.params.delegator.toHexString();

  let delegatorReward = DelegatorReward.load(
    delegatorId + clusterId
  );

  delegatorReward.amount = BIGINT_ZERO;
  delegatorReward.save();

  let rewardWithdrawl = new RewardWithdrawl(
    delegatorId + event.block.timestamp.toString()
  );

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
  let state = State.load("clusters");

  if (state == null) {
    state = new State("clusters");
    state.clusters = [];
    state.save();
  }

  let clusters = state.clusters as string[];
  updateClustersInfo(blockNumber, clusters);
}
