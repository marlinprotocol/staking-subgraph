import { Bytes, BigInt, log } from "@graphprotocol/graph-ts";
import { Delegator, Stash, Token } from "../../generated/schema";
import {
    LockCreated,
    LockDeleted,
    LockWaitTimeUpdated,
    StashCreated,
    StashDelegated,
    StashDeposit,
    StashMove,
    StashUndelegated,
    StashWithdraw,
    TokenAdded,
    TokenUpdated,
    Upgraded
} from "../../generated/StakeManager/StakeManager";

import {
    BIGINT_ZERO,
    CLUSTER_OPERATION,
    REDELEGATION_LOCK_SELECTOR,
    REDELEGATION_WAIT_TIME,
    saveClusterHistory,
    STAKE_MANAGER
} from "../utils/constants";
import { stashDelegation, stashDeposit, stashUndelegation, stashWithdraw } from "../utils/helpers";
import { saveContract, saveParam } from "./common";

export function handleStashCreated(event: StashCreated): void {
    let id = event.params.stashId.toHexString();
    let stash = new Stash(id);

    stash.isBridged = false;
    stash.stashId = event.params.stashId;
    stash.staker = event.params.creator;
    stash.tokenIds = [];
    stash.delegatedCluster = "";
    stash.tokensDelegatedId = [];
    stash.tokensDelegatedAmount = [];
    stash.tokensDelegatedIdV2 = [];
    stash.tokensDelegatedAmountV2 = [];
    stash.isActive = true;
    stash.createdAt = event.block.number;
    stash.save();

    let delegatorId = event.params.creator.toHexString();
    let delegator = Delegator.load(delegatorId);
    if (delegator == null) {
        delegator = new Delegator(delegatorId);
        delegator.address = delegatorId;
        delegator.totalPendingReward = BIGINT_ZERO;
        delegator.stashes = [];
        delegator.totalRewardsClaimed = BIGINT_ZERO;
        delegator.clusters = [];
    }
    let stashes = delegator.stashes;
    stashes.push(id);
    delegator.stashes = stashes;
    delegator.save();
}

export function handleStashDeposit(event: StashDeposit): void {
    let id = event.params.stashId.toHexString();

    let tokens = event.params.tokenIds;
    let amounts = event.params.amounts;
    stashDeposit(id, tokens, amounts);
}

export function handleStashWithdraw(event: StashWithdraw): void {
    let id = event.params.stashId.toHexString();

    let tokens = event.params.tokenIds;
    let amounts = event.params.amounts;
    stashWithdraw(id, tokens, amounts);
}

export function handleStashMove(event: StashMove): void {
    let fromId = event.params.fromStashId.toHexString();
    let toId = event.params.toStashId.toHexString();
    let stash = Stash.load(fromId);
    if (!stash) {
        stash = new Stash(fromId);
    }
    saveClusterHistory(
        fromId,
        CLUSTER_OPERATION.MOVED_STASH_FROM_HERE,
        event.transaction.hash,
        event.block.timestamp,
        event.params.amounts
    );
    let toStash = Stash.load(toId);
    if (!toStash) {
        toStash = new Stash(toId);
    }
    saveClusterHistory(toId, CLUSTER_OPERATION.MOVED_STASH_TO_HERE, event.transaction.hash, event.block.timestamp, event.params.amounts);
    toStash.delegatedCluster = stash.delegatedCluster;
    toStash.save();

    let tokens = event.params.tokenIds;
    let amounts = event.params.amounts;
    stashUndelegation(fromId, stash.delegatedCluster);
    stashWithdraw(fromId, tokens, amounts);
    stashDeposit(toId, tokens, amounts);
    stashDelegation(toId, stash.delegatedCluster);
    stashDelegation(fromId, stash.delegatedCluster);
}

export function handleStashDelegated(event: StashDelegated): void {
    let id = event.params.stashId.toHexString();
    let delegatedCluster = event.params.delegatedCluster.toHexString();
    let stash = Stash.load(id);

    // is this possible?
    if (stash == null) {
        stash = new Stash(id);
        stash.isBridged = false;
    }

    {
        let stashLog = Stash.load(id);
        if (!stashLog) {
            stashLog = new Stash(id);
        }
        for (let i = 0; i < (stashLog.tokensDelegatedAmount as BigInt[]).length; i++) {
            log.info("HSD1: {}, {}, {}", [
                stashLog.staker.toHexString(),
                stashLog.delegatedCluster,
                (stashLog.tokensDelegatedAmount as BigInt[])[i].toHexString()
            ]);
        }

        saveClusterHistory(
            stashLog.delegatedCluster,
            CLUSTER_OPERATION.STASH_DELEGATED,
            event.transaction.hash,
            event.block.timestamp,
            stashLog.tokensDelegatedAmount as BigInt[]
        );
    }

    stash.delegatedCluster = delegatedCluster;
    stash.undelegationRequestedAt = null;
    stash.undelegatesAt = null;
    stash.save();

    stashDelegation(id, delegatedCluster);
    {
        let stashLog = Stash.load(id);
        if (!stashLog) {
            stashLog = new Stash(id);
        }

        for (let i = 0; i < (stashLog.tokensDelegatedAmount as BigInt[]).length; i++) {
            log.info("HSD2: {}, {}, {}", [
                stashLog.staker.toHexString(),
                stashLog.delegatedCluster,
                (stashLog.tokensDelegatedAmount as BigInt[])[i].toHexString()
            ]);
        }
        saveClusterHistory(
            stashLog.delegatedCluster,
            CLUSTER_OPERATION.STASH_DELEGATED,
            event.transaction.hash,
            event.block.timestamp,
            stashLog.tokensDelegatedAmount as BigInt[]
        );
    }
}

