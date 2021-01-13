import { BigDecimal, BigInt, Address } from "@graphprotocol/graph-ts";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export let BIGINT_ZERO = BigInt.fromI32(0);
export let BIGINT_ONE = BigInt.fromI32(1);
export let BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);
export const STATUS_REGISTERED = "REGISTERED";
export const STATUS_NOT_REGISTERED = "NOT_REGISTERED";
export let CLUSTER_REWARDS_ADDRESS = Address.fromString("0x93E2dEE22FCb46592d66BbE3b23ee8D1CaeF1b59");
export let REWARD_DELEGATOR_ADDRESS = Address.fromString("0xbCAeD62eb275353747bFB9F18B41297eAaB7FB31");
