import { BigDecimal, BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import { ContractStore } from "../../generated/schema";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export let BIGINT_ZERO = BigInt.fromI32(0);
export let BIGINT_ONE = BigInt.fromI32(1);
export let BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);
export const STATUS_REGISTERED = "REGISTERED";
export const STATUS_NOT_REGISTERED = "NOT_REGISTERED";
export const UPDATE_REWARDS_FUNC_SIG = "0x2bc51f6d";
export const WITHDRAW_REWARDS_FUNC_SIG = "0xe20981ca";
export const REDELEGATION_LOCK_SELECTOR = "0xc9fb5027edad04dc7cbd44766b39dcb7d42c498b3b47b80001805039c63cf1e0";
export const EMPTY_BYTES = Bytes.fromHexString("0x");
export const ADDRESSS_ZERO = Address.fromString(ZERO_ADDRESS);
// TODO: to be removed after moving to arbitrum
// export let FIRST_V2_BLOCK = BigInt.fromString("12716894");

export function getRewardDelegatorAddress(): Address {
    let store = ContractStore.load(REWARD_DELEGATORS);
    if (store) {
        return Address.fromString(store.address);
    } else {
        return ADDRESSS_ZERO;
    }
}

// contract markers
export const CLUSTER_REGISTRY = "CLUSTER_REGISTRY";
export const STAKE_MANAGER = "STAKE_MANAGER";
export const CLUSTER_REWARD = "CLUSTER_REWARD";
export const REWARD_DELEGATORS = "REWARD_DELEGATORS";
export const RECEIVER_STAKING = "RECEIVER_STAKING";

export enum DELEGATOR_TOKEN_ACTION {
    ADD,
    WITHDRAW
}

export enum NETWORK_CLUSTER_OPERATION {
    ADD,
    UNREGISTERED,
    CHANGED
}

export enum ACTIVE_CLUSTER_COUNT_OPERATION {
    REGISTER
}
