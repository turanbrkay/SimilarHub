import React, { useState, useEffect } from 'react';
import { searchShows, type Show } from '../services/api';

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
        }, 300); // Debounce 300ms

        return () => clearTimeout(searchTimeout);
    }, [query]);

    const handleSelect = (show: Show) => {
        setQuery(show.title);
        setShowDropdown(false);
        onSearchSelect(show);
    };

    return (
        <div style={{ position: 'relative', width: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'transparent', borderBottom: '1px solid var(--color-text-muted)' }}>
                <span style={{ marginRight: '0.5rem', color: 'var(--color-accent)' }}>🔍</span>
                <input
                    type="text"
                    placeholder="Search TV shows..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        padding: '0.5rem',
                        width: '100%',
                        outline: 'none'
                    }}
                />
                {isLoading && <span style={{ color: 'var(--color-accent)', fontSize: '0.8em' }}>...</span>}
            </div>

            {showDropdown && suggestions.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--color-surface)',
                    borderRadius: '0 0 4px 4px',
                    zIndex: 100,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}>
                    {suggestions.map(show => (
                        <div
                            key={show.id}
                            onClick={() => handleSelect(show)}
                            style={{
                                padding: '0.75rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid #333',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                            className="search-item"
                        >
                            {show.poster_path && (
                                <img
                                    src={`https://image.tmdb.org/t/p/w92${show.poster_path}`}
                                    alt={show.title}
                                    style={{ width: '30px', height: '45px', objectFit: 'cover', borderRadius: '2px' }}
                                />
                            )}
                            <div>
                                <div style={{ color: 'white', fontSize: '0.9rem' }}>{show.title}</div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{show.year}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Search;
