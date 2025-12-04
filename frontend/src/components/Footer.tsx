import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer: React.FC = () => {
    return (
        <footer className="site-footer">
            <div className="footer-container">
                <div className="footer-left">
                    <div className="f-logo">
                        <img src="/assets/img/logo2.png" alt="SimilarHub" />
                    </div>
                    <p className="f-disclaimer">
                        SimilarHub does not store any movies, TV shows or files on its server.
                        It only scrapes and points to media hosted on 3rd party services.
                    </p>
                </div>

                <div className="footer-right">
                    <ul className="footer-nav">
                        <li><Link to="/dashboard">Home</Link></li>
                        <li><Link to="/dashboard">Movies</Link></li>
                        <li><Link to="/dashboard">Series</Link></li>
                        <li><Link to="/dashboard">Genres</Link></li>
                        <li><Link to="/dashboard">Your Lists</Link></li>
                    </ul>

                    <p className="f-copyright">
                        © {new Date().getFullYear()} SimilarHub. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
