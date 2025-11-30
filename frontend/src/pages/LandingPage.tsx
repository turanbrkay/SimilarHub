import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/LandingPage.css';

const LandingPage: React.FC = () => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Search logic would go here
    };

    return (
        <>
            <div id="intro">
                <div className="wrapper">
                    <div className="main" style={{ alignItems: 'flex-start' }}>
                        <div className="container intro-container">
                            <div className="intro-wrap" style={{ maxWidth: '720px' }}>
                                <header className="intro-header">
                                    <div className="logo">
                                        <img src="/assets/img/logo.png" alt="SimilarHub" />
                                    </div>

                                    <h1 className="text-major">
                                        Type one title.<br />
                                        Discover your next favorite.
                                    </h1>

                                    <div id="head-search" className="head-search">
                                        <div id="search-wrapper" className="search-wrapper">
                                            <form
                                                autoComplete="off"
                                                onSubmit={handleSubmit}
                                                className="search-form"
                                            >
                                                <button
                                                    type="button"
                                                    className="filter-btn"
                                                    aria-label="Filter results"
                                                >
                                                    <span className="material-icons">filter_list</span>
                                                    <span>Filter</span>
                                                </button>

                                                <input
                                                    type="text"
                                                    placeholder="Type a title you like…"
                                                    name="keyword"
                                                    aria-label="Search titles"
                                                />

                                                <button type="submit" className="search-submit">
                                                    <span className="material-icons">search</span>
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </header>

                                <Link className="btn-homepage" to="/home">
                                    <span>GO TO DASHBOARD</span>
                                    <span className="material-icons">arrow_forward</span>
                                </Link>

                                <div className="description-text">
                                    <p>
                                        Looking for a hassle-free and wallet-friendly movie streaming experience?
                                        Look no further than SimilarHub.
                                    </p>
                                    <p>
                                        We analyze thousands of TV shows to find the perfect match for your taste.
                                        Just search for a show you love, and we&apos;ll recommend what to watch next.
                                    </p>
                                    <p>
                                        Completely free, no registration required. Just pure entertainment discovery.
                                    </p>
                                </div>

                                <div className="share">
                                    <div className="share-btn facebook">
                                        <span className="icon">f</span>
                                        <span className="count">32.3k</span>
                                    </div>
                                    <div className="share-btn twitter">
                                        <span className="icon">t</span>
                                        <span className="count">5.4k</span>
                                    </div>
                                    <div className="share-btn whatsapp">
                                        <span className="icon">w</span>
                                        <span className="count">1.7k</span>
                                    </div>
                                    <div className="share-btn reddit">
                                        <span className="icon">r</span>
                                        <span className="count">6.5k</span>
                                    </div>
                                    <div className="share-btn messenger">
                                        <span className="icon">m</span>
                                        <span className="count">379k</span>
                                    </div>
                                    <div className="share-btn telegram">
                                        <span className="icon">tg</span>
                                        <span className="count">33k</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LandingPage;
