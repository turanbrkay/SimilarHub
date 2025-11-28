// src/components/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import Search from './Search';
import type { Show } from '../services/api';
import '../styles/Navbar.css';

interface NavbarProps {
    onSearchSelect: (show: Show) => void;
    activeCategory: 'movies' | 'tvshows' | 'books';
    onCategoryChange: (category: 'movies' | 'tvshows' | 'books') => void;
    onMyListClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
    onSearchSelect,
    activeCategory,
    onCategoryChange,
    onMyListClick
}) => {
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
                            <Link to="/">
                                <img
                                    src="/assets/img/logo.png"
                                    alt="SimilarHub Logo"
                                />
                            </Link>
                        </div>

                        <nav id="head-nav" className={showMobileNav ? 'show' : ''}>
                            <ul>
                                <li>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onCategoryChange('movies');
                                        }}
                                        className={
                                            activeCategory === 'movies'
                                                ? 'nav-link active'
                                                : 'nav-link'
                                        }
                                    >
                                        MOVIES
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onCategoryChange('tvshows');
                                        }}
                                        className={
                                            activeCategory === 'tvshows'
                                                ? 'nav-link active'
                                                : 'nav-link'
                                        }
                                    >
                                        TV SHOWS
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onCategoryChange('books');
                                        }}
                                        className={
                                            activeCategory === 'books'
                                                ? 'nav-link active'
                                                : 'nav-link'
                                        }
                                    >
                                        BOOKS
                                    </a>
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
