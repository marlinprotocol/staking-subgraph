import {
    Bytes,
    BigInt,
    store,
} from "@graphprotocol/graph-ts";
import {
    Cluster,
    Stash,
    Delegation,
    TokenData,
    Delegator,
    DelegatorToken,
} from '../../generated/schema';
import { BIGINT_ZERO } from './constants';

export function updateStashTokens(
    stashId: string,
    tokens: Bytes[],
    amounts: BigInt[],
    action: string,
): void {
    for (let i = 0; i < tokens.length; i++) {
        let tokenDataId = tokens[i].toHexString() + stashId;
        let tokenData = TokenData.load(tokenDataId);
        let stash = Stash.load(stashId);
        let tokensDelegatedId = stash.tokensDelegatedId as Bytes[];
        let tokensDelegatedAmount = stash.tokensDelegatedAmount as BigInt[];

        if (action === "add") {
            if (tokenData == null) {
                tokenData = new TokenData(tokenDataId);
                tokenData.token = tokens[i].toHexString();
                tokenData.stash = stashId;
                tokenData.amount = BIGINT_ZERO;
            }

            tokenData.amount = tokenData.amount.plus(
                amounts[i]
            );

            if (!tokensDelegatedId.includes(tokens[i])) {
                tokensDelegatedId.push(tokens[i]);
                stash.tokensDelegatedId = tokensDelegatedId;

                tokensDelegatedAmount.push(amounts[i]);
                stash.tokensDelegatedAmount = tokensDelegatedAmount;
            } else {
                let index = tokensDelegatedId.indexOf(
                    tokens[i]
                );

                tokensDelegatedAmount[index] = tokensDelegatedAmount[i]
                    .plus(amounts[i]);

                stash.tokensDelegatedAmount = tokensDelegatedAmount;
            }

            stash.save();
        } else if (action === "withdraw") {
            tokenData.amount = tokenData.amount.minus(
                amounts[i]
            );

            let index = tokensDelegatedId.indexOf(
                tokens[i]
            );

            tokensDelegatedAmount[index] = tokensDelegatedAmount[i]
                .minus(amounts[i]);

            stash.tokensDelegatedAmount = tokensDelegatedAmount;
            stash.save();
        }

        if (tokenData.amount == BIGINT_ZERO) {
            store.remove("TokenData", tokenDataId);
        } else {
            tokenData.save();
        }

        updateDelegatorTokens(
            stash.staker.toHexString(),
            tokens[i].toHexString(),
            amounts[i],
            action,
        );
    };
}

export function updateClusterDelegatorInfo(
    stashId: string,
    clusterId: string,
    operation: string,
): void {
    let stash = Stash.load(stashId);
    let cluster = Cluster.load(stash.delegatedCluster);

    let tokens = stash.tokensDelegatedId as Bytes[];
    let amounts = stash.tokensDelegatedAmount as BigInt[];

    if (operation === "delegated") {
        let delegators = cluster.delegators;
        delegators.push(stash.staker.toHexString());
        cluster.delegators = delegators;

        for (let i = 0; i < tokens.length; i++) {
            let id = tokens[i].toHexString() + cluster.id;
            let delegation = Delegation.load(id);

            if (delegation == null) {
                delegation = new Delegation(id);
                delegation.token = tokens[i].toHexString();
                delegation.cluster = cluster.id;
                delegation.amount = BIGINT_ZERO;
            }

            delegation.amount = delegation.amount.plus(
                amounts[i]
            );

            delegation.save();
        }
    } else if (operation === "undelegated") {
        let index = cluster.delegators.indexOf(
            stash.staker.toHexString()
        );

        if (index > -1) {
            let delegators = cluster.delegators;
            delegators.splice(index, 1);
            cluster.delegators = delegators;
        }

        for (let i = 0; i < tokens.length; i++) {
            let id = tokens[i].toHexString() + clusterId;

            let delegation = Delegation.load(id);

            delegation.amount = delegation.amount.minus(
                amounts[i]
            );

            if (delegation.amount == BIGINT_ZERO) {
                store.remove("Delegation", id);
            } else {
                delegation.save();
            }
        }
    }

    cluster.save();
};

export function updateDelegatorTokens(
    delegatorId: string,
    token: string,
    amount: BigInt,
    action: string,
): void {
    let delegator = Delegator.load(delegatorId);

    if (delegator == null) {
        delegator = new Delegator(delegatorId);
        delegator.address = delegatorId;
        delegator.save();
    }

    let delegatorTokenId = delegatorId + token;
    let delegatorToken = DelegatorToken.load(delegatorTokenId);

    if (action === "add") {
        if (delegatorToken == null) {
            delegatorToken = new DelegatorToken(delegatorTokenId);
            delegatorToken.delegator = delegatorId;
            delegatorToken.token = token;
            delegatorToken.amount = BIGINT_ZERO;
        }

        delegatorToken.amount = delegatorToken.amount.plus(
            amount
        );
    } else if (action == "withdraw") {
        delegatorToken.amount = delegatorToken.amount.minus(
            amount
        );
    }

    if (delegatorToken.amount == BIGINT_ZERO) {
        store.remove("DelegatorToken", delegatorTokenId);
    } else {
        delegatorToken.save();
    }
}
