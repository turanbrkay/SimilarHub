"""
Poster URL helpers for handling both TMDB and TVMaze poster sources.
"""


def format_poster_url(poster_path: str, size: str = 'w500') -> str:
    """
    Convert poster_path to full URL.
    
    Supports both TMDB paths and TVMaze full URLs.
    """
    if not poster_path:
        return None
    
    # Check if it's a TVMaze URL
    if poster_path.startswith('tvmaze:'):
        return poster_path[len('tvmaze:'):]
    
    # Check if it's already a full URL
    if poster_path.startswith('http'):
        return poster_path
    
    # It's a TMDB path - construct TMDB CDN URL
    return f"https://image.tmdb.org/t/p/{size}{poster_path}"


def normalize_poster_for_response(item: dict) -> dict:
    """
    Normalize poster_path in API response to full URL.
    """
    if item.get('poster_path'):
        item['poster_url'] = format_poster_url(item['poster_path'])
    else:
        item['poster_url'] = None
    
    return item
