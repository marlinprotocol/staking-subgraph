import { Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
    ClusterRegistered,
    RewardAddressUpdated,
    ClientKeyUpdated,
    CommissionUpdateRequested, NetworkSwitchRequested, ClusterUnregisterRequested, CommissionUpdated, NetworkSwitched, ClusterUnregistered
} from "../../generated/ClusterRegistry/ClusterRegistry";
import { Cluster } from "../../generated/schema";
import { BIGINT_ZERO, STATUS_REGISTERED, STATUS_NOT_REGISTERED } from "../utils/constants";
import { updateActiveClusterCount, updateAllClustersList, updateNetworkClusters } from "../utils/helpers";

export function handleClusterRegistered(event: ClusterRegistered): void {
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
    cluster.updatedCommission = BIGINT_ZERO;
    cluster.commissionUpdatesAt = BIGINT_ZERO;
    cluster.clusterUnregistersAt = BIGINT_ZERO;
    cluster.save();

    updateAllClustersList(event.params.cluster);
    updateActiveClusterCount("register");
    updateNetworkClusters(new Bytes(0), event.params.networkId, event.params.cluster.toHexString(), "add");
}

export function handleRewardAddressUpdated(event: RewardAddressUpdated): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.rewardAddress = event.params.updatedRewardAddress;
    cluster.save();
}

export function handleClientKeyUpdated(event: ClientKeyUpdated): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.clientKey = event.params.clientKey;
    cluster.save();
}

export function handleCommissionUpdateRequested(event: CommissionUpdateRequested): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.updatedCommission = event.params.commissionAfterUpdate;
    cluster.commissionUpdatesAt = event.params.commissionAfterUpdate;
    cluster.save();
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
}

export function handleClusterUnregisterRequested(event: ClusterUnregisterRequested): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    cluster.clusterUnregistersAt = event.params.effectiveTime;
    cluster.save();
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
}

export function handleNetworkSwitched(event: NetworkSwitched): void {
    let id = event.params.cluster.toHexString();
    let cluster = Cluster.load(id);
    if (!cluster) {
        cluster = new Cluster(id);
    }
    updateNetworkClusters(cluster.networkId, cluster.updatedNetwork as Bytes, id, "changed");

    cluster.networkId = cluster.updatedNetwork as Bytes;
    cluster.updatedNetwork = null;
    cluster.networkUpdatesAt = BIGINT_ZERO;

    cluster.save();
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

    updateNetworkClusters(cluster.networkId, new Bytes(0), id, "unregistered");
    updateActiveClusterCount("unregister");
    cluster.save();
}