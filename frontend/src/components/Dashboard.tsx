import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './Navbar';
import SimilarShows from './SimilarShows';
import HorizontalRow from './HorizontalRow';
import RankedGrid from './RankedGrid';
import CategoryStrip from './CategoryStrip';
import SimilarMap from './SimilarMap';
import {
    getPopularShows,
    getPopularMovies,
    getPopularBooks,
    getTopRated,
    getByGenre,
    getSimilarMap,
    type Show
} from '../services/api';
import '../styles/Dashboard.css';
import '../styles/HomeHero.css';

const Dashboard: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<'home' | 'movies' | 'tvshows' | 'books'>('home');
    const [view, setView] = useState<'home' | 'mylist' | 'similar'>('home');
    const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
    const [myList, setMyList] = useState<Show[]>([]);

    // State for each category row
    const [popularTVShows, setPopularTVShows] = useState<Show[]>([]);
    const [popularMovies, setPopularMovies] = useState<Show[]>([]);
    const [popularBooks, setPopularBooks] = useState<Show[]>([]);
    const [topRated, setTopRated] = useState<Show[]>([]);
    const [sciFi, setSciFi] = useState<Show[]>([]);
    const [comedy, setComedy] = useState<Show[]>([]);
    const [drama, setDrama] = useState<Show[]>([]);

    // Hero Section State
    const [heroStackItems, setHeroStackItems] = useState<Show[]>([]);
    const [heroSelectedShow, setHeroSelectedShow] = useState<Show | null>(null);
    const [heroSimilarShows, setHeroSimilarShows] = useState<Show[]>([]);

    useEffect(() => {
        const loadAllCategories = async () => {
            try {
                // Load all categories in parallel - they will refresh when activeCategory changes
                const [tv, movies, books, rated, sci, com, dra] = await Promise.all([
                    getPopularShows(),
                    getPopularMovies(),
                    getPopularBooks(),
                    getTopRated(),
                    getByGenre('Science Fiction'),
                    getByGenre('Comedy'),
                    getByGenre('Drama')
                ]);

                setPopularTVShows(tv);
                setPopularMovies(movies);
                setPopularBooks(books);
                setTopRated(rated);
                setSciFi(sci);
                setComedy(com);
                setDrama(dra);

                // Initialize Hero Stack with top 8 popular TV shows
                if (tv && tv.length > 0) {
                    const stack = tv.slice(0, 8);
                    setHeroStackItems(stack);
                    // Select first one by default
                    setHeroSelectedShow(stack[0]);
                }
            } catch (err) {
                console.error('Error loading dashboard categories', err);
            }
        };
        loadAllCategories();
    }, [activeCategory]); // Re-load when category changes

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

    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleHeroStackHover = useCallback((show: Show) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setHeroSelectedShow(show);
        }, 300); // 300ms delay
    }, []);

    const toggleMyList = (show: Show) => {
        const isInList = myList.some(s => String(s.id) === String(show.id));
        if (isInList) {
            setMyList(myList.filter(s => String(s.id) !== String(show.id)));
        } else {
            const cleanShow: Show = {
                id: show.id,
                title: show.title,
                year: show.year,
                poster_path: show.poster_path,
                overview: show.overview,
                genres: show.genres,
                popularity: show.popularity,
                similarity_percent: show.similarity_percent,
                source_type: show.source_type
            };
            setMyList([...myList, cleanShow]);
        }
    };

    const handleSearchSelect = (show: Show) => {
        setSelectedShowId(show.id);
        setView('similar');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleShowClick = (showId: number) => {
        setSelectedShowId(showId);
        setView('similar');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)' }}>
            <Navbar
                onSearchSelect={handleSearchSelect}
                activeCategory={activeCategory}
                onCategoryChange={(cat) => {
                    setActiveCategory(cat);
                    setView('home');
                }}
                onMyListClick={() => setView('mylist')}
            />

            {view === 'similar' && selectedShowId ? (
                <SimilarShows
                    key={selectedShowId}
                    showId={selectedShowId}
                    onBack={() => setView('home')}
                    onShowClick={handleShowClick}
                    myList={myList}
                    onToggleList={toggleMyList}
                />
            ) : view === 'mylist' ? (
                <div className="dashboard-container" style={{ padding: '2rem 15px' }}>
                    <h1 style={{ color: '#b6fff5', marginBottom: '2rem', fontSize: '2rem' }}>My List</h1>
                    {myList.length === 0 ? (
                        <div style={{ color: '#777', textAlign: 'center', padding: '3rem' }}>
                            Your list is empty. Add some shows to get started!
                        </div>
                    ) : (
                        <div className="content movies">
                            {myList.map(show => (
                                <ShowCard
                                    key={show.id}
                                    show={show}
                                    onClick={() => handleShowClick(show.id)}
                                    onToggleList={() => toggleMyList(show)}
                                    inMyList={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <main className="dashboard-main">
                    <div className="dashboard-container-netflix">
                        {activeCategory === 'home' && (
                            <>
                                {/* HERO SECTION: Stack + Map */}
                                <div className="similar-map-section">
                                    <div className="map-stack-container">
                                        {heroStackItems.map((show, index) => {
                                            // Calculate offset for stack effect
                                            // Higher index = lower in stack visually (further down)
                                            const offset = index * 40;
                                            const zIndex = 10 - index;
                                            const isSelected = heroSelectedShow?.id === show.id;

                                            return (
                                                <div
                                                    key={show.id}
                                                    className={`map-stack-card ${isSelected ? 'selected' : ''}`}
                                                    style={{
                                                        top: '10%', // Start from top area
                                                        transform: `translateY(${offset}px) scale(${1 - index * 0.05})`,
                                                        zIndex: zIndex
                                                    }}
                                                    onMouseEnter={() => handleHeroStackHover(show)}
                                                    onClick={() => handleShowClick(show.id)}
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

                                <HorizontalRow
                                    title=""
                                    backgroundText="WEEKLY"
                                    shows={popularTVShows}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="tvshows"
                                />

                                <RankedGrid
                                    shows={topRated}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                />

                                <CategoryStrip
                                    categories={[
                                        { name: 'Sci-Fi', shows: sciFi },
                                        { name: 'Comedy', shows: comedy },
                                        { name: 'Drama', shows: drama },
                                        { name: 'Action', shows: popularTVShows },
                                        { name: 'More', onClick: () => { } }
                                    ]}
                                />

                                <HorizontalRow
                                    title=""
                                    backgroundText="SCI-FI"
                                    shows={sciFi}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="tvshows"
                                />
                                <HorizontalRow
                                    title=""
                                    backgroundText="COMEDY"
                                    shows={comedy}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="tvshows"
                                />
                                <HorizontalRow
                                    title=""
                                    backgroundText="DRAMA"
                                    shows={drama}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="tvshows"
                                />
                            </>
                        )}

                        {activeCategory === 'tvshows' && (
                            <>
                                <HorizontalRow
                                    title=""
                                    backgroundText="WEEKLY"
                                    shows={popularTVShows}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="tvshows"
                                />

                                <RankedGrid
                                    shows={topRated}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                />

                                <CategoryStrip
                                    categories={[
                                        { name: 'Sci-Fi', shows: sciFi },
                                        { name: 'Comedy', shows: comedy },
                                        { name: 'Drama', shows: drama },
                                        { name: 'Action', shows: popularTVShows },
                                        { name: 'More', onClick: () => { } }
                                    ]}
                                />

                                <HorizontalRow
                                    title=""
                                    backgroundText="SCI-FI"
                                    shows={sciFi}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="tvshows"
                                />
                                <HorizontalRow
                                    title=""
                                    backgroundText="COMEDY"
                                    shows={comedy}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="tvshows"
                                />
                                <HorizontalRow
                                    title=""
                                    backgroundText="DRAMA"
                                    shows={drama}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="tvshows"
                                />
                            </>
                        )}

                        {activeCategory === 'movies' && (
                            <>
                                <HorizontalRow
                                    title=""
                                    backgroundText="WEEKLY"
                                    shows={popularMovies}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="movies"
                                />

                                <RankedGrid
                                    shows={topRated}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                />

                                <CategoryStrip
                                    categories={[
                                        { name: 'Sci-Fi', shows: sciFi },
                                        { name: 'Comedy', shows: comedy },
                                        { name: 'Drama', shows: drama },
                                        { name: 'Action', shows: popularMovies },
                                        { name: 'More', onClick: () => { } }
                                    ]}
                                />

                                <HorizontalRow
                                    title=""
                                    backgroundText="SCI-FI"
                                    shows={sciFi}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="movies"
                                />
                                <HorizontalRow
                                    title=""
                                    backgroundText="COMEDY"
                                    shows={comedy}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="movies"
                                />
                                <HorizontalRow
                                    title=""
                                    backgroundText="DRAMA"
                                    shows={drama}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="movies"
                                />
                            </>
                        )}

                        {activeCategory === 'books' && (
                            <>
                                <HorizontalRow
                                    title=""
                                    backgroundText="WEEKLY"
                                    shows={popularBooks}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="books"
                                />

                                <RankedGrid
                                    shows={topRated}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                />

                                <CategoryStrip
                                    categories={[
                                        { name: 'Sci-Fi', shows: sciFi },
                                        { name: 'Comedy', shows: comedy },
                                        { name: 'Drama', shows: drama },
                                        { name: 'Fiction', shows: popularBooks },
                                        { name: 'More', onClick: () => { } }
                                    ]}
                                />

                                <HorizontalRow
                                    title=""
                                    backgroundText="SCI-FI"
                                    shows={sciFi}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="books"
                                />
                                <HorizontalRow
                                    title=""
                                    backgroundText="COMEDY"
                                    shows={comedy}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="books"
                                />
                                <HorizontalRow
                                    title=""
                                    backgroundText="DRAMA"
                                    shows={drama}
                                    onShowClick={handleShowClick}
                                    myList={myList}
                                    onToggleList={toggleMyList}
                                    contentType="books"
                                />
                            </>
                        )}
                    </div>
                </main>
            )}
        </div>
    );
};

interface ShowCardProps {
    show: Show;
    onClick: () => void;
    onToggleList: () => void;
    inMyList: boolean;
}

const ShowCard: React.FC<ShowCardProps> = ({ show, onClick }) => {
    const displayName = show.title || show.name || 'Unknown';

    return (
        <div className="movie-item">
            <div className="movie-border">
                <a href="#" onClick={(e) => { e.preventDefault(); onClick(); }} style={{ opacity: 1 }}>
                    <div className="quality">HD</div>
                    <div className="movie-poster">
                        <div>
                            {show.poster_path ? (
                                <img src={`https://image.tmdb.org/t/p/w500${show.poster_path}`} alt={displayName} />
                            ) : (
                                <div style={{
                                    background: '#161616', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', color: '#777', position: 'absolute',
                                    top: 0, left: 0, width: '100%', height: '100%'
                                }}>No Image</div>
                            )}
                        </div>
                    </div>
                </a>
                <a href="#" className="name" onClick={(e) => { e.preventDefault(); onClick(); }}>{displayName}</a>
                <div className="movie-info">
                    <div className="meta">
                        <span>{show.year}</span>
                        {show.genres && show.genres.length > 0 && <span>{show.genres[0]}</span>}
                    </div>
                    <div className="type" style={{ fontSize: '0.85rem', color: '#777', textTransform: 'uppercase' }}>
                        {show.source_type === 'movie' ? 'Movie' : 'TV'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;