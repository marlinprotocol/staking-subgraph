import { Bytes, store, log } from "@graphprotocol/graph-ts";
import {
    NetworkAdded,
    NetworkRemoved,
    NetworkUpdated,
    TicketsIssued,
    Upgraded,
    ClusterRewarded
} from "../../generated/ClusterRewards/ClusterRewards";
import { Network, Selector } from "../../generated/schema";
import { ClusterSelector } from "../../generated/templates";
import { updateNetworkClustersReward } from "../utils/helpers";
import { saveContract, saveTicket } from "./common";

import { ClusterRewards as ClusterRewardsContract } from "../../generated/ClusterRewards/ClusterRewards";
import { ClusterSelector as ClusterSelectorContract } from "../../generated/ClusterRewards/ClusterSelector";
import { ReceiverStaking as ReceiverStakingContract } from "../../generated/ClusterRewards/ReceiverStaking";
import { CLUSTER_OPERATION, CLUSTER_REWARD, saveClusterHistory } from "../utils/constants";

export function handleNetworkAdded(event: NetworkAdded): void {
    let id = event.params.networkId.toHexString();
    let network = Network.load(id);
    if (!network) {
        network = new Network(id);
        network.networkId = event.params.networkId;
        network.rewardPerEpoch = event.params.rewardPerEpoch;
        network.clusters = [];
        network.clusterSelector = event.params.clusterSelector.toHexString();
        network.save();
    }

    ClusterSelector.create(event.params.clusterSelector);
    addClusterSelector(event.params.clusterSelector.toHexString(), event.params.networkId);
}

function addClusterSelector(contractAddress: string, networkId: Bytes): void {
    let clusterSelector = Selector.load(contractAddress);
    if (!clusterSelector) {
        clusterSelector = new Selector(contractAddress);
        clusterSelector.networkId = networkId;
        clusterSelector.save();
    }
}

export function handleNetworkRemoved(event: NetworkRemoved): void {
    let id = event.params.networkId.toHexString();
    let network = Network.load(id);
    if (network) {
        if (network.clusterSelector) {
            store.remove("Selector", network.clusterSelector as string);
        }
        store.remove("Network", id);
    }
}

export function handleNetworkRewardUpdated(event: NetworkUpdated): void {
    let id = event.params.networkId.toHexString();
    let network = Network.load(id);
    if (!network) {
        network = new Network(id);
    }
    network.rewardPerEpoch = event.params.updatedRewardPerEpoch;
    network.clusterSelector = event.params.clusterSelector.toHexString();
    network.save();


    if (network.clusterSelector) {
        store.remove("Selector", network.clusterSelector as string);
    }
    ClusterSelector.create(event.params.clusterSelector);
    addClusterSelector(event.params.clusterSelector.toHexString(), event.params.networkId);
}

export function handleTicketIssued(event: TicketsIssued): void {
    let id = event.params.networkId.toHexString();

    updateNetworkClustersReward(id, event.address, event.transaction.hash, event.block.timestamp);

    let clusterReward = ClusterRewardsContract.bind(event.address);

    let clusterSelectorContractAddress = clusterReward.clusterSelectors(event.params.networkId);
    let clusterSelector = ClusterSelectorContract.bind(clusterSelectorContractAddress);

    let receiverStakingContractAddress = clusterReward.receiverStaking();
    let receiverStaking = ReceiverStakingContract.bind(receiverStakingContractAddress);

    let clusters = clusterSelector.getClusters(event.params.epoch);

    let _stakeInfo = receiverStaking.getEpochInfo(event.params.epoch);
    let _epochTotalStake = _stakeInfo.value0;
    let _epochReceiverStakeData = receiverStaking.balanceOfSignerAt(event.params.user, event.params.epoch);
    let _epochReceiverStake = _epochReceiverStakeData.value0;

    let RECEIVER_TICKETS_PER_EPOCH = clusterReward.RECEIVER_TICKETS_PER_EPOCH();

    let _totalNetworkRewardsPerEpoch = clusterReward.getRewardForEpoch(event.params.epoch, event.params.networkId);

    for (let index = 0; index < clusters.length; index++) {
        const cluster = clusters[index];

        // log.info("RS:hti: {}, {}, {}, {}", [
        //     _epochTotalStake.toHexString(),
        //     RECEIVER_TICKETS_PER_EPOCH.toHexString(),
        //     _epochReceiverStake.toHexString(),
        //     _totalNetworkRewardsPerEpoch.toHexString()
        // ]);

        const ticketsIssued = saveTicket(
            event.address,
            event.params.networkId,
            event.params.epoch,
            event.params.user,
            cluster,
            _epochTotalStake,
            RECEIVER_TICKETS_PER_EPOCH,
            _epochReceiverStake,
            _totalNetworkRewardsPerEpoch
        );

        saveClusterHistory(
            cluster.toHexString(),
            CLUSTER_OPERATION.CLUSTER_REWARDED_VIA_TICKETS,
            event.transaction.hash,
            event.block.timestamp,
            [ticketsIssued]
        );
    }
}

export function handleClusterRewarded(event: ClusterRewarded): void {
    let id = event.params.networkId.toHexString();

    updateNetworkClustersReward(id, event.address, event.transaction.hash, event.block.timestamp);
}

export function handleClusterRewardInitialized(event: Upgraded): void {
    saveContract(CLUSTER_REWARD, event.address.toHexString());
}
// incase callHandlers are used in future
// export function handleCallIssueTicketsMultipleEpoch(call: IssueTicketsCall): void {
//     const inputs = call.inputs;
//     for (let index = 0; index < inputs._epoch.length; index++) {
//         const epoch = inputs._epoch[index];
//         const clusters = inputs._clusters[index];
//         const tickets = inputs._tickets[index];
//         saveTickets(inputs._networkId, epoch, clusters, tickets, call.from);
//     }
// }

// export function handleCallIssueTicketsSingleEpoch(call: IssueTickets1Call): void {
//     const inputs = call.inputs;
//     saveTickets(inputs._networkId, inputs._epoch, inputs._clusters, inputs._tickets, call.from);
// }
