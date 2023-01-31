import { BigInt } from "@graphprotocol/graph-ts";
import { PondUser as User } from "../../generated/schema";
import { Transfer } from "../../generated/POND/POND";
import { ADDRESSS_ZERO } from "../utils/constants";

export function handlePondTransfer(event: Transfer): void {
    let from = event.params.from.toHexString();
    let to = event.params.to.toHexString();
    let amount = event.params.value;

    // check if from is address(0)
    if (event.params.from.notEqual(ADDRESSS_ZERO)) {
        let fromUser = User.load(from)!;
        fromUser.balance = fromUser.balance.minus(amount);
        fromUser.save();
    }

    let toUser = User.load(to);
    if (!toUser) {
        toUser = new User(to);
        toUser.balance = new BigInt(0);
    }

    toUser.balance = toUser.balance.plus(amount);
    toUser.save();
}
