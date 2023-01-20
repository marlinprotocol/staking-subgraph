import { store } from "@graphprotocol/graph-ts";
import {
    IssueTickets1Call,
    IssueTicketsCall,
    NetworkAdded,
    NetworkRemoved,
    NetworkUpdated,
    TicketsIssued
} from "../../generated/ClusterRewards/ClusterRewards";
import { Network } from "../../generated/schema";
import { updateNetworkClustersReward } from "../utils/helpers";
import { saveTickets } from "./common";

export function handleNetworkAdded(event: NetworkAdded): void {
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

export function handleNetworkRemoved(event: NetworkRemoved): void {
    let id = event.params.networkId.toHexString();
    store.remove("Network", id);
}

export function handleNetworkRewardUpdated(event: NetworkUpdated): void {
    let id = event.params.networkId.toHexString();
    let network = Network.load(id);
    if (!network) {
        network = new Network(id);
    }
    network.rewardPerEpoch = event.params.updatedRewardPerEpoch;
    network.save();
}

export function handleTicketIssued(event: TicketsIssued): void {
    let id = event.params.networkId.toHexString();

    updateNetworkClustersReward(id, event.address);
}

export function handleCallIssueTicketsMultipleEpoch(call: IssueTicketsCall): void {
    const inputs = call.inputs;
    for (let index = 0; index < inputs._epoch.length; index++) {
        const epoch = inputs._epoch[index];
        const clusters = inputs._clusters[index];
        const tickets = inputs._tickets[index];
        saveTickets(inputs._networkId, epoch, clusters, tickets, call.from);
    }
}

export function handleCallIssueTicketsSingleEpoch(call: IssueTickets1Call): void {
    const inputs = call.inputs;
    saveTickets(inputs._networkId, inputs._epoch, inputs._clusters, inputs._tickets, call.from);
}
