# Deployment Log

## Step 1: Initial Build Attempt
**Command:** `docker-compose up -d --build`
**Status:** Failed
**Error:**
```
Building wheel for zlib-state (pyproject.toml): finished with status 'error'
...
src/zlib_state.c:9:10: fatal error: zlib.h: No such file or directory
```
**Analysis:** The build failed because `zlib-state` (a dependency of one of the python packages) requires `zlib` development headers to compile C extensions. The Docker image is missing `zlib1g-dev`.

## Step 2: Fix Dockerfile Dependencies
**Action:** Updating `backend/Dockerfile` to install system dependencies required for building Python packages.
**Changes:** Adding `zlib1g-dev`, `libjpeg-dev`, `gcc`, `python3-dev` to the `apt-get install` command.

## Step 3: Second Build Attempt
**Command:** `docker-compose up -d --build`
**Status:** Success
**Changes Applied:** Added `zlib1g-dev` and `libjpeg-dev` to `backend/Dockerfile`.
**Result:** Containers built and started successfully.

## Step 4: Create Missing Volume
**Command:** `docker volume create similarhub_huggingface_cache && docker-compose up -d`
**Status:** Success
**Reason:** The `huggingface_cache` volume was defined as external but didn't exist. Created it manually and started containers.

## Step 5: Database Migration
**Command:** `docker-compose exec -T db psql -U postgres -d similarhub -f /docker-entrypoint-initdb.d/init.sql`
**Status:** Failed
**Error:** `FATAL: role "postgres" does not exist`
**Analysis:** The default `postgres` user was used, but the project uses `similarhub_user`.

## Step 6: Retry Database Migration
**Command:** `docker-compose exec -T db psql -U similarhub_user -d similarhub_db -f /docker-entrypoint-initdb.d/init.sql`
**Status:** Success
**Result:** Base schema initialized.

## Step 7: Apply Vector Columns Migration
**Command:** `docker cp database/migrations/add_vector_columns.sql similarhub-db:/tmp/migration.sql && docker-compose exec -T db psql -U similarhub_user -d similarhub_db -f /tmp/migration.sql`
**Status:** Success
**Result:** Vector columns and HNSW indexes created.

## Step 8: Generate Embeddings
**Command:** `docker-compose exec backend python scripts/process_embeddings.py`
**Status:** Failed
**Error:** `relation "tv_shows" does not exist`
**Analysis:** The project uses `media_items` table, but my script assumed `tv_shows`. Updated scripts to use `media_items`.

## Step 8: Retry Vector Columns Migration
**Command:** `docker cp database/migrations/add_vector_columns.sql similarhub-db:/tmp/migration.sql && docker-compose exec -T db psql -U similarhub_user -d similarhub_db -f /tmp/migration.sql`
**Status:** Success
**Result:** Vector columns added to `media_items` table.

## Step 9: Generate Embeddings
**Command:** `docker-compose exec backend python scripts/process_embeddings.py`
**Status:** Failed
**Error:** `ModuleNotFoundError: No module named 'embedding_service'`
**Analysis:** Python path issue in Docker. The script was looking in `/app/backend` but files are in `/app`.

## Step 10: Retry Embedding Generation
**Command:** `docker-compose exec backend python scripts/process_embeddings.py`
**Status:** Failed
**Error:** `relation "tv_shows" does not exist`
**Analysis:** The `vector_db.py` file was updated locally but not in the container because the `backend` directory is not mounted as a volume, and the image wasn't rebuilt.

## Step 11: Rebuild Backend Container
**Command:** `docker-compose up -d --build backend`
**Status:** Success
**Result:** Backend container updated with latest code.

## Step 12: Retry Embedding Generation (Final)
**Command:** `docker-compose exec backend python scripts/process_embeddings.py`
**Status:** Failed
**Error:** `Loaded 0 shows from JSON files`
**Analysis:** The `results` directory containing JSON files was not mounted into the container.

## Step 13: Mount Results Volume and Retry
**Command:** `docker-compose up -d backend && docker-compose exec backend python scripts/process_embeddings.py`
**Status:** Failed
**Error:** `duplicate key value violates unique constraint "media_items_pkey"`
**Analysis:** The database sequence `media_items_id_seq` was out of sync with the actual IDs in the table (likely due to manual inserts or imports).

## Step 14: Fix Database Sequence
**Command:** `docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "SELECT setval('media_items_id_seq', (SELECT MAX(id) FROM media_items));"`
**Status:** Success
**Result:** Sequence synchronized with max ID.

## Step 15: Retry Embedding Generation (Final Attempt)
**Command:** `docker-compose exec backend python scripts/process_embeddings.py`
**Status:** Success (Running)
**Result:** Embedding generation started. Processing 3964 shows in batches. This process will take some time. Check logs with `docker logs -f similarhub-backend`.

docker restart similarhub-backend komutu ile backend containerı yeniden başlatılır ve süreç kesilir.










## Step 16: Update Weights and Rebuild
**Action:** Updated `vector_db.py` and `calculate_similarities.py` to use custom weights (Analytical: 0.45, Plot: 0.35, Keywords: 0.20).
**Command:** `docker-compose up -d --build backend`
**Status:** Success
**Result:** Backend container rebuilt with new weight configuration.

## Step 17: Generate Embeddings (Batch of 50)
**Command:** `docker-compose exec backend python scripts/process_embeddings.py --limit 200`
**Status:** Success
**Result:** Generated multi-vector embeddings for 50 shows.
**Log Output:**
```
Inference Embeddings: 100%|█| 1/1 [00:56<00:00, 56
...
2025-11-29 21:36:54,798 - __main__ - INFO - PROCESSING COMPLETE
```

## Step 18: Calculate Weighted Similarities
**Command:** `docker-compose exec backend python scripts/calculate_similarities.py`
**Status:** Success
**Result:** Calculated similarities using the 0.45/0.35/0.20 weights and stored them in `similar_items` table.
**Log Output:**
```
2025-11-29 21:37:05,566 - __main__ - INFO - CALCULATION COMPLETE
2025-11-29 21:37:05,567 - __main__ - INFO - Processed 127 shows in 0.0 minutes
```



docker-compose exec -T db psql -U similarhub_user -d similarhub_db -c "
WITH RankedSimilarities AS (
    SELECT
        source_id,
        target_id,
        score,
        ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY score DESC) as rank
    FROM
        similar_items
)
SELECT
    m1.title AS source_show,
    m2.title AS similar_show,
    rs.score
FROM
    RankedSimilarities rs
JOIN
    media_items m1 ON rs.source_id = m1.id
JOIN
    media_items m2 ON rs.target_id = m2.id
WHERE
    rs.rank <= 5
ORDER BY
    m1.title, rs.score DESC;
" > sonuclar.txt