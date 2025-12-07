"""
Input validation utilities.
Provides common validators for API inputs.
"""

import logging
from flask import abort

logger = logging.getLogger(__name__)


def validate_query(query, min_length=2, max_length=200):
    """
    Validate search query string.
    
    Args:
        query: Query string to validate
        min_length: Minimum query length
        max_length: Maximum query length
        
    Returns:
        Cleaned query string
        
    Raises:
        400 error if invalid
    """
    if not query or not isinstance(query, str):
        abort(400, description="Query must be a non-empty string")
    
    query = query.strip()
    
    if len(query) < min_length:
        abort(400, description=f"Query too short (minimum {min_length} characters)")
    
    if len(query) > max_length:
        abort(400, description=f"Query too long (maximum {max_length} characters)")
    
    return query


def validate_id(item_id, param_name="id"):
    """
    Validate integer ID parameter.
    
    Args:
        item_id: ID to validate
        param_name: Parameter name for error message
        
    Returns:
        Integer ID
        
    Raises:
        400 error if invalid
    """
    try:
        item_id = int(item_id)
        if item_id <= 0:
            raise ValueError("ID must be positive")
        return item_id
    except (ValueError, TypeError):
        abort(400, description=f"Invalid {param_name}: must be a positive integer")


def validate_limit(limit, default=10, max_limit=200):
    """
    Validate limit parameter for pagination.
    
    Args:
        limit: Limit value (can be None)
        default: Default limit if None
        max_limit: Maximum allowed limit
        
    Returns:
        Integer limit
    """
    if limit is None:
        return default
    
    try:
        limit = int(limit)
        if limit <= 0:
            return default
        return min(limit, max_limit)
    except (ValueError, TypeError):
        return default


def validate_env_vars(required_vars):
    """
    Validate that required environment variables are set.
    
    Args:
        required_vars: List of required environment variable names
        
    Raises:
        ValueError if any required variables are missing
    """
    import os
    
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        error_msg = f"Missing required environment variables: {', '.join(missing)}"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    logger.info(f"All required environment variables validated: {', '.join(required_vars)}")
