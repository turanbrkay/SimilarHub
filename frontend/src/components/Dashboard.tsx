import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import SimilarShows from './SimilarShows';
import { searchShows, type Show } from '../services/api';

interface DashboardProps {
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
    const [activeCategory, setActiveCategory] = useState<'movies' | 'tvshows'>('tvshows');
    const [view, setView] = useState<'home' | 'mylist' | 'similar'>('home');
    const [shows, setShows] = useState<Show[]>([]);
    const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
    const [heroShow, setHeroShow] = useState<Show | null>(null);
    const [myList, setMyList] = useState<Show[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load initial shows
    useEffect(() => {
        const loadShows = async () => {
            setIsLoading(true);
            // Search for common terms to get shows
            const results = await searchShows('the');
            setShows(results);
            if (results.length > 0) {
                setHeroShow(results[0]);
            }
            setIsLoading(false);
        };
        loadShows();
    }, []);

    const toggleMyList = (show: Show) => {
        // Ensure we compare IDs safely (handle string/number mismatch)
        const isInList = myList.some(s => String(s.id) === String(show.id));

        if (isInList) {
            setMyList(myList.filter(s => String(s.id) !== String(show.id)));
        } else {
            // Create a clean copy of the show object, removing heavy fields like embeddings if they exist
            // and ensuring consistency
            const cleanShow: Show = {
                id: show.id,
                title: show.title,
                year: show.year,
                poster_path: show.poster_path,
                overview: show.overview,
                genres: show.genres,
                popularity: show.popularity,
                similarity_percent: show.similarity_percent
            };
            setMyList([...myList, cleanShow]);
        }
    };

    const handleSearchSelect = (show: Show) => {
        // Directly go to similar view when searched
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
        <div>
            <Navbar
                onSearchSelect={handleSearchSelect}
                activeCategory={activeCategory}
                onCategoryChange={(cat) => {
                    setActiveCategory(cat);
                    setView('home');
                }}
                onLogout={onLogout}
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
                <div style={{ padding: '2rem' }}>
                    <h1 style={{ color: 'white', marginBottom: '2rem' }}>My List</h1>
                    {myList.length === 0 ? (
                        <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '3rem' }}>
                            Your list is empty. Add some shows to get started!
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '1.5rem'
                        }}>
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
                <div>
                    {/* Hero Section */}
                    {heroShow && (
                        <div style={{
                            height: '70vh',
                            background: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.9)), url(https://image.tmdb.org/t/p/original${heroShow.poster_path})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            padding: '3rem',
                            cursor: 'pointer'
                        }}
                            onClick={() => handleShowClick(heroShow.id)}
                        >
                            <h1 style={{ fontSize: '3rem', color: 'white', marginBottom: '1rem' }}>
                                {heroShow.title}
                            </h1>
                            <div style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                {heroShow.year} • {heroShow.genres?.join(', ')}
                            </div>
                            {heroShow.overview && (
                                <p style={{ maxWidth: '600px', color: 'white', marginBottom: '1.5rem' }}>
                                    {heroShow.overview}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleMyList(heroShow); }}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        border: '1px solid white',
                                        padding: '0.75rem 2rem',
                                        borderRadius: '4px',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {myList.some(s => s.id === heroShow.id) ? '✓ In My List' : '+ My List'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Shows Grid */}
                    <div style={{ padding: '2rem' }}>
                        <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>
                            {isLoading ? 'Loading...' : 'Popular TV Shows'}
                        </h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {shows.map(show => (
                                <ShowCard
                                    key={show.id}
                                    show={show}
                                    onClick={() => handleShowClick(show.id)}
                                    onToggleList={() => toggleMyList(show)}
                                    inMyList={myList.some(s => s.id === show.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Show Card Component
interface ShowCardProps {
    show: Show;
    onClick: () => void;
    onToggleList: () => void;
    inMyList: boolean;
}

const ShowCard: React.FC<ShowCardProps> = ({ show, onClick, onToggleList, inMyList }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.2s'
            }}
        >
            {show.poster_path && (
                <img
                    src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                    alt={show.title}
                    style={{ width: '100%', height: '300px', objectFit: 'cover' }}
                />
            )}
            {isHovered && (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                    padding: '1rem'
                }}>
                    <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '0.5rem' }}>
                        {show.title}
                    </h3>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                        {show.year}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleList(); }}
                            style={{
                                background: inMyList ? 'var(--color-accent)' : 'rgba(255,255,255,0.2)',
                                color: inMyList ? 'black' : 'white',
                                border: 'none',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                width: '100%'
                            }}
                        >
                            {inMyList ? '✓ Remove' : '+ My List'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
