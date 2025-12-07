"""
Logging configuration for production deployment.
Provides structured logging with file rotation and proper formatting.
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging(app):
    """
    Configure application logging for production.
    
    Args:
        app: Flask application instance
    """
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Remove default handlers
    app.logger.handlers.clear()
    
    # Console handler (always active)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO if not app.debug else logging.DEBUG)
    console_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    app.logger.addHandler(console_handler)
    
    # File handler (production only)
    if not app.debug:
        file_handler = RotatingFileHandler(
            'logs/app.log',
            maxBytes=10485760,  # 10MB
            backupCount=10
        )
        file_handler.setLevel(logging.INFO)
        file_formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s [%(pathname)s:%(lineno)d]: %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        app.logger.addHandler(file_handler)
    
    # Set root logger level
    app.logger.setLevel(logging.DEBUG if app.debug else logging.INFO)
    
    # Log startup
    app.logger.info('='*60)
    app.logger.info('SimilarHub Backend Starting')
    app.logger.info(f'Environment: {"development" if app.debug else "production"}')
    app.logger.info('='*60)


def get_logger(name):
    """
    Get a logger instance for a module.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        logging.Logger instance
    """
    return logging.getLogger(name)
