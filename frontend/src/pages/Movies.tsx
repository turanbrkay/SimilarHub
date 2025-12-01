import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HorizontalRow from '../components/HorizontalRow';
import RankedGrid from '../components/RankedGrid';
import MostLovedSection from '../components/MostLovedSection';
import TrendingHero from '../components/TrendingHero';
import {
    getPopularMovies,
    getByGenre,
    getTopRated,
    type Show
} from '../services/api';
import '../styles/Dashboard.css';

const Movies: React.FC = () => {
    const navigate = useNavigate();

    const [popularMovies, setPopularMovies] = useState<Show[]>([]);
    const [topRated, setTopRated] = useState<Show[]>([]);
    const [sciFi, setSciFi] = useState<Show[]>([]);
    const [comedy, setComedy] = useState<Show[]>([]);
    const [drama, setDrama] = useState<Show[]>([]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const [movies, rated, sci, com, dra] = await Promise.all([
                    getPopularMovies(),
                    getTopRated(),
                    getByGenre('Science Fiction', 'movie'),
                    getByGenre('Comedy', 'movie'),
                    getByGenre('Drama', 'movie')
                ]);

                setPopularMovies(movies);
                setTopRated(rated);
                setSciFi(sci);
                setComedy(com);
                setDrama(dra);
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
                        title="MOVIES ON AIR"
                        shows={popularMovies}
                        onShowClick={handleShowClick}
                        customHeader={
                            <div className="custom-header-tv-on-air">
                                MOVIES ON AIR
                            </div>
                        }
                    />
                </div>

                <div className="page-content-width">
                    <RankedGrid
                        onShowClick={handleShowClick}
                        fixedType="MOVIES"
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

                {popularMovies.length > 0 && (
                    <div className="page-content-width">
                        <TrendingHero
                            show={popularMovies[0]}
                            onShowClick={handleShowClick}
                        />
                    </div>
                )}

                <div className="page-content-width">
                    <MostLovedSection onShowClick={handleShowClick} contentType="movies" />
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title="TOP RATED MOVIES"
                        shows={topRated}
                        onShowClick={handleShowClick}
                        customHeader={
                            <div className="custom-header-tv-on-air">
                                TOP RATED MOVIES
                            </div>
                        }
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
