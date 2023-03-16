import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
    ClientKeyUpdated,
    ClusterRegistered,
    ClusterUnregistered,
    ClusterUnregisterRequested,
    CommissionUpdated,
    CommissionUpdateRequested,
    NetworkSwitched,
    NetworkSwitchRequested,
    RewardAddressUpdated,
    Upgraded
} from "../../generated/ClusterRegistry/ClusterRegistry";
import { Cluster } from "../../generated/schema";
import {
    ACTIVE_CLUSTER_COUNT_OPERATION,
    BIGINT_ZERO,
    CLUSTER_OPERATION,
    CLUSTER_REGISTRY,
    EMPTY_BYTES,
    NETWORK_CLUSTER_OPERATION,
    saveClusterHistory,
    STATUS_NOT_REGISTERED,
    STATUS_REGISTERED
} from "../utils/constants";
import { updateActiveClusterCount, updateAllClustersList, updateNetworkClusters } from "../utils/helpers";
import { saveContract } from "./common";

export function handleClusterRegistered(event: ClusterRegistered): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
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
    cluster.updatedCommission = BIGINT_ZERO;
    cluster.commissionUpdatesAt = BIGINT_ZERO;
    cluster.clusterUnregistersAt = BIGINT_ZERO;
    cluster.save();

    updateAllClustersList(event.params.cluster);
    updateActiveClusterCount(ACTIVE_CLUSTER_COUNT_OPERATION.REGISTER);
    updateNetworkClusters(new Bytes(0), event.params.networkId, event.params.cluster.toHexString(), NETWORK_CLUSTER_OPERATION.ADD);

    saveClusterHistory(id, CLUSTER_OPERATION.REGISTERED, event.transaction.hash, event.block.timestamp);
}

export function handleRewardAddressUpdated(event: RewardAddressUpdated): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.rewardAddress = event.params.updatedRewardAddress;
    cluster.save();
    saveClusterHistory(id, CLUSTER_OPERATION.UPDATE_REWARD_ADDRESS, event.transaction.hash, event.block.timestamp);
}

export function handleClientKeyUpdated(event: ClientKeyUpdated): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.clientKey = event.params.clientKey;
    cluster.save();
    saveClusterHistory(id, CLUSTER_OPERATION.CLIENT_KEY_UPDATED, event.transaction.hash, event.block.timestamp);
}

export function handleCommissionUpdateRequested(event: CommissionUpdateRequested): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.updatedCommission = event.params.commissionAfterUpdate;
    cluster.commissionUpdatesAt = event.params.effectiveTime;
    cluster.save();
    saveClusterHistory(id, CLUSTER_OPERATION.COMISSION_UPDATE_REQUESTED, event.transaction.hash, event.block.timestamp);
}

export function handleNetworkSwitchRequested(event: NetworkSwitchRequested): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.updatedNetwork = event.params.networkId;
    cluster.networkUpdatesAt = event.params.effectiveTime;
    cluster.save();
    saveClusterHistory(id, CLUSTER_OPERATION.NETWORK_SWITCH_REQUESTED, event.transaction.hash, event.block.timestamp);
}

export function handleClusterUnregisterRequested(event: ClusterUnregisterRequested): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.clusterUnregistersAt = event.params.effectiveTime;
    cluster.save();
    saveClusterHistory(id, CLUSTER_OPERATION.CLUSTER_UNREGISTER_REQUESTED, event.transaction.hash, event.block.timestamp);
}

export function handleCommissionUpdated(event: CommissionUpdated): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.commission = cluster.updatedCommission as BigInt;

    cluster.updatedCommission = BIGINT_ZERO;
    cluster.commissionUpdatesAt = BIGINT_ZERO;
    cluster.save();
    saveClusterHistory(id, CLUSTER_OPERATION.COMISSION_UPDATED, event.transaction.hash, event.block.timestamp);
}

export function handleNetworkSwitched(event: NetworkSwitched): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.networkId = cluster.updatedNetwork as Bytes;
    updateNetworkClusters(cluster.networkId, cluster.updatedNetwork as Bytes, id, NETWORK_CLUSTER_OPERATION.CHANGED);

    cluster.updatedNetwork = null;
    cluster.networkUpdatesAt = BIGINT_ZERO;

    cluster.save();
    saveClusterHistory(id, CLUSTER_OPERATION.NETWORK_SWITCHED, event.transaction.hash, event.block.timestamp);
}

export function handleClusterUnregistered(event: ClusterUnregistered): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.status = STATUS_NOT_REGISTERED;
    cluster.clusterUnregistersAt = BIGINT_ZERO;
    cluster.commissionUpdatesAt = BIGINT_ZERO;
    cluster.networkUpdatesAt = BIGINT_ZERO;
    cluster.updatedCommission = BIGINT_ZERO;
    cluster.updatedNetwork = null;

    updateNetworkClusters(cluster.networkId, new Bytes(0), id, NETWORK_CLUSTER_OPERATION.UNREGISTERED);
    updateActiveClusterCount(ACTIVE_CLUSTER_COUNT_OPERATION.REGISTER);
    cluster.save();
    saveClusterHistory(id, CLUSTER_OPERATION.CLUSTER_UNREGISTERED, event.transaction.hash, event.block.timestamp);
}

export function handleClusterRegistryInitialized(event: Upgraded): void {
    saveContract(CLUSTER_REGISTRY, event.address.toHexString());
}
