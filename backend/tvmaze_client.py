"""
TVMaze API client for fetching TV show metadata and posters.
Commercial-friendly alternative to TMDB for poster images.
"""

import logging
import requests
from typing import Optional, Dict

logger = logging.getLogger(__name__)

TVMAZE_BASE_URL = "https://api.tvmaze.com"


class TVMazeClient:
    """Client for TVMaze API."""
    
    def __init__(self):
        self.base_url = TVMAZE_BASE_URL
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'SimilarHub/1.0'})
    
    def search_show(self, title: str) -> Optional[Dict]:
        """Search for a TV show by title."""
        try:
            url = f"{self.base_url}/search/shows"
            params = {'q': title}
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            results = response.json()
            
            if results and len(results) > 0:
                return results[0]['show']
            return None
        except Exception as e:
            logger.error(f"TVMaze search error for '{title}': {e}")
            return None
    
    def get_poster_url(self, title: str) -> Optional[str]:
        """Get poster URL for a TV show."""
        show_data = self.search_show(title)
        
        if show_data and show_data.get('image'):
            return show_data['image'].get('original')
        return None


# Singleton instance
_tvmaze_client = None

def get_tvmaze_client() -> TVMazeClient:
    """Get or create TVMaze client singleton."""
    global _tvmaze_client
    if _tvmaze_client is None:
        _tvmaze_client = TVMazeClient()
    return _tvmaze_client
