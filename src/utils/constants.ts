import { BigDecimal, BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import { ContractStore, ClusterHistory } from "../../generated/schema";

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
    if (!store) {
        return ADDRESSS_ZERO;
    } else {
        return Address.fromString(store.address);
    }
}

// contract markers
export const CLUSTER_REGISTRY = "CLUSTER_REGISTRY";
export const STAKE_MANAGER = "STAKE_MANAGER";
export const CLUSTER_REWARD = "CLUSTER_REWARD";
export const REWARD_DELEGATORS = "REWARD_DELEGATORS";
export const RECEIVER_STAKING = "RECEIVER_STAKING";

export const EPOCH_LENGTH = "EPOCH_LENGTH";
export const START_TIME = "START_TIME";
export const REDELEGATION_WAIT_TIME = "REDELEGATION_WAIT_TIME";

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

export enum TOKENS_IN_USE {
    POND,
    MPOND
}

export enum CLUSTER_OPERATION {
    REGISTERED,
    UPDATE_REWARD_ADDRESS,
    CLIENT_KEY_UPDATED,
    COMISSION_UPDATE_REQUESTED,
    NETWORK_SWITCH_REQUESTED,
    CLUSTER_UNREGISTER_REQUESTED,
    COMISSION_UPDATED,
    NETWORK_SWITCHED,
    CLUSTER_UNREGISTERED,
    CLUSTER_REWARDED,
    CLUSTER_REWARDED_VIA_TICKETS,
    CLUSTER_REWARD_DISTRIBUTED,
    REWARD_WITHDRAWN,
    MOVED_STASH_FROM_HERE,
    MOVED_STASH_TO_HERE,
    STASH_DELEGATED,
    STASH_UNDELEGATED
}

function operationToString(operation: CLUSTER_OPERATION): string {
    if (operation === CLUSTER_OPERATION.REGISTERED) {
        return "REGISTERED";
    } else if (operation === CLUSTER_OPERATION.UPDATE_REWARD_ADDRESS) {
        return "UPDATE_REWARD_ADDRESS";
    } else if (operation === CLUSTER_OPERATION.CLIENT_KEY_UPDATED) {
        return "CLIENT_KEY_UPDATED";
    } else if (operation === CLUSTER_OPERATION.COMISSION_UPDATE_REQUESTED) {
        return "COMISSION_UPDATE_REQUESTED";
    } else if (operation === CLUSTER_OPERATION.NETWORK_SWITCH_REQUESTED) {
        return "NETWORK_SWITCH_REQUESTED";
    } else if (operation === CLUSTER_OPERATION.CLUSTER_UNREGISTER_REQUESTED) {
        return "CLUSTER_UNREGISTER_REQUESTED";
    } else if (operation === CLUSTER_OPERATION.COMISSION_UPDATED) {
        return "COMISSION_UPDATED";
    } else if (operation === CLUSTER_OPERATION.NETWORK_SWITCHED) {
        return "NETWORK_SWITCHED";
    } else if (operation === CLUSTER_OPERATION.CLUSTER_UNREGISTERED) {
        return "CLUSTER_UNREGISTERED";
    } else if (operation === CLUSTER_OPERATION.CLUSTER_REWARDED) {
        return "CLUSTER_REWARDED";
    } else if (operation === CLUSTER_OPERATION.CLUSTER_REWARDED_VIA_TICKETS) {
        return "CLUSTER_REWARDED_VIA_TICKETS";
    } else if (operation === CLUSTER_OPERATION.CLUSTER_REWARD_DISTRIBUTED) {
        return "CLUSTER_REWARD_DISTRIBUTED";
    } else if (operation === CLUSTER_OPERATION.REWARD_WITHDRAWN) {
        return "REWARD_WITHDRAWN";
    } else if (operation === CLUSTER_OPERATION.MOVED_STASH_FROM_HERE) {
        return "MOVED_STASH_FROM_HERE";
    } else if (operation === CLUSTER_OPERATION.MOVED_STASH_TO_HERE) {
        return "MOVED_STASH_TO_HERE";
    } else if (operation === CLUSTER_OPERATION.STASH_DELEGATED) {
        return "STASH_DELEGATED";
    } else if (operation === CLUSTER_OPERATION.STASH_UNDELEGATED) {
        return "STASH_UNDELEGATED";
    } else {
        return "UNKNOWN_OPERATION";
    }
}

export function saveClusterHistory(
    cluster: String,
    operation: CLUSTER_OPERATION,
    hash: Bytes,
    timestamp: BigInt,
    amounts: BigInt[] = []
): void {
    let id = cluster + operation.toString() + hash.toHexString();
    let history = ClusterHistory.load(id);
    if (!history) {
        history = new ClusterHistory(id);
    } else {
        id = id + "-"; // new id will be created
    }

    history.cluster = cluster.toString();
    history.operation = operationToString(operation);
    history.hash = hash;
    history.timestamp = timestamp;
    if (amounts) {
        history.amounts = amounts;
    }
    history.save();
}
