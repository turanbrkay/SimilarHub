"""
Database connection utilities with pooling support.
Provides context managers and connection pool for production use.
"""

import os
import logging
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# Global connection pool
_connection_pool = None


def init_connection_pool(database_url, min_connections=5, max_connections=20):
    """
    Initialize the database connection pool.
    Should be called once at application startup.
    
    Args:
        database_url: PostgreSQL connection string
        min_connections: Minimum number of connections in pool
        max_connections: Maximum number of connections in pool
    """
    global _connection_pool
    
    if _connection_pool is not None:
        logger.warning("Connection pool already initialized")
        return
    
    try:
        _connection_pool = pool.ThreadedConnectionPool(
            minconn=min_connections,
            maxconn=max_connections,
            dsn=database_url
        )
        logger.info(f"Database connection pool initialized (min={min_connections}, max={max_connections})")
    except Exception as e:
        logger.error(f"Failed to initialize connection pool: {e}")
        raise


def get_db_connection():
    """
    Get a connection from the pool.
    IMPORTANT: Must be returned using return_db_connection()
    
    Returns:
        psycopg2 connection object
    """
    if _connection_pool is None:
        raise RuntimeError("Connection pool not initialized. Call init_connection_pool() first.")
    
    try:
        conn = _connection_pool.getconn()
        return conn
    except Exception as e:
        logger.error(f"Failed to get connection from pool: {e}")
        raise


def return_db_connection(conn):
    """
    Return a connection to the pool.
    
    Args:
        conn: Connection to return
    """
    if _connection_pool is None:
        logger.warning("Cannot return connection - pool not initialized")
        return
    
    try:
        _connection_pool.putconn(conn)
    except Exception as e:
        logger.error(f"Failed to return connection to pool: {e}")


@contextmanager
def get_db():
    """
    Context manager for database connections.
    Automatically handles commit/rollback and connection return.
    
    Usage:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM...")
    """
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database transaction failed: {e}")
        raise
    finally:
        return_db_connection(conn)


def close_connection_pool():
    """
    Close all connections in the pool.
    Should be called at application shutdown.
    """
    global _connection_pool
    
    if _connection_pool is not None:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Connection pool closed")
