import { BigDecimal, BigInt, Address } from "@graphprotocol/graph-ts";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export let BIGINT_ZERO = BigInt.fromI32(0);
export let BIGINT_ONE = BigInt.fromI32(1);
export let BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);
export const STATUS_REGISTERED = "REGISTERED";
export const STATUS_NOT_REGISTERED = "NOT_REGISTERED";
export let CLUSTER_REWARDS_ADDRESS = Address.fromString(
    "0x5124324e4f185C55dff566A71d8666fEf0297cd7"
);
export let REWARD_DELEGATOR_ADDRESS = Address.fromString(
    "0x513FB60037240205A0CF17C260257097D747BD46"
);
