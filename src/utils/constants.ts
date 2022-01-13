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
// TODO: to be removed after moving to arbitrum
export let FIRST_V2_BLOCK = BigInt.fromString("12716894");

export function getRewardDelegatorAddress(clusterRewardsAddress: Address): Address {
    if(clusterRewardsAddress.equals(Address.fromString("0xA83aD48E2c963a2dF6adcC710Ba520a97d237dCc"))) {
        return Address.fromString("0x802E91F47e09E23eB253Ffcc97665497e12ec93D");
    } else if(clusterRewardsAddress.equals(Address.fromString("0x5124324e4f185C55dff566A71d8666fEf0297cd7"))) {
        return Address.fromString("0x513FB60037240205A0CF17C260257097D747BD46");
    } else if(clusterRewardsAddress.equals(Address.fromString("0x871ed48eC1784b1d27BD086765F54E1f8f484e66"))) {
        return Address.fromString("0xb6B3004dEb4D223b94A3874164A73C4Dc7CDda38");
    } else if(clusterRewardsAddress.equals(Address.fromString("0x307D5c72A8bA07B999d71270e3E3614EcD3b2013"))) {
        return Address.fromString("0xAd805cF042A3758c3BF424238f8e2A8eA1F5cC3b");
    } else if(clusterRewardsAddress.equals(Address.fromString("0xc2033B3Ea8C226461ac7408BA948806F09148788"))) {
        return Address.fromString("0xfB1F3fFa0d9819Da45D4E91967D46fAF025aa1c3");
    } else {
        return Address.fromString(ZERO_ADDRESS);
    }
}