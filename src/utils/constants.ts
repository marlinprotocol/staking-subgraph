import { BigDecimal, BigInt, Address } from "@graphprotocol/graph-ts";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export let BIGINT_ZERO = BigInt.fromI32(0);
export let BIGINT_ONE = BigInt.fromI32(1);
export let BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);
export const STATUS_REGISTERED = "REGISTERED";
export const STATUS_NOT_REGISTERED = "NOT_REGISTERED";
export const UPDATE_REWARDS_FUNC_SIG = "0x2bc51f6d";
export const WITHDRAW_REWARDS_FUNC_SIG = "0xe20981ca";
export const REDELEGATION_LOCK_SELECTOR = "0xc9fb5027edad04dc7cbd44766b39dcb7d42c498b3b47b80001805039c63cf1e0";
// export let CLUSTER_REWARDS_ADDRESS = Address.fromString(
//     "0x5124324e4f185C55dff566A71d8666fEf0297cd7"
// );
export let REWARD_DELEGATOR_ADDRESS = Address.fromString(
    "0x802E91F47e09E23eB253Ffcc97665497e12ec93D"
);
export let FIRST_V2_BLOCK = BigInt.fromString("12716894");
// export let REWARD_DELEGATOR_ADDRESS = {
//     "0xA83aD48E2c963a2dF6adcC710Ba520a97d237dCc": Address.fromString(
//         "0x802E91F47e09E23eB253Ffcc97665497e12ec93D"
//     ),
//     "0x5124324e4f185C55dff566A71d8666fEf0297cd7": Address.fromString(
//         "0x513FB60037240205A0CF17C260257097D747BD46"
//     ),
//     "0x871ed48eC1784b1d27BD086765F54E1f8f484e66": Address.fromString(
//         "0xb6B3004dEb4D223b94A3874164A73C4Dc7CDda38"
//     ),
// };
