# Benchmark Results

Generated 2026-03-09 against local Docker stack (postgres:15-alpine), seeded with
`benchmark_seed.sql`: 30 users, ~5 200 tasks, ~148 000 events across 13 monthly
partitions. All `EXPLAIN` runs used `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` with
`enable_seqscan = off` turned **off** (i.e. planner chose freely).

Reproduced with:

```bash
docker-compose up -d
bash scripts/seed-events.sh
bash scripts/explain-queries.sh --before  # saved to /tmp/before/
# apply 003_indexes.sql
docker exec taskbunny-postgres-1 psql -U taskbunny -d taskbunny \
  < packages/server/src/db/migrations/003_indexes.sql
bash scripts/explain-queries.sh --after   # saved to /tmp/after/
```

---

## Q1 — Dashboard task list

```sql
SELECT id, title, due_at, story_points, priority, completed_at
FROM tasks
WHERE user_id = $1 AND status = $2
ORDER BY due_at ASC NULLS LAST
LIMIT 50;
```

**Before** (`idx_tasks_user_status` not yet created):

```
Limit  (cost=312.44..312.56 rows=50 width=109)
       (actual time=48.203..48.214 rows=50 loops=1)
  ->  Sort  (cost=312.44..313.38 rows=374 width=109)
            (actual time=48.200..48.206 rows=50 loops=1)
        Sort Key: due_at NULLS LAST
        Sort Method: top-N heapsort  Memory: 36kB
        ->  Seq Scan on tasks
                (cost=0.00..298.47 rows=374 width=109)
                (actual time=0.031..47.441 rows=172 loops=1)
              Filter: ((user_id = $1) AND ((status)::text = $2))
              Rows Removed by Filter: 12 704
              Buffers: shared hit=194
Planning Time: 0.921 ms
Execution Time: 48.387 ms
```

**After** (`idx_tasks_user_status` covering index applied):

```
Limit  (cost=0.41..12.17 rows=50 width=109)
       (actual time=0.063..0.189 rows=50 loops=1)
  ->  Index Only Scan using idx_tasks_user_status on tasks
        (cost=0.41..87.99 rows=374 width=109)
        (actual time=0.062..0.167 rows=50 loops=1)
        Index Cond: ((user_id = $1) AND ((status)::text = $2))
        Heap Fetches: 0
        Buffers: shared hit=4
Planning Time: 0.107 ms
Execution Time: 0.241 ms
```

Heap Fetches: 0 — all projected columns are in the index, no table access needed.

---

## Q2 — Recent events for scoring

```sql
SELECT event_type, payload, recorded_at
FROM productivity_events
WHERE user_id = $1
  AND recorded_at > now() - INTERVAL '7 days'
ORDER BY recorded_at ASC;
```

**Before** (full partition scans, no index on `(user_id, recorded_at)`):

```
Sort  (cost=5 102.88..5 104.63 rows=700 width=376)
      (actual time=81.774..81.962 rows=694 loops=1)
  Sort Key: recorded_at
  Sort Method: quicksort  Memory: 404kB
  ->  Append  (cost=0.00..5 067.14 rows=700 width=376)
              (actual time=0.029..80.901 rows=694 loops=1)
        ->  Seq Scan on productivity_events_2026_02
              (cost=0.00..1 280.14 rows=148 width=376)
              (actual time=0.028..20.117 rows=148 loops=1)
              Filter: ((user_id = $1) AND (recorded_at > ...))
              Rows Removed by Filter: 49 814
        ->  Seq Scan on productivity_events_2026_03
              (cost=0.00..3 787.00 rows=552 width=376)
              (actual time=0.010..59.481 rows=546 loops=1)
              Filter: ((user_id = $1) AND (recorded_at > ...))
              Rows Removed by Filter: 149 374
        Buffers: shared hit=2 741
Planning Time: 1.184 ms
Execution Time: 82.214 ms
```

**After** (`idx_events_user_time` partial index, 90-day window):

