import { Bytes } from "@graphprotocol/graph-ts";
import { Cluster, Stash, Token, Network } from '../generated/schema';
import {
  BIGINT_ZERO,
  ZERO_ADDRESS,
  STATUS_REGISTERED,
  STATUS_NOT_REGISTERED,
} from "./utils/constants";
import {
  ClusterRegistered,
  CommissionUpdated,
  RewardAddressUpdated,
  NetworkSwitched,
  ClusterUnregistered,
} from '../generated/ClusterRegistry/ClusterRegistry';
import {
  StashCreated,
  StashDelegated,
  StashUndelegated,
  TokenAdded,
  TokenRemoved,
  TokenUpdated,
} from '../generated/StakeManager/StakeManager';
import {
  NetworkAdded,
  NetworkRemoved,
  NetworkRewardUpdated,
} from '../generated/ClusterRewards/ClusterRewards';

export function handleClusterRegistered(
  event: ClusterRegistered
): void {
  let id = event.params.cluster.toString();
  let cluster = Cluster.load(id);
  if (cluster == null) {
    cluster = new Cluster(id);
  }
  cluster.commission = event.params.commission;
  cluster.rewardAddress = event.params.rewardAddress;
  cluster.clientKey = event.params.clientKey;
  cluster.networkId = event.params.networkId;
  cluster.status = STATUS_REGISTERED;
  cluster.save();
}

export function handleCommissionUpdated(
  event: CommissionUpdated
): void {
  let id = event.params.cluster.toString();
  let cluster = Cluster.load(id);
  cluster.commission = event.params.updatedCommission;
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
  let id = event.params.stashId.toString();
  let stash = Stash.load(id);
  if (stash == null) {
    stash = new Stash(id);
  }

  stash.stashId = event.params.stashId;
  stash.staker = event.params.creator;
  stash.tokensDelegated = event.params.tokens as Bytes[];
  stash.tokensDelegatedAmount = event.params.amounts;
  stash.save();
}

export function handleStashDelegated(
  event: StashDelegated
): void {
  let id = event.params.stashId.toString();
  let stash = Stash.load(id);
  if (stash == null) {
    stash = new Stash(id);
  }

  stash.delegatedCluster = event.params.delegatedCluster.toHexString();
  stash.save();
}

export function handleStashUndelegated(
  event: StashUndelegated
): void {
  let id = event.params.stashId.toString();
  let stash = Stash.load(id);
  stash.delegatedCluster = ZERO_ADDRESS;
  stash.undelegatesAt = event.params.undelegatesAt;
  stash.save();
}

export function handleTokenAdded(
  event: TokenAdded
): void {
  let id = event.params.tokenId.toString();
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
  let id = event.params.tokenId.toString();
  let token = Token.load(id);
  token.tokenId = new Bytes(0);
  token.tokenAddress = new Bytes(0);
  token.save();
}

export function handleTokenUpdated(
  event: TokenUpdated
): void {
  let id = event.params.tokenId.toString();
  let token = Token.load(id);
  token.tokenAddress = event.params.tokenAddress;
  token.save();
}


export function handleNetworkAdded(
  event: NetworkAdded
): void {
  let id = event.params.networkId.toString();
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
  let id = event.params.networkId.toString();
  let network = Network.load(id);
  network.networkId = new Bytes(0);
  network.rewardPerEpoch = BIGINT_ZERO;
  network.save();
}

export function handleNetworkRewardUpdated(
  event: NetworkRewardUpdated
): void {
  let id = event.params.networkId.toString();
  let network = Network.load(id);
  network.rewardPerEpoch = event.params.updatedRewardPerEpoch;
  network.save();
}
