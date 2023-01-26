import { BalanceUpdate, Transfer, Initialized } from "../../generated/ReceiverStaking/ReceiverStaking";
import { ReceiverStake, ReceiverBalance } from "../../generated/schema";
import { ADDRESSS_ZERO, BIGINT_ZERO, RECEIVER_STAKING } from "../utils/constants";
import { saveContract } from "./common";

export function handleBalanceUpdate(event: BalanceUpdate): void {
    let id = event.params._address.toHexString() + "#" + event.params.epoch.toHexString();

    let receiverData = ReceiverStake.load(id);

    if (!receiverData) {
        receiverData = new ReceiverStake(id);
        receiverData.address = event.params._address.toHexString();
        receiverData.epoch = event.params.epoch;
        receiverData.balance = event.params._address.toHexString();
    }

    receiverData.stake = event.params.balance;
    receiverData.save();
}

export function handleTransfer(event: Transfer): void {
    // when minted from contract
    if (event.params.from.equals(event.address)) {
        let receiverId = event.params.to.toHexString();

        let receiver = ReceiverBalance.load(receiverId);
        if (!receiver) {
            receiver = new ReceiverBalance(receiverId);
            receiver.balance = BIGINT_ZERO;
        }

        receiver.balance = receiver.balance.plus(event.params.value);
        receiver.save();
    }

    // when burned
    if (event.params.to.equals(ADDRESSS_ZERO)) {
        let receiverId = event.params.to.toHexString();

        let receiver = ReceiverBalance.load(receiverId);
        if (receiver) {
            receiver.balance = receiver.balance.minus(event.params.value);
            receiver.save();
        }
    }
}

export function handleReceiverStakingInitialized(event: Initialized): void {
    saveContract(RECEIVER_STAKING, event.address.toHexString());
}
