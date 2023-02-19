import { BigInt } from "@graphprotocol/graph-ts";
import { Approval, Transfer } from "../../generated/MPondLogic/MPondLogic";
import { MPondApproval as ApprovalEntity, MPondUser as User } from "../../generated/schema";
import { ADDRESSS_ZERO } from "../utils/constants";

export function handleMPondTransfer(event: Transfer): void {
    let from = event.params.from.toHexString();
    let to = event.params.to.toHexString();
    let amount = event.params.value;

    // check if from is address(0)
    if (event.params.from.notEqual(ADDRESSS_ZERO)) {
        let fromUser = User.load(from);
        if (fromUser) {
            fromUser.balance = fromUser.balance.minus(amount);
            fromUser.save();
        }
    }

    let toUser = User.load(to);
    if (!toUser) {
        toUser = new User(to);
        toUser.balance = new BigInt(0);
    }

    toUser.balance = toUser.balance.plus(amount);
    toUser.save();
}

export function handleMPondAllowance(event: Approval): void {
    let owner = event.params.owner;
    let spender = event.params.spender;
    let value = event.params.value;

    let id = owner.toHexString() + "#" + spender.toHexString();

    let approval = ApprovalEntity.load(id);
    if (!approval) {
        approval = new ApprovalEntity(id);

        approval.user = owner.toHexString();
        approval.from = owner.toHexString();
        approval.to = spender.toHexString();
    }

    approval.value = value;
    approval.save();
}