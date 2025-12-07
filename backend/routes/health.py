"""
Health check routes for monitoring and load balancing.
"""

import logging
from flask import Blueprint, jsonify
from datetime import datetime
import psycopg2

logger = logging.getLogger(__name__)

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for load balancers and monitoring.
    
    Returns:
        200: Service is healthy
        503: Service is unhealthy
    """
    from utils.db import get_db
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Check database connectivity
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        health_status["checks"]["database"] = "connected"
    except Exception as e:
        logger.error(f"Health check database error: {e}")
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = "disconnected"
        health_status["error"] = str(e)
        return jsonify(health_status), 503
    
    return jsonify(health_status), 200


@health_bp.route('/health/ready', methods=['GET'])
def readiness_check():
    """
    Readiness check endpoint for Kubernetes-style deployments.
    Checks if the service is ready to serve traffic.
    
    Returns:
        200: Service is ready
        503: Service is not ready
    """
    try:
        from utils.db import get_db
        
        # Check database
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM media_items LIMIT 1")
                cur.fetchone()
        
        return jsonify({"ready": True}), 200
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return jsonify({"ready": False, "error": str(e)}), 503


@health_bp.route('/health/live', methods=['GET'])
def liveness_check():
    """
    Liveness check endpoint for Kubernetes-style deployments.
    Simple check that the service is running.
    
    Returns:
        200: Service is alive
    """
    return jsonify({"alive": True}), 200
