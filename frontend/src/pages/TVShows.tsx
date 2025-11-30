import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HorizontalRow from '../components/HorizontalRow';
import RankedGrid from '../components/RankedGrid';
import {
    getPopularShows,
    getByGenre,
    type Show
} from '../services/api';
import '../styles/Dashboard.css';

const TVShows: React.FC = () => {
    const navigate = useNavigate();

    const [popularTVShows, setPopularTVShows] = useState<Show[]>([]);
    const [sciFi, setSciFi] = useState<Show[]>([]);
    const [comedy, setComedy] = useState<Show[]>([]);
    const [drama, setDrama] = useState<Show[]>([]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const [tv, sci, com, dra] = await Promise.all([
                    getPopularShows(),
                    getByGenre('Science Fiction'),
                    getByGenre('Comedy'),
                    getByGenre('Drama')
                ]);

                setPopularTVShows(tv);
                setSciFi(sci);
                setComedy(com);
                setDrama(dra);
            } catch (err) {
                console.error('Error loading tv categories', err);
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
                        title="TV SHOWS ON AIR"
                        shows={popularTVShows}
                        onShowClick={handleShowClick}
                        customHeader={
                            <div className="custom-header-tv-on-air">
                                TV SHOWS ON AIR
                            </div>
                        }
                        contentType="tvshows"
                    />
                </div>

                <div className="page-content-width">
                    <RankedGrid
                        onShowClick={handleShowClick}
                        fixedType="TV SHOWS"
                    />
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title=""
                        backgroundText="SCI-FI"
                        shows={sciFi}
                        onShowClick={handleShowClick}
                        contentType="tvshows"
                    />
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title=""
                        backgroundText="COMEDY"
                        shows={comedy}
                        onShowClick={handleShowClick}
                        contentType="tvshows"
                    />
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title=""
                        backgroundText="DRAMA"
                        shows={drama}
                        onShowClick={handleShowClick}
                        contentType="tvshows"
                    />
                </div>
            </div>
        </main>
    );
};

export default TVShows;
