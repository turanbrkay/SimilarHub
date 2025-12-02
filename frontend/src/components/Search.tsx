// src/components/Search.tsx
import React, { useState, useEffect } from 'react';
import { searchShows, type Show } from '../services/api';
import '../styles/Navbar.css';

interface SearchProps {
    onSearchSelect: (show: Show) => void;
    onSearchSubmit?: (query: string) => void;
}

const Search: React.FC<SearchProps> = ({ onSearchSelect, onSearchSubmit }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Show[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const searchRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const searchTimeout = setTimeout(async () => {
            if (query.length > 1) {
                setIsLoading(true);
                const results = await searchShows(query);
                setSuggestions(results);
                setShowDropdown(results.length > 0);
                setIsLoading(false);
            } else {
                setSuggestions([]);
                setShowDropdown(false);
            }
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [query]);

    const handleSelect = (show: Show) => {
        setQuery(show.title || show.name || '');
        setShowDropdown(false);
        onSearchSelect(show);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && query.trim().length > 0) {
            setShowDropdown(false);
            if (onSearchSubmit) {
                onSearchSubmit(query);
            }
        }
    };

    return (
        <div className="nav-search" ref={searchRef}>
            <div className="nav-search-input-wrap">
                <span className="material-icons nav-search-icon">search</span>
                <input
                    type="text"
                    placeholder="Search TV shows..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="nav-search-input"
                    aria-label="Search TV shows"
                />
                {isLoading && (
                    <span className="nav-search-loading">...</span>
                )}
            </div>

            {showDropdown && suggestions.length > 0 && (
                <div className="nav-search-results">
                    {suggestions.map(show => (
                        <button
                            key={show.id}
                            type="button"
                            onClick={() => handleSelect(show)}
                            className="nav-search-item"
                        >
                            {show.poster_path && (
                                <img
                                    src={`https://image.tmdb.org/t/p/w92${show.poster_path}`}
                                    alt={show.title || show.name}
                                    className="nav-search-item-image"
                                />
                            )}
                            <div className="nav-search-item-text">
                                <div className="title">{show.title || show.name}</div>
                                <div className="year">{show.year}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Search;
