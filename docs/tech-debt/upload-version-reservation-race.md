# Accepted: material-asset upload-version reservation race

**Status:** Accepted (low risk) · **Area:** `erify_api` uploads / task material assets
**Origin:** WI-03 (erify_api hardening program) · **Decision:** D1

## Context

`TaskRepository.reserveMaterialAssetUploadVersion(taskUid, fieldKey)` issues a
per-field monotonic revision number used to build the storage object key for a
material-asset upload (`…/<show>-v<N>.<ext>`). Each `POST /uploads/presign` for a
`MATERIAL_ASSET` field reserves the next number so re-uploads land on a new key
instead of overwriting the previous file.

The counter lives in `task.metadata.material_asset_upload_versions[fieldKey]` and
is written with a read-modify-write of the whole `metadata` blob.

## The accepted race

Two presign calls for the **same task + same field** within the read→write window
both read version `N`, both compute `N+1`, and the last write wins — so both
reserve the same `-v(N+1)` key and one uploaded file is overwritten in storage.

WI-03 removed the previous `where: { version: task.version }` guard because it did
**not** prevent this race (the reserve never bumps `version`, so both writes pass)
and it actively caused spurious `VersionConflict` 409s whenever an unrelated edit
touched the task between the reserve's read and write. Removing it fixes the 409;
the collision above is what remains.

## Why accepted (not fixed with a table)

- **Barely reachable.** A task field is normally worked by a single operator, and
  the client `await`s each presign. Hitting it needs two near-simultaneous
  presigns for the same field (double-click, retried request, two devices).
- **Bounded harm.** The surviving file is a valid upload, and the task-report
  submit records one `object_key` that points at a real object. No revision
  history references the overwritten bytes (the counter is a number, not a
  key list), so nothing downstream breaks.
- **House rule.** `CLAUDE.md`: do not retrofit raw-SQL JSONB merges / advisory
  locks to make non-critical bookkeeping race-safe; use a dedicated table only
  when losing the key breaks a workflow. It does not here.

## When to revisit

Promote to a dedicated `MaterialAssetUploadReservation` table (unique
`(taskId, fieldKey)`, DB-side atomic increment) if either becomes true:

- concurrent same-field uploads become a real product scenario (e.g. multiple
  operators collaborating on one task), or
- the product needs to **retain every uploaded revision** as a deliverables
  history rather than just the latest answer.
