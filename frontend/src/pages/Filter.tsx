import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPopularMovies, type Show } from '../services/api';
import '../styles/Filter.css';
import '../styles/SimilarShows.css';
import '../styles/Dashboard.css';

const Filter: React.FC = () => {
    const navigate = useNavigate();
    const [shows, setShows] = useState<Show[]>([]);
    const [visibleCount, setVisibleCount] = useState(20);

    useEffect(() => {
        // Simulating fetching filtered data. 
        // Since the user said no API connection yet, we'll just use popular movies as a placeholder.
        const loadData = async () => {
            try {
                const data = await getPopularMovies();
                // Duplicate data to simulate a large list for "Show More"
                setShows([...data, ...data, ...data, ...data]);
            } catch (error) {
                console.error("Failed to load shows", error);
            }
        };
        loadData();
    }, []);

    const handleShowMore = () => {
        setVisibleCount(prev => prev + 20);
    };

    const getDisplayName = (show: Show): string => {
        return show.title || show.name || 'Unknown';
    };

    return (
        <div className="dashboard-container-netflix filter-page-view">
            <div className="page-content-width">
                {/* Filter Bar */}
                <div className="filter-bar-seo__additional" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                    <div className="filter-bar-content-type-seo">
                        <div className="hidden-horizontal-scrollbar">
                            <div className="hidden-horizontal-scrollbar__items">
                                <div className="filter-bar-content-type__item active"><a href="#"> All </a></div>
                                <div className="filter-bar-content-type__item"><a href="#"> Movies </a></div>
                                <div className="filter-bar-content-type__item"><a href="#"> TV shows </a></div>
                            </div>
                        </div>
                    </div>

                    <div className="filter-bar-seo__additional__heading filter-bar-seo__additional--long">
                        <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="filter" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="svg-inline--fa fa-filter"><path fill="currentColor" d="M3.9 54.9C10.5 40.9 24.5 32 40 32l432 0c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9 320 448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6l0-79.1L9 97.3C-.7 85.4-2.8 68.8 3.9 54.9z" className=""></path></svg> Filters
                    </div>

                    <div className="hidden-horizontal-scrollbar scrollbar">
                        <div className="hidden-horizontal-scrollbar__items">
                            <div className="chip-button filter-bar-seo__additional--long">
                                <button> Release year&nbsp; <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-down" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="svg-inline--fa fa-chevron-down"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" className=""></path></svg></button>
                            </div>
                            <div className="chip-button filter-bar-seo__additional--long">
                                <button> Genres&nbsp; <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-down" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="svg-inline--fa fa-chevron-down"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" className=""></path></svg></button>
                            </div>
                            <div className="chip-button filter-bar-seo__additional--long">
                                <button> Price&nbsp; <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-down" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="svg-inline--fa fa-chevron-down"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" className=""></path></svg></button>
                            </div>
                            <div className="chip-button filter-bar-seo__additional--long">
                                <button> Rating&nbsp; <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-down" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="svg-inline--fa fa-chevron-down"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" className=""></path></svg></button>
                            </div>
                            <div className="chip-button filter-bar-seo__additional--long">
                                <button> Production country&nbsp; <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-down" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="svg-inline--fa fa-chevron-down"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" className=""></path></svg></button>
                            </div>
                            <div className="chip-button filter-bar-seo__additional--long">
                                <button> Runtime&nbsp; <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-down" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="svg-inline--fa fa-chevron-down"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" className=""></path></svg></button>
                            </div>
                            <div className="chip-button filter-bar-seo__additional--long">
                                <button> Age rating&nbsp; <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-down" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="svg-inline--fa fa-chevron-down"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" className=""></path></svg></button>
                            </div>
                        </div>
                    </div>

                    <div className="filter-bar-seo__reset">
                        <button type="button" className="basic-button secondary md bg-none uppercase">
                            <div className="basic-button__content">
                                <div className="filter-bar__reset-button">
                                    <span><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="xmark" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="svg-inline--fa fa-xmark"><path fill="currentColor" d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" className=""></path></svg></span>
                                    <span className="filter-bar__reset-button__text"> Reset</span>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Content Grid - Using similar-grid-container for consistency */}
                <div className="similar-grid-section" style={{ padding: 0, background: 'transparent' }}>
                    <div className="similar-grid-container">
                        {shows.slice(0, visibleCount).map((show, index) => {
                            const showDisplayName = getDisplayName(show);
                            // Mocking similarity percent for visual consistency if needed, 
                            // or we can omit it if it doesn't make sense for a general filter.
                            // For now, let's show a random high match to look "premium" or omit if preferred.
                            // User asked to match the "feel", so let's include the badge structure but maybe with a static "Popular" or just hide it if no data.
                            // Let's assume we don't have similarity data here, so we skip the badge or show a rating.
                            // Actually, let's use vote_average as a proxy for "match" or just show rating.
                            // But to strictly follow "More Like This" visual, I will use the structure.

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
                </div>

                {/* Show More Button */}
                {visibleCount < shows.length && (
                    <div className="show-more-container" style={{ marginTop: '3rem', marginBottom: '4rem' }}>
                        <button className="show-more-btn" onClick={handleShowMore}>
                            Show More
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Filter;
