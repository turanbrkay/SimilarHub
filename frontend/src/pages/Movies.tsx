import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HorizontalRow from '../components/HorizontalRow';
import RankedGrid from '../components/RankedGrid';
import CategoryStrip from '../components/CategoryStrip';
import {
    getPopularMovies,
    getPopularShows,
    getByGenre,
    type Show
} from '../services/api';
import '../styles/Dashboard.css';

const Movies: React.FC = () => {
    const navigate = useNavigate();

    const [popularMovies, setPopularMovies] = useState<Show[]>([]);
    const [sciFi, setSciFi] = useState<Show[]>([]);
    const [comedy, setComedy] = useState<Show[]>([]);
    const [drama, setDrama] = useState<Show[]>([]);
    const [onAirShows, setOnAirShows] = useState<Show[]>([]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const [movies, sci, com, dra, tv] = await Promise.all([
                    getPopularMovies(),
                    getByGenre('Science Fiction', 'movie'),
                    getByGenre('Comedy', 'movie'),
                    getByGenre('Drama', 'movie'),
                    getPopularShows() // Using popular TV shows as "On Air" for now
                ]);

                setPopularMovies(movies);
                setSciFi(sci);
                setComedy(com);
                setDrama(dra);
                setOnAirShows(tv);
            } catch (err) {
                console.error('Error loading movie categories', err);
            }
        };
        loadCategories();
    }, []);

    const handleShowClick = (showId: number) => {
        navigate(`/details/${showId}`);
    };

    return (
        <main className="dashboard-main">
            <div className="dashboard-container-netflix category-view">
                <div className="page-content-width">
                    <HorizontalRow
                        title="TV Shows on air"
                        shows={onAirShows}
                        onShowClick={handleShowClick}
                        customHeader={
                            <div className="custom-header-tv-on-air">
                                TV Shows on air
                            </div>
                        }
                    />
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title=""
                        backgroundText="WEEKLY"
                        shows={popularMovies}
                        onShowClick={handleShowClick}
                        contentType="movies"
                    />
                </div>

                <div className="page-content-width">
                    <RankedGrid
                        onShowClick={handleShowClick}
                    />
                </div>

                <div className="page-content-width">
                    <CategoryStrip
                        categories={[
                            { name: 'Sci-Fi', shows: sciFi },
                            { name: 'Comedy', shows: comedy },
                            { name: 'Drama', shows: drama },
                            { name: 'Action', shows: popularMovies },
                            { name: 'More', onClick: () => { } }
                        ]}
                    />
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title=""
                        backgroundText="SCI-FI"
                        shows={sciFi}
                        onShowClick={handleShowClick}
                        contentType="movies"
                    />
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title=""
                        backgroundText="COMEDY"
                        shows={comedy}
                        onShowClick={handleShowClick}
                        contentType="movies"
                    />
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title=""
                        backgroundText="DRAMA"
                        shows={drama}
                        onShowClick={handleShowClick}
                        contentType="movies"
                    />
                </div>
            </div>
        </main>
    );
};

export default Movies;
