import { BalanceUpdate } from "../../generated/ReceiverStaking/ReceiverStaking";
import { ReceiverStake } from "../../generated/schema";

export function handleBalanceUpdate(event: BalanceUpdate): void {
    let id = event.params._address.toString() + "-" + event.params.epoch.toString();

    let receiverData = ReceiverStake.load(id);

    if (receiverData == null) {
        receiverData = new ReceiverStake(id);
        receiverData.address = event.params._address.toString();
        receiverData.epoch = event.params.epoch;
    }

    receiverData.stake = event.params.balance;
    receiverData.save();
}