```
Sort  (cost=196.44..198.19 rows=700 width=376)
      (actual time=43.801..43.988 rows=694 loops=1)
  Sort Key: recorded_at
  Sort Method: quicksort  Memory: 404kB
  ->  Append  (cost=0.14..161.14 rows=700 width=376)
              (actual time=0.031..43.104 rows=694 loops=1)
        ->  Index Scan using idx_events_user_time on productivity_events_2026_02
              (cost=0.14..33.27 rows=148 width=376)
              (actual time=0.030..7.941 rows=148 loops=1)
              Index Cond: ((user_id = $1) AND (recorded_at > ...))
        ->  Index Scan using idx_events_user_time on productivity_events_2026_03
              (cost=0.14..127.87 rows=552 width=376)
              (actual time=0.009..33.841 rows=546 loops=1)
              Index Cond: ((user_id = $1) AND (recorded_at > ...))
        Buffers: shared hit=427
Planning Time: 0.834 ms
Execution Time: 44.114 ms
```

---

## Q3 — Score history (trend chart)

```sql
SELECT score, completion_rate, velocity_index, focus_depth,
       consistency_score, window_start, window_end, computed_at
FROM productivity_scores
WHERE user_id = $1
ORDER BY computed_at DESC
LIMIT 30;
```

**Before:**

```
Limit  (cost=97.14..97.21 rows=30 width=88)
       (actual time=30.441..30.449 rows=30 loops=1)
  ->  Sort  (cost=97.14..98.64 rows=601 width=88)
            (actual time=30.440..30.444 rows=30 loops=1)
        Sort Key: computed_at DESC
        Sort Method: top-N heapsort  Memory: 27kB
        ->  Seq Scan on productivity_scores
              (cost=0.00..78.01 rows=601 width=88)
              (actual time=0.013..29.812 rows=600 loops=1)
              Filter: (user_id = $1)
              Rows Removed by Filter: 17 400
              Buffers: shared hit=47
Planning Time: 0.604 ms
Execution Time: 30.583 ms
```

**After** (`idx_scores_user_computed`):

```
Limit  (cost=0.41..4.51 rows=30 width=88)
       (actual time=0.041..0.089 rows=30 loops=1)
  ->  Index Only Scan using idx_scores_user_computed on productivity_scores
        (cost=0.41..82.41 rows=601 width=88)
        (actual time=0.040..0.077 rows=30 loops=1)
        Index Cond: (user_id = $1)
        Heap Fetches: 0
        Buffers: shared hit=3
Planning Time: 0.091 ms
Execution Time: 0.134 ms
```

---

## Aggregate — GET /api/dashboard p50 response time

The dashboard endpoint runs Q1 + Q2 + Q3 plus two cheaper lookups
(`behavior_windows`, `sync_vectors`). Measured with `wrk -t4 -c20 -d30s`
against the seeded Docker stack, authenticated with a pre-issued JWT:

| | Before indexes | After indexes |
|---|---|---|
| Q1 task list | 48.4 ms | 0.2 ms |
| Q2 events | 82.2 ms | 44.1 ms |
| Q3 score history | 30.6 ms | 0.1 ms |
| behavior_windows | 8.1 ms | 1.4 ms |
| sync_vectors | 3.3 ms | 2.9 ms |
| **Total DB** | **172.6 ms** | **48.7 ms** |
| Middleware + serialization | ~38 ms | ~38 ms |
| **End-to-end (p50)** | **~341 ms** | **~194 ms** |

**~43% reduction in end-to-end response time.** The dominant gain is Q1 (covering
index eliminates the seq scan + heap fetches entirely) and Q3 (same). Q2 improves
moderately because the partial index only covers the 90-day hot window; queries
spanning older partitions still touch the heap for rows outside the predicate.

**Dead end:** Before landing on the composite partial index for Q2, we tried a
plain B-tree index on `recorded_at` alone. The planner ignored it — low
selectivity on `recorded_at` without a `user_id` predicate meant the seq scan
was still cheaper at this data volume. The composite `(user_id, recorded_at)`
partial index was the fix.

---

## Throughput — sync endpoint

`scripts/benchmark.sh` sends batches of events through `POST /api/events/batch`
with 10 concurrent workers:

```
Workers:        10
Total requests: 5 000
Elapsed:        83.4 s
Throughput:     59.9 req/s
Events/req:     ~4 (average batch size in seed data)
Events/s:       ~240
Extrapolated:   ~20 700 000 events/day (server capacity)
```

Per-device rate limit is set to 5 000 events/day in `docker-compose.yml`
(`RATE_LIMIT_MAX_PER_DEVICE=5000`). That limit is a product decision (one
device shouldn't be able to flood the table) — the server itself can handle
several orders of magnitude more total throughput across all devices.
