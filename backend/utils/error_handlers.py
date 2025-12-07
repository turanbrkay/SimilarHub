"""
Centralized error handlers for Flask application.
Provides consistent error responses and logging.
"""

import logging
from flask import jsonify
import psycopg2

logger = logging.getLogger(__name__)


def success_response(data, message=None, status=200):
    """
    Create a successful JSON response.
    
    Args:
        data: Response data
        message: Optional success message
        status: HTTP status code
        
    Returns:
        Flask JSON response with status code
    """
    response = {
        "success": True,
        "data": data
    }
    if message:
        response["message"] = message
    return jsonify(response), status


def error_response(message, status=500, error_code=None, details=None):
    """
    Create an error JSON response.
    
    Args:
        message: Error message
        status: HTTP status code
        error_code: Optional error code for client handling
        details: Optional error details (for debugging)
        
    Returns:
        Flask JSON response with status code
    """
    response = {
        "success": False,
        "error": message
    }
    if error_code:
        response["error_code"] = error_code
    if details and logger.level == logging.DEBUG:
        response["details"] = details
    return jsonify(response), status


def register_error_handlers(app):
    """
    Register error handlers for common HTTP errors.
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(400)
    def bad_request_error(error):
        app.logger.warning(f"Bad request: {error}")
        return error_response("Bad request", status=400, error_code="BAD_REQUEST")
    
    @app.errorhandler(404)
    def not_found_error(error):
        app.logger.info(f"Not found: {error}")
        return error_response("Resource not found", status=404, error_code="NOT_FOUND")
    
    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f"Internal server error: {error}")
        return error_response("Internal server error", status=500, error_code="INTERNAL_ERROR")
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.error(f"Unexpected error: {error}", exc_info=True)
        
        # Handle specific database errors
        if isinstance(error, psycopg2.Error):
            return error_response(
                "Database error occurred",
                status=503,
                error_code="DATABASE_ERROR"
            )
        
        return error_response(
            "An unexpected error occurred",
            status=500,
            error_code="UNEXPECTED_ERROR"
        )
    
    app.logger.info("Error handlers registered")
