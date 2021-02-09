import { BigDecimal, BigInt, Address } from "@graphprotocol/graph-ts";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export let BIGINT_ZERO = BigInt.fromI32(0);
export let BIGINT_ONE = BigInt.fromI32(1);
export let BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);
export const STATUS_REGISTERED = "REGISTERED";
export const STATUS_NOT_REGISTERED = "NOT_REGISTERED";
export let CLUSTER_REWARDS_ADDRESS = Address.fromString(
    "0xA83aD48E2c963a2dF6adcC710Ba520a97d237dCc"
);
export let REWARD_DELEGATOR_ADDRESS = Address.fromString(
    "0x802E91F47e09E23eB253Ffcc97665497e12ec93D"
);
