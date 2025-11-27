import React, { useState, useEffect } from 'react';
import { getSimilarShows, type Show } from '../services/api';

interface SimilarShowsProps {
    showId: number;
    onBack: () => void;
    onShowClick: (showId: number) => void;
    myList: Show[];
    onToggleList: (show: Show) => void;
}

const SimilarShows: React.FC<SimilarShowsProps> = ({ showId, onBack, onShowClick, myList, onToggleList }) => {
    const [sourceShow, setSourceShow] = useState<Show | null>(null);
    const [similarShows, setSimilarShows] = useState<Show[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSimilar = async () => {
            setIsLoading(true);
            const data = await getSimilarShows(showId);
            setSourceShow(data.source_item);
            setSimilarShows(data.similar_items || []);
            setIsLoading(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        loadSimilar();
    }, [showId]);

    if (isLoading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>
                <h2>Loading similar shows...</h2>
            </div>
        );
    }

    const isInList = sourceShow ? myList.some(s => String(s.id) === String(sourceShow.id)) : false;

    return (
        <div>
            {sourceShow && (
                <div style={{
                    height: '70vh',
                    background: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.9)), url(https://image.tmdb.org/t/p/original${sourceShow.poster_path})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '3rem',
                    position: 'relative'
                }}>
                    <button
                        onClick={onBack}
                        style={{
                            position: 'absolute',
                            top: '2rem',
                            left: '2rem',
                            background: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.3)',
                            padding: '0.5rem 1.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backdropFilter: 'blur(5px)'
                        }}
                    >
                        ← Back to Home
                    </button>

                    <h1 style={{ fontSize: '3rem', color: 'white', marginBottom: '1rem' }}>
                        {sourceShow.title}
                    </h1>
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '1.1rem' }}>
                        {sourceShow.year} • {sourceShow.genres?.join(', ')}
                    </div>
                    {sourceShow.overview && (
                        <p style={{ maxWidth: '700px', color: 'white', marginBottom: '1.5rem', fontSize: '1.1rem', lineHeight: '1.6' }}>
                            {sourceShow.overview}
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleList(sourceShow);
                            }}
                            style={{
                                background: isInList ? 'var(--color-accent)' : 'rgba(255,255,255,0.2)',
                                color: isInList ? 'black' : 'white',
                                border: isInList ? 'none' : '1px solid white',
                                padding: '0.75rem 2rem',
                                borderRadius: '4px',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {isInList ? '✓ In My List' : '+ My List'}
                        </button>
                    </div>
                </div>
            )}

            <div style={{ padding: '2rem' }}>
                <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>
                    Similar Shows ({similarShows.length})
                </h2>

                {similarShows.length === 0 ? (
                    <div style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>
                        No similar shows found. Try another show!
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {similarShows.map(show => (
                            <div
                                key={show.id}
                                onClick={() => onShowClick(show.id)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    transition: 'transform 0.2s',
                                    cursor: 'pointer'
                                }}
                                className="hover-card"
                            >
                                {show.poster_path && (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                                        alt={show.title}
                                        style={{ width: '100%', height: '300px', objectFit: 'cover' }}
                                    />
                                )}
                                <div style={{ padding: '1rem' }}>
                                    {show.similarity_percent && (
                                        <div style={{
                                            background: 'var(--color-accent)',
                                            color: 'black',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '20px',
                                            display: 'inline-block',
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            marginBottom: '0.5rem'
                                        }}>
                                            {show.similarity_percent}% Match
                                        </div>
                                    )}
                                    <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '0.25rem' }}>
                                        {show.title}
                                    </h3>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        {show.year}
                                    </div>
                                    {show.genres && (
                                        <div style={{ color: 'var(--color-accent)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                            {show.genres.join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimilarShows;
