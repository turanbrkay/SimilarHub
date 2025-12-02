import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPopularMovies, type Show } from '../services/api';
import '../styles/Filter.css';

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

    return (
        <div className="filter-page-container">
            {/* Filter Bar */}
            <div className="filter-bar-seo__additional">
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

            {/* Content Grid */}
            <div className="filter-content-grid">
                {shows.slice(0, visibleCount).map((show, index) => (
                    <div key={`${show.id}-${index}`} className="grid-item" onClick={() => navigate(`/details/${show.id}`)}>
                        <img
                            src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                            alt={show.title || show.name}
                            style={{ width: '100%', borderRadius: '4px', cursor: 'pointer' }}
                        />
                    </div>
                ))}
            </div>

            {/* Show More Button */}
            {visibleCount < shows.length && (
                <div className="show-more-container">
                    <button className="show-more-btn" onClick={handleShowMore}>
                        Show More
                    </button>
                </div>
            )}
        </div>
    );
};

export default Filter;
