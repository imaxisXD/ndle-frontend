# Collection migration and list loading

Deploy the additive Convex schema, collection functions, URL creation/deletion/click
hooks, and the updated frontend together. The `backfill-collection-members` cron
starts the update. Each mutation copies at most 100 old member IDs, then schedules
the next batch. If a run stops, the next cron continues from the saved offset.

Existing collections show “Updating collection” while the update runs. Their
click total stays unavailable until all saved members have been copied. New
collections use indexed membership immediately. Adding a link during migration is
safe; repeated additions are ignored. Deleted or foreign links are skipped. The
old member array is cleared only after the copied membership is ready.

Collection click counts use `collection-v2:<collection ID>` counter keys. Each
membership records the number of clicks included in that total. This supports
bounded click updates and deletion even if later batches are still pending.
Links added after a click receive their current baseline without receiving the
same historical click again. Old collection counter keys are not read by the new
UI and can be retained during rollout.

The link table, link picker, collection route, and collection selectors load
bounded pages. “Load more” remains available even when a picker page contains no
available links. Search and sorting apply to loaded rows, as stated beside the
controls. Account and collection totals use maintained counts; a total remains
unavailable until its migration finishes.

Validation:

```sh
pnpm exec tsc --noEmit
pnpm exec vitest run convex/collectionMangament.test.ts convex/linkHealth.test.ts
```

Tests cover batches, concurrent additions and clicks, missing legacy links,
repeated additions, deferred click delivery during deletion, membership created
at the same clock time after a click, pagination, and ownership checks. These
commands use the in-memory Convex test backend and do not deploy or change a
shared environment.
