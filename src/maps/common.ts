import { ethereum, Bytes, Address, BigInt } from "@graphprotocol/graph-ts";
import { State, TicketsIssued as TicketsIssuedStore } from "../../generated/schema";

import { BIGINT_ZERO } from "../utils/constants";

export function handleBlock(block: ethereum.Block): void {
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
}

export function saveTickets(networkId: Bytes, epoch: BigInt, clusters: Address[], tickets: BigInt[], from: Address): void {
    for (let index = 0; index < clusters.length; index++) {
        const cluster = clusters[index];
        const ticket = tickets[index];
        const id = networkId.toHexString() + "#" + epoch.toString() + "#" + cluster.toHexString() + from.toHexString();

        let ticketData = TicketsIssuedStore.load(id);
        if (!ticketData) {
            ticketData = new TicketsIssuedStore(id);
            ticketData.networkId = networkId.toHexString();
            ticketData.epoch = epoch;
            ticketData.cluster = cluster.toHexString();
            ticketData.issuedBy = from.toHexString();
            ticketData.tickets = ticket;
            ticketData.save();
        }
    }
}
