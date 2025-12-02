import React, { useState, useRef, useEffect } from 'react';
import '../styles/Filter.css';

interface FilterState {
    genres: string[];
    yearRange: [number, number];
    rating: number;
}

interface FilterBarProps {
    activeCategory: string;
    onCategoryChange: (category: string) => void;
    filters: FilterState;
    onFilterChange: (key: keyof FilterState, value: any) => void;
    onReset: () => void;
}

const CATEGORIES = ['All', 'Movies', 'TV Shows', 'Books'];

const GENRES_LIST = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
    'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
    'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction',
    'TV Movie', 'Thriller', 'War', 'Western'
];

const FilterBar: React.FC<FilterBarProps> = ({
    activeCategory,
    onCategoryChange,
    filters,
    onFilterChange,
    onReset
}) => {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({});

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Update sliding indicator position
    useEffect(() => {
        if (tabsRef.current) {
            const activeTab = tabsRef.current.querySelector('.filter-tab-btn.active') as HTMLElement;
            if (activeTab) {
                setIndicatorStyle({
                    left: activeTab.offsetLeft,
                    width: activeTab.offsetWidth
                });
            }
        }
    }, [activeCategory]);

    const toggleDropdown = (name: string) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    const handleGenreToggle = (genre: string) => {
        const currentGenres = filters.genres || [];
        const newGenres = currentGenres.includes(genre)
            ? currentGenres.filter(g => g !== genre)
            : [...currentGenres, genre];
        onFilterChange('genres', newGenres);
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>, index: 0 | 1) => {
        const val = parseInt(e.target.value);
        const newRange = [...filters.yearRange] as [number, number];
        newRange[index] = val;
        onFilterChange('yearRange', newRange);
    };

    const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange('rating', parseInt(e.target.value));
    };

    return (
        <div className="filter-bar-container creative-hud" ref={dropdownRef}>
            {/* Left Side: Categories with Sliding Indicator */}
            <div className="filter-bar-left">
                <div className="filter-tabs-wrapper" ref={tabsRef}>
                    <div className="filter-tab-indicator" style={indicatorStyle} />
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`filter-tab-btn ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => onCategoryChange(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Side: Neon Filter Pills */}
            <div className="filter-bar-right">
                <div className="filter-controls">
                    {/* Genres Filter */}
                    <div className="filter-control-group">
                        <button
                            className={`filter-hud-btn ${activeDropdown === 'genres' || filters.genres.length > 0 ? 'active' : ''}`}
                            onClick={() => toggleDropdown('genres')}
                        >
                            <span className="btn-icon"><i className="fas fa-film"></i></span>
                            <span className="btn-text">Genres</span>
                            {filters.genres.length > 0 && <span className="hud-badge">{filters.genres.length}</span>}
                            <i className={`fas fa-chevron-${activeDropdown === 'genres' ? 'up' : 'down'} chevron-icon`}></i>
                        </button>

                        {activeDropdown === 'genres' && (
                            <div className="hud-dropdown genres-hud">
                                <div className="hud-dropdown-header">Select Genres</div>
                                <div className="hud-grid">
                                    {GENRES_LIST.map(genre => (
                                        <label key={genre} className="hud-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={filters.genres.includes(genre)}
                                                onChange={() => handleGenreToggle(genre)}
                                            />
                                            <span className="hud-checkmark"></span>
                                            <span className="hud-label-text">{genre}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Release Year Filter */}
                    <div className="filter-control-group">
                        <button
                            className={`filter-hud-btn ${activeDropdown === 'year' ? 'active' : ''}`}
                            onClick={() => toggleDropdown('year')}
                        >
                            <span className="btn-icon"><i className="fas fa-calendar-alt"></i></span>
                            <span className="btn-text">Year</span>
                            <i className={`fas fa-chevron-${activeDropdown === 'year' ? 'up' : 'down'} chevron-icon`}></i>
                        </button>

                        {activeDropdown === 'year' && (
                            <div className="hud-dropdown year-hud">
                                <div className="hud-dropdown-header">Release Period</div>
                                <div className="hud-range-inputs">
                                    <div className="hud-input-group">
                                        <label>From</label>
                                        <input
                                            type="number"
                                            min="1900"
                                            max="2025"
                                            value={filters.yearRange[0]}
                                            onChange={(e) => handleYearChange(e, 0)}
                                        />
                                    </div>
                                    <div className="hud-separator"></div>
                                    <div className="hud-input-group">
                                        <label>To</label>
                                        <input
                                            type="number"
                                            min="1900"
                                            max="2025"
                                            value={filters.yearRange[1]}
                                            onChange={(e) => handleYearChange(e, 1)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rating Filter */}
                    <div className="filter-control-group">
                        <button
                            className={`filter-hud-btn ${activeDropdown === 'rating' ? 'active' : ''}`}
                            onClick={() => toggleDropdown('rating')}
                        >
                            <span className="btn-icon"><i className="fas fa-star"></i></span>
                            <span className="btn-text">Rating</span>
                            {filters.rating > 0 && <span className="hud-badge">{filters.rating}+</span>}
                            <i className={`fas fa-chevron-${activeDropdown === 'rating' ? 'up' : 'down'} chevron-icon`}></i>
                        </button>

                        {activeDropdown === 'rating' && (
                            <div className="hud-dropdown rating-hud">
                                <div className="hud-dropdown-header">Min Rating: <span className="accent-text">{filters.rating}</span></div>
                                <div className="hud-slider-wrapper">
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={filters.rating}
                                        onChange={handleRatingChange}
                                        className="hud-slider"
                                    />
                                    <div className="hud-slider-track" style={{ width: `${filters.rating * 10}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Other Filters (Visual Only) */}
                    {['Country', 'Runtime', 'Age'].map(filterName => (
                        <div key={filterName} className="filter-control-group">
                            <button className="filter-hud-btn">
                                <span className="btn-text">{filterName}</span>
                                <i className="fas fa-chevron-down chevron-icon"></i>
                            </button>
                        </div>
                    ))}
                </div>

                <button className="filter-reset-hud-btn" onClick={onReset}>
                    <i className="fas fa-undo"></i>
                    <span>RESET</span>
                </button>
            </div>
        </div>
    );
};

export default FilterBar;
