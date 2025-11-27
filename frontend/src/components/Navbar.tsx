import React from 'react';
import Search from './Search';
import type { Show } from '../services/api';

interface NavbarProps {
    onSearchSelect: (show: Show) => void;
    activeCategory: 'movies' | 'tvshows';
    onCategoryChange: (category: 'movies' | 'tvshows') => void;
    onLogout: () => void;
    onMyListClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearchSelect, activeCategory, onCategoryChange, onLogout, onMyListClick }) => {
    const [showProfileMenu, setShowProfileMenu] = React.useState(false);

    return (
        <nav style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 2rem',
            background: 'rgba(15, 16, 20, 0.9)',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#f5c518' }}>🎬</span>
                    <span style={{ color: 'white' }}>Similar</span>
                    <span style={{ color: 'var(--color-accent)' }}>Hub</span>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                    <a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: 'var(--color-text-muted)' }}>GENRE</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: 'var(--color-text-muted)' }}>COUNTRY</a>
                    <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); onCategoryChange('movies'); }}
                        className={activeCategory === 'movies' ? 'text-accent' : ''}
                        style={{ color: activeCategory === 'movies' ? 'var(--color-accent)' : 'white' }}
                    >
                        MOVIES
                    </a>
                    <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); onCategoryChange('tvshows'); }}
                        className={activeCategory === 'tvshows' ? 'text-accent' : ''}
                        style={{ color: activeCategory === 'tvshows' ? 'var(--color-accent)' : 'white' }}
                    >
                        TV SHOWS
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: 'var(--color-text-muted)' }}>TRENDING</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: 'var(--color-text-muted)' }}>TOP IMDB</a>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <Search onSearchSelect={onSearchSelect} />
                <div style={{ position: 'relative' }}>
                    <div
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--color-accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'black',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        U
                    </div>
                    {showProfileMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '120%',
                            right: 0,
                            background: 'var(--color-surface)',
                            borderRadius: '4px',
                            padding: '0.5rem 0',
                            minWidth: '150px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                            zIndex: 1000
                        }}>
                            <div style={{ padding: '0.5rem 1rem', cursor: 'pointer', color: 'white', fontSize: '0.9rem' }} className="hover-bg">Profile</div>
                            <div
                                onClick={() => {
                                    onMyListClick();
                                    setShowProfileMenu(false);
                                }}
                                style={{ padding: '0.5rem 1rem', cursor: 'pointer', color: 'white', fontSize: '0.9rem' }}
                                className="hover-bg"
                            >
                                My List
                            </div>
                            <div style={{ padding: '0.5rem 1rem', cursor: 'pointer', color: 'white', fontSize: '0.9rem' }} className="hover-bg">Settings</div>
                            <div style={{ borderTop: '1px solid #333', margin: '0.5rem 0' }}></div>
                            <div
                                onClick={onLogout}
                                style={{ padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '0.9rem' }}
                                className="hover-bg"
                            >
                                Exit
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
