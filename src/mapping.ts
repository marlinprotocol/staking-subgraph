export * from "./maps";

// export function handleStashUndelegationCancelled(
//   event: StashUndelegationCancelled
// ): void {
//   let id = event.params._stashId.toHexString();
//   let stash = Stash.load(id);

//   stash.undelegationRequestedAt = null;
//   stash.undelegatesAt = null;
//   stash.save();
// }

// export function handleAddedToStash(
//   event: AddedToStash
// ): void {
//   let id = event.params.stashId.toHexString();
//   let stash = Stash.load(id);

//   let tokens = event.params.tokens as Bytes[];
//   let amounts = event.params.amounts as BigInt[];
//   updateStashTokens(id, tokens, amounts, "add", true);

//   if (stash.delegatedCluster != "") {
//     updateClusterDelegation(
//       stash.delegatedCluster,
//       tokens,
//       amounts,
//       "delegated",
//     );
//   }
// }

// export function handleStashWithdrawn(
//   event: StashWithdrawn
// ): void {
//   let id = event.params.stashId.toHexString();

//   let tokens = event.params.tokens as Bytes[];
//   let amounts = event.params.amounts as BigInt[];
//   updateStashTokens(id, tokens, amounts, "withdraw", true);
// }

// export function handleStashClosed(
//   event: StashClosed
// ): void {
//   let id = event.params.stashId.toHexString();
//   let staker = Stash.load(id).staker;
//   store.remove('Stash', id);
//   let delegator = Delegator.load(staker.toHexString());
//   let stashes = delegator.stashes;
//   let stashIndex = stashes.indexOf(id);
//   stashes.splice(stashIndex, 1);
//   delegator.stashes = stashes;
//   delegator.save()
// }

// export function handleTokenRemoved(
//   event: TokenRemoved
// ): void {
//   let id = event.params.tokenId.toHexString();
//   let token = Token.load(id);
//   token.enabled = false;
//   token.save();
// }

// export function handleRedelegated(
//   event: Redelegated
// ): void {
//   let id = event.params.stashId.toHexString();
//   let stash = Stash.load(id);
//   let prevCluster = stash.delegatedCluster;

//   if(stash.delegatedCluster != "") {
//     updateClusterDelegatorInfo(
//       id,
//       prevCluster,
//       "undelegated",
//     );
//   } else {
//     updateDelegatorTotalDelegation(
//       stash.staker,
//       stash.tokensDelegatedId as Bytes[],
//       stash.tokensDelegatedAmount as BigInt[],
//       "delegated",
//     );
//   }

//   stash.delegatedCluster = event.params
//     .updatedCluster.toHexString();
//   stash.redelegationUpdateBlockV1 = null;
//   stash.redelegationUpdateBlock = null;
//   stash.redelegationUpdatedClusterV1 = null;
//   stash.redelegationUpdatedCluster = null;
//   stash.save();

//   updateClusterDelegatorInfo(
//     id,
//     stash.delegatedCluster,
//     "delegated",
//   );

//   // if(stash.delegatedCluster == "") {
//   //   updateDelegatorTotalDelegation(
//   //     stash.staker,
//   //     stash.tokensDelegatedId as Bytes[],
//   //     stash.tokensDelegatedAmount as BigInt[],
//   //     "delegated",
//   //   );
//   // }
// }

// export function handleRedelegationCancelled(
//   event: RedelegationCancelled
// ): void {
//   let id = event.params._stashId.toHexString();
//   let stash = Stash.load(id);
//   stash.redelegationUpdateBlockV1 = null;
//   stash.redelegationUpdateBlock = null;
//   stash.redelegationUpdatedClusterV1 = null;
//   stash.redelegationUpdatedCluster = null;
//   stash.save();
// }

// export function handleRedelegationRequested(
//   event: RedelegationRequested
// ): void {
//   let id = event.params.stashId.toHexString();
//   let stash = Stash.load(id);

//   // check if the block is V2
//   if (event.block.number.gt(FIRST_V2_BLOCK)) {
//     stash.redelegationUpdateBlock = event.params
//     .redelegatesAt;
//     stash.redelegationUpdatedCluster = event.params
//     .updatedCluster.toHexString();
//   } else {
//     stash.redelegationUpdateBlockV1 = event.params
//     .redelegatesAt;
//     stash.redelegationUpdatedClusterV1 = event.params
//     .updatedCluster.toHexString();
//   }

//   stash.save();
// }

// export function handleUndelegationWaitTimeUpdated(
//   event: UndelegationWaitTimeUpdated
// ): void {
//   let state = State.load("state");
//   state.undelegationWaitTime = event.params.undelegationWaitTime;
// if (!state) {
//   state = new State("state");
// }
//   state.save();
// }

// export function handleLockTimeUpdated(event: LockTimeUpdated): void {;
//     let state = State.load("state");
//     if (!state) {
//         state = new State("state");
//     }
//     if (event.params.selector.toHexString() == REDELEGATION_LOCK_SELECTOR) {
//         state.redelegationWaitTime = event.params.updatedLockTime;
//         state.save();
//     }
// }

// export function handleStashBridged(
//   event: StashesBridged
// ): void {
//   let bridgedStashes = event.params._stashIds;
//   for(let i=0; i < bridgedStashes.length; i++) {
//     let stashId = bridgedStashes[i].toHexString();
//     let stash = Stash.load(stashId);

//     stash.isBridged = true;
//     stash.save();
//   }
// }
