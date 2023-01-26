import { Bytes, store } from "@graphprotocol/graph-ts";
import { NetworkAdded, NetworkRemoved, NetworkUpdated, TicketsIssued, Initialized } from "../../generated/ClusterRewards/ClusterRewards";
import { Network, Selector } from "../../generated/schema";
import { EpochSelector } from "../../generated/templates";
import { updateNetworkClustersReward } from "../utils/helpers";
import { saveContract, saveTicket } from "./common";

import { ClusterRewards as ClusterRewardsContract } from "../../generated/ClusterRewards/ClusterRewards";
import { EpochSelector as EpochSelectorContract } from "../../generated/EpochSelector/EpochSelector";
import { ReceiverStaking as ReceiverStakingContract } from "../../generated/ReceiverStaking/ReceiverStaking";
import { CLUSTER_REWARD } from "../utils/constants";

export function handleNetworkAdded(event: NetworkAdded): void {
    let id = event.params.networkId.toHexString();
    let network = Network.load(id);
    if (!network) {
        network = new Network(id);
        network.networkId = event.params.networkId;
        network.rewardPerEpoch = event.params.rewardPerEpoch;
        network.clusters = [];
        network.epochSelector = event.params.epochSelector.toHexString();
        network.save();
    }

    EpochSelector.create(event.params.epochSelector);
    addEpochSelector(event.params.epochSelector.toHexString(), event.params.networkId);
}

function addEpochSelector(contractAddress: string, networkId: Bytes): void {
    let epochSelector = Selector.load(contractAddress);
    if (!epochSelector) {
        epochSelector = new Selector(contractAddress);
        epochSelector.networkId = networkId;
        epochSelector.save();
    }
}

export function handleNetworkRemoved(event: NetworkRemoved): void {
    let id = event.params.networkId.toHexString();
    let network = Network.load(id);
    if (network) {
        if (network.epochSelector) {
            store.remove("Selector", network.epochSelector as string);
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
    network.epochSelector = event.params.epochSelector.toHexString();
    network.save();

    if (network.epochSelector) {
        store.remove("Selector", network.epochSelector as string);
    }
    addEpochSelector(event.params.epochSelector.toHexString(), event.params.networkId);
}

export function handleTicketIssued(event: TicketsIssued): void {
    let id = event.params.networkId.toHexString();

    updateNetworkClustersReward(id, event.address);

    let clusterReward = ClusterRewardsContract.bind(event.address);

    let epochSelectorContractAddress = clusterReward.epochSelectors(event.params.networkId);
    let epochSelector = EpochSelectorContract.bind(epochSelectorContractAddress);

    let receiverStakingContractAddress = clusterReward.receiverStaking();
    let receiverStaking = ReceiverStakingContract.bind(receiverStakingContractAddress);

    let clusters = epochSelector.getClusters(event.params.epoch);

    let _stakeInfo = receiverStaking.getStakeInfo(event.params.sender, event.params.epoch);
    let _epochTotalStake = _stakeInfo.value1;
    let _epochReceiverStake = _stakeInfo.value0;

    let RECEIVER_TICKETS_PER_EPOCH = clusterReward.RECEIVER_TICKETS_PER_EPOCH();

    let _totalNetworkRewardsPerEpoch = clusterReward.getRewardPerEpoch(event.params.networkId);

    for (let index = 0; index < clusters.length; index++) {
        const cluster = clusters[index];
        saveTicket(
            event.address,
            event.params.networkId,
            event.params.epoch,
            event.params.sender,
            cluster,
            _epochTotalStake,
            RECEIVER_TICKETS_PER_EPOCH,
            _epochReceiverStake,
            _totalNetworkRewardsPerEpoch
        );
    }
}

export function handleClusterRewardInitialized(event: Initialized): void {
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
