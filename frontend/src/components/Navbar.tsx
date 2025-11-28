import React from 'react';
import Search from './Search';
import type { Show } from '../services/api';
import '../styles/Navbar.css';

interface NavbarProps {
    onSearchSelect: (show: Show) => void;
    activeCategory: 'movies' | 'tvshows';
    onCategoryChange: (category: 'movies' | 'tvshows') => void;
    onMyListClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearchSelect, activeCategory, onCategoryChange, onMyListClick }) => {
    const [showProfileMenu, setShowProfileMenu] = React.useState(false);
    const [showMobileNav, setShowMobileNav] = React.useState(false);

    return (
        <header className="header">
            <div className="container">
                <div className="wrap-head">
                    {/* Left Head - Logo & Navigation */}
                    <div className="l-head">
                        <div
                            id="head-nav-btn"
                            onClick={() => setShowMobileNav(!showMobileNav)}
                        >
                            <span className="material-icons">menu</span>
                        </div>

                        <div className="head-logo">
                            <img
                                src="/assets/img/logo.png"
                                alt="SimilarHub Logo"
                            />
                        </div>

                        <nav id="head-nav" className={showMobileNav ? 'show' : ''}>
                            <ul>
                                <li>
                                    <a href="#" onClick={(e) => { e.preventDefault(); }}>GENRE</a>
                                </li>
                                <li>
                                    <a href="#" onClick={(e) => { e.preventDefault(); }}>COUNTRY</a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); onCategoryChange('movies'); }}
                                        style={{
                                            color: activeCategory === 'movies' ? '#2bd9c6' : 'rgb(153, 255, 241)',
                                            borderLeft: activeCategory === 'movies' ? '3px solid #28af95' : '3px solid transparent'
                                        }}
                                    >
                                        MOVIES
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); onCategoryChange('tvshows'); }}
                                        style={{
                                            color: activeCategory === 'tvshows' ? '#2bd9c6' : 'rgb(153, 255, 241)',
                                            borderLeft: activeCategory === 'tvshows' ? '3px solid #28af95' : '3px solid transparent'
                                        }}
                                    >
                                        TV SHOWS
                                    </a>
                                </li>
                                <li>
                                    <a href="#" onClick={(e) => { e.preventDefault(); }}>TOP IMDB</a>
                                </li>
                            </ul>
                        </nav>
                    </div>

                    {/* Right Head - Search & User */}
                    <div className="r-head">
                        <Search onSearchSelect={onSearchSelect} />

                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
