import { Bytes, Address, BigInt } from "@graphprotocol/graph-ts";
import { TicketsIssued as TicketsIssuedStore, ClusterRewardTracker, ContractStore } from "../../generated/schema";

import { ClusterRewards as ClusterRewardsContract } from "../../generated/ClusterRewards/ClusterRewards";

import { BIGINT_ZERO } from "../utils/constants";

export function saveTicket(
    clusterRewardContractAddress: Address,
    networkId: Bytes,
    epoch: BigInt,
    receiver: Address,
    cluster: Address,
    _epochTotalStake: BigInt,
    RECEIVER_TICKETS_PER_EPOCH: BigInt,
    _epochReceiverStake: BigInt,
    _totalNetworkRewardsPerEpoch: BigInt
): void {
    let clusterReward = ClusterRewardsContract.bind(clusterRewardContractAddress);

    let currentReward = clusterReward.clusterRewards(cluster);
    let existingReward = BIGINT_ZERO;

    let existingClusterRewardTracker = ClusterRewardTracker.load(cluster.toHexString());
    if (existingClusterRewardTracker) {
        existingReward = existingClusterRewardTracker.reward;
    }

    // formula to calc tickets issued
    let ticketsIssued = currentReward
        .minus(existingReward)
        .times(_epochTotalStake)
        .times(RECEIVER_TICKETS_PER_EPOCH)
        .div(_epochReceiverStake)
        .div(_totalNetworkRewardsPerEpoch);

    let ticketId = networkId.toHexString() + "#" + epoch.toHexString() + "#" + cluster.toHexString() + "#" + receiver.toHexString();
    let ticket = TicketsIssuedStore.load(ticketId);

    if (!ticket) {
        ticket = new TicketsIssuedStore(ticketId);
    }

    ticket.networkId = networkId.toHexString();
    ticket.epoch = epoch;
    ticket.cluster = cluster.toHexString();
    ticket.issuedBy = receiver.toHexString();
    ticket.tickets = ticketsIssued;

    ticket.save();
}

export function saveContract(marker: string, address: string): void {
    let contract = ContractStore.load(marker);
    if (!contract) {
        contract = new ContractStore(marker);
        contract.address = address;
        contract.save();
    }
}
// export function handleBlock(block: ethereum.Block): void {
//     let blockNumber = block.timestamp;
//     let state = State.load("state");

//     if (state == null) {
//         state = new State("state");
//         state.clusters = [];
//         state.lastUpdatedBlock = blockNumber;
//         state.activeClusterCount = BIGINT_ZERO;
//         // NOTE: This is initialized to 0 to avoid usage of stake contract in constants
//         state.undelegationWaitTime = BIGINT_ZERO;
//         state.redelegationWaitTime = BIGINT_ZERO;
//         state.save();
//     }
// }