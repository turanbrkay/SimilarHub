// src/components/Search.tsx
import React, { useState, useEffect } from 'react';
import { searchShows, type Show } from '../services/api';
import '../styles/Navbar.css';

interface SearchProps {
    onSearchSelect: (show: Show) => void;
}

const Search: React.FC<SearchProps> = ({ onSearchSelect }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Show[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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

    return (
        <div className="nav-search">
            <div className="nav-search-input-wrap">
                <span className="material-icons nav-search-icon">search</span>
                <input
                    type="text"
                    placeholder="Search TV shows..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
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
