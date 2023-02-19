import { Initialized, SignerUpdated, Transfer } from "../../generated/ReceiverStaking/ReceiverStaking";
import { Param, ReceiverBalance, ReceiverBalanceSnapshot } from "../../generated/schema";
import { ADDRESSS_ZERO, BIGINT_ONE, BIGINT_ZERO, EPOCH_LENGTH, RECEIVER_STAKING, START_TIME } from "../utils/constants";
import { saveContract, saveParam } from "./common";

import { Address, BigInt } from "@graphprotocol/graph-ts";
import { ReceiverStaking as ReceiverStakingContract } from "../../generated/ReceiverStaking/ReceiverStaking";

function storeSnapshot(user: Address, epoch: BigInt, balance: BigInt): void {
    let id = user.toHexString() + "#" + epoch.toHexString();

    let receiverData = ReceiverBalanceSnapshot.load(id);

    if (!receiverData) {
        receiverData = new ReceiverBalanceSnapshot(id);
        receiverData.address = user.toHexString();
        receiverData.epoch = epoch;
    }

    receiverData.balance = balance;
    receiverData.save();
}

function saveSnapshot(contract: Address, user: Address, blockTime: BigInt): void {
    const receiverStaking = ReceiverStakingContract.bind(contract);
    const snapshotId = _getCurrentSnapshotId(blockTime);

    const snapshotBalance = receiverStaking.balanceOfAt(user, snapshotId);
    storeSnapshot(user, snapshotId, snapshotBalance);
}

function _getCurrentSnapshotId(blockTime: BigInt): BigInt {
    const startTime = Param.load(START_TIME);
    const epochLength = Param.load(EPOCH_LENGTH);

    if (startTime && epochLength) {
        // return (block.timestamp - START_TIME)/EPOCH_LENGTH + 1;
        const st = BigInt.fromString(startTime.value);
        const el = BigInt.fromString(epochLength.value);
        return blockTime
            .minus(st)
            .div(el)
            .plus(BIGINT_ONE);
    } else {
        return BIGINT_ZERO;
    }
}

export function handleReceiverTokenTransfer(event: Transfer): void {
    // when minted from contract
    if (event.params.from.equals(ADDRESSS_ZERO)) {
        let receiverId = event.params.to.toHexString();

        let receiver = ReceiverBalance.load(receiverId);
        if (!receiver) {
            receiver = new ReceiverBalance(receiverId);
            receiver.address = receiverId;
            receiver.balance = BIGINT_ZERO;
        }

        receiver.balance = receiver.balance.plus(event.params.value);
        receiver.save();

        saveSnapshot(event.address, event.params.to, event.block.timestamp);
    }

    // when burned
    if (event.params.to.equals(ADDRESSS_ZERO)) {
        let receiverId = event.params.from.toHexString();

        let receiver = ReceiverBalance.load(receiverId);
        if (receiver) {
            receiver.balance = receiver.balance.minus(event.params.value);
            receiver.save();

            // saveSnapshot(event.address, event.params.from, event.block.timestamp);
        }
    }
}

export function handleReceiverStakingInitialized(event: Initialized): void {
    saveContract(RECEIVER_STAKING, event.address.toHexString());

    let receiverStaking = ReceiverStakingContract.bind(event.address);

    saveParam(EPOCH_LENGTH, receiverStaking.EPOCH_LENGTH().toString());
    saveParam(START_TIME, receiverStaking.START_TIME().toString());
}

export function handleSignerUpdated(event: SignerUpdated): void {
    let receiverId = event.params.staker.toHexString();

    let receiver = ReceiverBalance.load(receiverId);

    if (receiver) {
        receiver.signer = event.params.signer.toHexString();
        receiver.save();
    }
}
