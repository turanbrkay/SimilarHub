# Docker Setup Guide

## Important: Multiple Projects

This project uses a specific Docker Compose project name to avoid conflicts with other projects.

## Starting the Project

**Windows:**
```bash
start-project.bat
```

**Manual:**
```bash
docker-compose -p similarhubgit up -d
```

## Stopping the Project

**Windows:**
```bash
stop-project.bat
```

**Manual:**
```bash
docker-compose -p similarhubgit down
```

## Port Configuration

- **Frontend**: http://localhost:5173
- **Database (PostgreSQL)**: localhost:5433 (host) → 5432 (container)
- **pgAdmin**: Not exposed (access via network if needed)

## Network Isolation

This project uses its own Docker network (`similarhubgit_app-network`) to prevent conflicts with other Docker projects.

## Database Configuration

- **Inside Docker network**: Services communicate using `db:5432`
- **From host machine**: Connect to `localhost:5433`
- **Volume**: Uses `similarhub_similarhub_data` for persistent storage

## Troubleshooting

### Database connection errors

If you see "could not translate host name 'db'", make sure:
1. All containers are in the same network
2. DATABASE_URL uses `db:5432` (internal port, not 5433)
3. Containers are started with `-p similarhubgit` flag

### Port conflicts

If port 5433 or 5173 is already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "NEW_PORT:5432"  # For database
  - "NEW_PORT:5173"  # For frontend
```
