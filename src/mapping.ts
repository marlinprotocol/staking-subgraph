import {
  Bytes, BigInt, store,
} from "@graphprotocol/graph-ts";
import {
  Cluster, Stash, Token, Network,
} from '../generated/schema';
import {
  ZERO_ADDRESS,
  STATUS_REGISTERED,
  STATUS_NOT_REGISTERED,
  BIGINT_ZERO,
} from "./utils/constants";
import {
  ClusterRegistered,
  CommissionUpdated,
  RewardAddressUpdated,
  NetworkSwitched,
  ClientKeyUpdated,
  ClusterUnregistered,
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
} from '../generated/StakeManager/StakeManager';
import {
  NetworkAdded,
  NetworkRemoved,
  NetworkRewardUpdated,
} from '../generated/ClusterRewards/ClusterRewards';
import {
  updateStashTokens,
  updateClusterDelegatorInfo,
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
  cluster.clusterUnregistersAt = BIGINT_ZERO;
  cluster.save();
}

export function handleCommissionUpdated(
  event: CommissionUpdated
): void {
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.commission = event.params.updatedCommission;
  cluster.updatedCommission = BIGINT_ZERO;
  cluster.commissionUpdatesAt = BIGINT_ZERO;
  cluster.save();
}

export function handleRewardAddressUpdated(
  event: RewardAddressUpdated
): void {
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.rewardAddress = event.params.updatedRewardAddress;
  cluster.save();
}

export function handleNetworkSwitched(
  event: NetworkSwitched
): void {
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.networkId = event.params.networkId;
  cluster.updatedNetwork = new Bytes(0);
  cluster.networkUpdatesAt = BIGINT_ZERO;
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

export function handleClusterUnregistered(
  event: ClusterUnregistered
): void {
  let id = event.params.cluster.toHexString();
  let cluster = Cluster.load(id);
  cluster.status = STATUS_NOT_REGISTERED;
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
  stash.tokensDelegatedId = [];
  stash.tokensDelegatedAmount = [];
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

  stash.delegatedCluster = event.params.delegatedCluster.toHexString();
  stash.save();

  updateClusterDelegatorInfo(
    event.params.stashId.toHexString(),
    event.params.delegatedCluster.toHexString(),
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

  stash.delegatedCluster = ZERO_ADDRESS;
  stash.undelegatesAt = event.params.undelegatesAt;
  stash.save();
}

export function handleAddedToStash(
  event: AddedToStash
): void {
  let id = event.params.stashId.toHexString();

  let tokens = event.params.tokens as Bytes[];
  let amounts = event.params.amounts as BigInt[];
  updateStashTokens(id, tokens, amounts, "add");
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
  token.save();
}

export function handleTokenRemoved(
  event: TokenRemoved
): void {
  let id = event.params.tokenId.toHexString();
  let token = Token.load(id);
  token.tokenId = new Bytes(0);
  token.tokenAddress = new Bytes(0);
  token.save();
}

export function handleTokenUpdated(
  event: TokenUpdated
): void {
  let id = event.params.tokenId.toHexString();
  store.remove('Token', id);
}

export function handleNetworkAdded(
  event: NetworkAdded
): void {
  let id = event.params.networkId.toHexString();
  let network = Network.load(id);
  if (network == null) {
    network = new Network(id);
  }

  network.networkId = event.params.networkId;
  network.rewardPerEpoch = event.params.rewardPerEpoch;
  network.save();
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
