import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HorizontalRow from '../components/HorizontalRow';
import RankedGrid from '../components/RankedGrid';
import FavoriteGrid from '../components/FavoriteGrid';
import CategoryStrip from '../components/CategoryStrip';
import SimilarMap from '../components/SimilarMap';
import {
    getPopularShows,
    getByGenre,
    getSimilarMap,
    type Show
} from '../services/api';
import '../styles/Dashboard.css';
import '../styles/HomeHero.css';

const Home: React.FC = () => {
    const navigate = useNavigate();

    // State for each category row
    const [popularTVShows, setPopularTVShows] = useState<Show[]>([]);
    const [sciFi, setSciFi] = useState<Show[]>([]);
    const [comedy, setComedy] = useState<Show[]>([]);
    const [comedyMovies, setComedyMovies] = useState<Show[]>([]);
    const [drama, setDrama] = useState<Show[]>([]);

    // Hero Section State
    const [heroStackItems, setHeroStackItems] = useState<Show[]>([]);
    const [heroSelectedIndex, setHeroSelectedIndex] = useState(0);
    const [heroSelectedShow, setHeroSelectedShow] = useState<Show | null>(null);
    const [heroSimilarShows, setHeroSimilarShows] = useState<Show[]>([]);

    useEffect(() => {
        const loadAllCategories = async () => {
            try {
                const [tv, sci, com, comMov, dra] = await Promise.all([
                    getPopularShows(),
                    getByGenre('Science Fiction'),
                    getByGenre('Comedy'),
                    getByGenre('Comedy', 'movie'),
                    getByGenre('Drama')
                ]);

                setPopularTVShows(tv);
                setSciFi(sci);
                setComedy(com);
                setComedyMovies(comMov);
                setDrama(dra);

                // Initialize Hero Stack with top 15 popular TV shows
                if (tv && tv.length > 0) {
                    const stack = tv.slice(0, 15);
                    setHeroStackItems(stack);
                    setHeroSelectedIndex(0);
                    setHeroSelectedShow(stack[0]);
                }
            } catch (err) {
                console.error('Error loading home categories', err);
            }
        };
        loadAllCategories();
    }, []);

    // Effect to load similar shows for the hero map when selection changes
    useEffect(() => {
        const loadHeroMap = async () => {
            if (heroSelectedShow) {
                try {
                    const data = await getSimilarMap(heroSelectedShow.id);
                    setHeroSimilarShows(data.similar_items || []);
                } catch (err) {
                    console.error('Error loading hero map', err);
                }
            }
        };
        loadHeroMap();
    }, [heroSelectedShow]);

    // Sync selected show when index changes
    useEffect(() => {
        if (heroStackItems.length > 0) {
            setHeroSelectedShow(heroStackItems[heroSelectedIndex]);
        }
    }, [heroSelectedIndex, heroStackItems]);

    const lastWheelTime = useRef(0);
    const stackContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = stackContainerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (heroStackItems.length === 0) return;

            const now = Date.now();
            if (now - lastWheelTime.current < 150) return;
            lastWheelTime.current = now;

            if (e.deltaY > 0) {
                setHeroSelectedIndex(prev => (prev + 1) % heroStackItems.length);
            } else {
                setHeroSelectedIndex(prev => (prev - 1 + heroStackItems.length) % heroStackItems.length);
            }
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, [heroStackItems.length]);

    const handleShowClick = (showId: number) => {
        navigate(`/details/${showId}`);
    };

    return (
        <main className="dashboard-main">
            <div className="dashboard-container-netflix home-view">
                {/* HERO SECTION: Stack + Map */}
                <div className="similar-map-section">
                    <div className="page-content-width" style={{
                        height: '100%',
                        display: 'flex',
                        position: 'relative'
                    }}>
                        <div className="connection-beam" />
                        <div
                            ref={stackContainerRef}
                            className="map-stack-container"
                        >
                            {heroStackItems.map((show, index) => {
                                const count = heroStackItems.length;
                                let diff = (index - heroSelectedIndex + count) % count;
                                if (diff > count / 2) diff -= count;

                                const absDiff = Math.abs(diff);
                                const isSelected = diff === 0;
                                const isActive = absDiff <= 3;

                                const scale = 1 - (absDiff * 0.1);
                                const opacity = isActive ? 1 - (absDiff * 0.2) : 0;
                                const zIndex = 100 - absDiff;
                                const yOffset = diff * 60;

                                return (
                                    <div
                                        key={show.id}
                                        className={`map-stack-card ${isSelected ? 'selected' : ''}`}
                                        style={{
                                            top: '50%',
                                            transform: `translateY(-50%) translateY(${yOffset}px) scale(${scale})`,
                                            zIndex: zIndex,
                                            opacity: Math.max(opacity, 0),
                                            pointerEvents: isActive ? 'auto' : 'none'
                                        } as React.CSSProperties}
                                        onClick={() => {
                                            if (isSelected) {
                                                handleShowClick(show.id);
                                            } else {
                                                setHeroSelectedIndex(index);
                                            }
                                        }}
                                    >
                                        <img
                                            src={`https://image.tmdb.org/t/p/w300${show.poster_path}`}
                                            alt={show.name || show.title}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="dashboard-map-container">
                            {heroSelectedShow && (
                                <SimilarMap
                                    sourceShow={heroSelectedShow}
                                    similarShows={heroSimilarShows}
                                    onShowClick={handleShowClick}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title=""
                        backgroundText="WEEKLY"
                        shows={popularTVShows}
                        onShowClick={handleShowClick}
                        contentType="tvshows"
                    />
                </div>

                <div className="page-content-width">
                    <CategoryStrip
                        categories={[
                            { name: 'Sci-Fi', shows: sciFi },
                            { name: 'Comedy', shows: comedy },
                            { name: 'Drama', shows: drama },
                            { name: 'Action', shows: popularTVShows },
                            { name: 'More', onClick: () => { } }
                        ]}
                    />
                </div>

                <div className="page-content-width">
                    <RankedGrid
                        onShowClick={handleShowClick}
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
                        shows={comedyMovies}
                        onShowClick={handleShowClick}
                        contentType="movies"
                    />
                </div>

                <div className="page-content-width">
                    <FavoriteGrid
                        onShowClick={handleShowClick}
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

export default Home;
