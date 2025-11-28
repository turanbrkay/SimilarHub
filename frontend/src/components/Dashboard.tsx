import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import SimilarShows from './SimilarShows';
import { searchShows, getPopularShows, type Show } from '../services/api';
import '../styles/Dashboard.css';

const Dashboard: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<'movies' | 'tvshows' | 'books'>('tvshows');
    const [view, setView] = useState<'home' | 'mylist' | 'similar'>('home');
    const [shows, setShows] = useState<Show[]>([]);
    const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
    const [myList, setMyList] = useState<Show[]>([]);
    const [recommendedTab, setRecommendedTab] = useState<'movies' | 'tv' | 'trending'>('movies');
    const [trendingTab, setTrendingTab] = useState<'day' | 'week' | 'month'>('day');

    useEffect(() => {
        const loadShows = async () => {
            try {
                const results = await getPopularShows();
                console.log('Loaded popular shows count:', results.length);
                setShows(results);
            } catch (err) {
                console.error('Error loading popular shows', err);
                setShows([]);
            }
        };
        loadShows();
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
                similarity_percent: show.similarity_percent
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
        <div style={{ minHeight: '100vh', background: '#000' }}>
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
                    <div className="dashboard-container" style={{ paddingTop: '2rem' }}>
                        <div className="aside-wrap">
                            <div className="main-content">
                                <section>
                                    <div className="section-content">
                                        <div className="base content movies">
                                            {shows.slice(0, 49).map(show => (
                                                <ShowCard key={show.id} show={show}
                                                    onClick={() => handleShowClick(show.id)}
                                                    onToggleList={() => toggleMyList(show)}
                                                    inMyList={myList.some(s => s.id === show.id)} />
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            </div>

                        </div>
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
    return (
        <div className="movie-item">
            <div className="movie-border">
                <a href="#" onClick={(e) => { e.preventDefault(); onClick(); }} style={{ opacity: 1 }}>
                    <div className="quality">HD</div>
                    <div className="movie-poster">
                        <div>
                            {show.poster_path ? (
                                <img src={`https://image.tmdb.org/t/p/w500${show.poster_path}`} alt={show.title} />
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
                <a href="#" className="name" onClick={(e) => { e.preventDefault(); onClick(); }}>{show.title}</a>
                <div className="movie-info">
                    <div className="meta">
                        <span>{show.year}</span>
                        {show.genres && show.genres.length > 0 && <span>{show.genres[0]}</span>}
                    </div>
                    <div className="type" style={{ fontSize: '0.85rem', color: '#777', textTransform: 'uppercase' }}>TV</div>
                </div>
            </div>
        </div>
    );
};

interface SidebarShowCardProps {
    show: Show;
    rank: number;
    onClick: () => void;
}

const SidebarShowCard: React.FC<SidebarShowCardProps> = ({ show, rank, onClick }) => {
    return (
        <a href="#" className="movie-item" onClick={(e) => { e.preventDefault(); onClick(); }}
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <div style={{
                fontSize: '2rem', fontWeight: 'bold', color: '#28af95',
                minWidth: '40px', textAlign: 'center', marginRight: '0.5rem'
            }}>{rank}</div>
            <div className="movie-info">
                <div className="top"><span>TV</span></div>
                <div className="name">{show.title}</div>
                <div className="bottom">
                    <span><span id="star-and-rating">
                        <i className="material-icons">&#xe885;</i>
                        {show.popularity ? show.popularity.toFixed(1) : 'N/A'}
                    </span></span>
                    <span>{show.year}</span>
                    {show.genres && show.genres.length > 0 && <span>{show.genres[0]}</span>}
                </div>
            </div>
            <div className="movie-poster">
                <div>
                    {show.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w200${show.poster_path}`} alt={show.title} />
                    ) : (
                        <div style={{
                            background: '#161616', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#777', fontSize: '0.7rem',
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'
                        }}>N/A</div>
                    )}
                </div>
            </div>
        </a>
    );
};

export default Dashboard;