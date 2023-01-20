import { Bytes, Address, BigInt } from "@graphprotocol/graph-ts";
import { TicketsIssued as TicketsIssuedStore } from "../../generated/schema";

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
