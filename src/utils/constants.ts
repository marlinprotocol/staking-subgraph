import { BigDecimal, BigInt, Address } from "@graphprotocol/graph-ts";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export let BIGINT_ZERO = BigInt.fromI32(0);
export let BIGINT_ONE = BigInt.fromI32(1);
export let BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);
export const STATUS_REGISTERED = "REGISTERED";
export const STATUS_NOT_REGISTERED = "NOT_REGISTERED";
export let CLUSTER_REWARDS_ADDRESS = Address.fromString("0x426985Dd3792D633C9d8224FD92D36F13C34D123");
export let REWARD_DELEGATOR_ADDRESS = Address.fromString("0x1ae34c72C8953dAE5dc21f5ce68144Bb81384459");
