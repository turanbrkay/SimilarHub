import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPopularMovies, type Show } from '../services/api';
import '../styles/Filter.css';
import '../styles/SimilarShows.css';
import '../styles/Dashboard.css';
import FilterBar from '../components/FilterBar';

const ITEMS_PER_ROW = 7;
const INITIAL_ROWS = 3;
const MAX_ROWS = 30;

const Filter: React.FC = () => {
    const navigate = useNavigate();
    const [shows, setShows] = useState<Show[]>([]);

    // visibleRows controls how many rows (chunks of 7) are currently rendered
    const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);
    const [activeCategory, setActiveCategory] = useState('All');
    const [filterState, setFilterState] = useState({
        genres: [] as string[],
        yearRange: [1900, 2025] as [number, number],
        rating: 0
    });

    const handleCategoryChange = (category: string) => {
        setActiveCategory(category);
    };

    const handleFilterChange = (key: string, value: any) => {
        setFilterState(prev => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        setFilterState({
            genres: [],
            yearRange: [1900, 2025],
            rating: 0
        });
    };

    useEffect(() => {
        // Simulating fetching filtered data. 
        // Since the user said no API connection yet, we'll just use popular movies as a placeholder.
        const loadData = async () => {
            try {
                const data = await getPopularMovies();
                // Duplicate data to simulate a large list for infinite scroll
                setShows([...data, ...data, ...data, ...data, ...data, ...data]);
                setVisibleRows(INITIAL_ROWS);
            } catch (error) {
                console.error("Failed to load shows", error);
            }
        };
        loadData();
    }, []);

    // Infinite Scroll Handler (Throttled)
    const handleScroll = useCallback(() => {
        // Return early if we've reached max rows or ran out of items
        if (visibleRows >= MAX_ROWS || (visibleRows * ITEMS_PER_ROW) >= shows.length) {
            return;
        }

        // Check if we are near bottom of the page (within 1000px)
        const scrolledToBottom =
            window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000;

        if (scrolledToBottom) {
            // Append exactly one row
            setVisibleRows(prev => prev + 1);
        }
    }, [visibleRows, shows.length]);

    // Attach scroll listener with debounce
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const onScroll = () => {
            if (timeoutId) return;
            timeoutId = setTimeout(() => {
                handleScroll();
                timeoutId = undefined as any;
            }, 20); // Reduced from 100ms
        };

        window.addEventListener('scroll', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [handleScroll]);

    const getDisplayName = (show: Show): string => {
        return show.title || show.name || 'Unknown';
    };

    // Slice the master list based on current row count
    const visibleShows = shows.slice(0, visibleRows * ITEMS_PER_ROW);

    return (
        <div className="dashboard-container-netflix filter-page-view">
            <div className="page-content-width">
                {/* Filter Bar */}
                <FilterBar
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryChange}
                    filters={filterState}
                    onFilterChange={handleFilterChange}
                    onReset={handleReset}
                />

                {/* Content Grid - Using similar-grid-container for consistency */}
                <div className="similar-grid-section" style={{ padding: 0, background: 'transparent' }}>
                    <div className="similar-grid-container">
                        {visibleShows.map((show, index) => {
                            const showDisplayName = getDisplayName(show);

                            return (
                                <div
                                    key={`${show.id}-${index}`}
                                    className="similar-grid-card"
                                    onClick={() => navigate(`/details/${show.id}`)}
                                >
                                    <div className="similar-grid-card-poster">
                                        {/* Optional: Add a rating badge instead of similarity if we want */}
                                        {show.vote_average && (
                                            <div className="similar-grid-card-badge">
                                                <div
                                                    className={`radial-progress ${show.vote_average >= 7 ? 'text-green' :
                                                        show.vote_average >= 5 ? 'text-yellow' :
                                                            'text-red'
                                                        }`}
                                                    style={{
                                                        '--value': show.vote_average * 10,
                                                        '--size': '36px',
                                                        '--thickness': '2.5px'
                                                    } as React.CSSProperties}
                                                >
                                                    <span className="radial-progress-text">
                                                        {show.vote_average.toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        <img
                                            src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                                            alt={showDisplayName}
                                        />
                                    </div>

                                    <div className="similar-grid-card-info">
                                        <h3>{showDisplayName}</h3>
                                        <div className="similar-grid-card-meta">
                                            <span>{show.release_date ? new Date(show.release_date).getFullYear() : 'N/A'}</span>
                                            <span>Movie</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Loading Spacer / Buffer to prevent footer jump */}
                    {visibleRows < MAX_ROWS && (visibleRows * ITEMS_PER_ROW) < shows.length && (
                        <div style={{
                            height: '100px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: 'var(--color-text-muted)',
                            opacity: 0.7
                        }}>
                            <span>Loading more...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Filter;