export function handleStashUndelegated(event: StashUndelegated): void {
    let id = event.params.stashId.toHexString();
    let stash = Stash.load(id);
    if (!stash) {
        stash = new Stash(id);
    }

    // {
    //     let stashLog = Stash.load(id);
    //     if (!stashLog) {
    //         stashLog = new Stash(id);
    //     }

    //     for (let i = 0; i < (stashLog.tokensDelegatedAmount as BigInt[]).length; i++) {
    //         log.info("HSU1: {}, {}, {}", [
    //             stashLog.staker.toHexString(),
    //             stashLog.delegatedCluster,
    //             (stashLog.tokensDelegatedAmount as BigInt[])[i].toHexString()
    //         ]);
    //     }
    // }
    stashUndelegation(id, stash.delegatedCluster);

    stash = Stash.load(id);
    if (!stash) {
        stash = new Stash(id);
    }
    stash.delegatedCluster = "";
    stash.save();
    {
        let stashLog = Stash.load(id);
        if (!stashLog) {
            stashLog = new Stash(id);
        }
        for (let i = 0; i < (stashLog.tokensDelegatedAmount as BigInt[]).length; i++) {
            log.info("HSU2: {}, {}, {}", [
                stashLog.staker.toHexString(),
                stashLog.delegatedCluster,
                (stashLog.tokensDelegatedAmount as BigInt[])[i].toHexString()
            ]);
        }
        saveClusterHistory(stash.delegatedCluster, CLUSTER_OPERATION.STASH_UNDELEGATED, event.transaction.hash, event.block.timestamp);
    }
}

export function handleTokenAdded(event: TokenAdded): void {
    let id = event.params.tokenId.toHexString();
    let token = Token.load(id);
    if (token == null) {
        token = new Token(id);
    }

    token.tokenId = event.params.tokenId;
    token.tokenAddress = event.params.tokenAddress;
    token.rewardFactor = BIGINT_ZERO;
    token.enabled = true;
    token.save();
}

export function handleTokenUpdated(event: TokenUpdated): void {
    let id = event.params.tokenId.toHexString();
    let token = Token.load(id);
    if (!token) {
        token = new Token(id);
    }
    token.tokenId = event.params.tokenId;
    token.tokenAddress = event.params.newTokenAddress;
    token.save();
}

export function handleLockCreated(event: LockCreated): void {
    let id = event.params.key.toHexString();
    let stash = Stash.load(id);
    if (!stash) {
        stash = new Stash(id);
    }
    if (event.params.selector.toHexString() == REDELEGATION_LOCK_SELECTOR) {
        // redelegation
        stash.redelegationUpdateBlock = event.params.unlockTime;
        stash.redelegationUpdatedCluster = event.params.iValue.toHexString();
    } else {
        if (!event.params.unlockTime.equals(BIGINT_ZERO)) {
            // undelegation
            stash.undelegationRequestedAt = event.block.timestamp;
            stash.undelegatesAt = event.params.unlockTime;
        }
    }

    stash.save();
}

export function handleLockDeleted(event: LockDeleted): void {
    let id = event.params.key.toHexString();
    let stash = Stash.load(id);
    if (!stash) {
        stash = new Stash(id);
    }
    if (event.params.selector.toHexString() == REDELEGATION_LOCK_SELECTOR) {
        // redelegation
        stash.redelegationUpdateBlock = null;
        stash.redelegationUpdatedCluster = null;
    } else {
        // undelegation
        stash.undelegationRequestedAt = null;
        stash.undelegatesAt = null;
    }

    stash.save();
}

export function handleStakeManagerInitialized(event: Upgraded): void {
    saveContract(STAKE_MANAGER, event.address.toHexString());
}

export function handleLockWaitTimeUpdated(event: LockWaitTimeUpdated): void {
    if (event.params.selector.equals(Bytes.fromHexString(REDELEGATION_LOCK_SELECTOR))) {
        saveParam(REDELEGATION_WAIT_TIME, event.params.updatedLockTime.toString());
    }
}
