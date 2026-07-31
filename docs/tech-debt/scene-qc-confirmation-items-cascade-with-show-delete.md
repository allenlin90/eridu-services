# Accepted: SceneQcDailyConfirmationItem cascades with a hard Show or Client delete

**Status:** Accepted (low priority) · **Area:** `erify_api` Scene QC — `SceneQcDailyConfirmationItem.showId` / `.clientId` / `.reviewId`
**Origin:** Scene QC Child PR 4 breakdown, §6.3 residual risk 2

## Context

`SceneQcDailyConfirmationItem.showId`, `.clientId`, and `.reviewId` are all `onDelete: Cascade` foreign keys. A hard delete of the referenced Show, Client, or `SceneQcReview` would silently remove rows from an otherwise immutable historical confirmation, changing a shipped Manager Report's totals after the fact — the exact thing `SceneQcDailyConfirmationItem` was designed to protect against for renames (it snapshots `showName`/`clientName`/etc. precisely so those never drift).

## Why accepted (not fixed now)

- Shows and Clients are soft-deleted in practice (`deletedAt`); no hard-delete path exists today for either.
- `SceneQcReview.show` already accepted the identical cascade shape in Child PR 3 — protecting only the confirmation item rows would not close the actual gap, since the review row itself would still disappear on a hypothetical hard delete.
- The real fix (denormalizing the review outcome — result/feedback/evidence — onto the confirmation item, so a report never needs to dereference a live `SceneQcReview` row at all) contradicts §6.3's deliberate read split (report reads item snapshot + `review` join for outcome fields) and should be a deliberate design decision, not a defensive migration made in passing.

## Suggested resolution

If a hard-delete path for Show, Client, or `SceneQcReview` is introduced, or if report immutability becomes a compliance requirement, denormalize the review outcome fields (result, feedback, evidence count, expected scene type) onto `SceneQcDailyConfirmationItem` at confirmation time and switch the cascade to `Restrict` or `SetNull` with a documented back-fill story.

## Fix trigger

A hard-delete path for Show or Client is introduced, or report immutability becomes a compliance requirement.
