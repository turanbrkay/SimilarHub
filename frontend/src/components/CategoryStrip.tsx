import React from 'react';
import { Link } from 'react-router-dom';
import type { Show } from '../services/api';
import '../styles/Dashboard.css';

interface Category {
    name: string;
    shows?: Show[];
    onClick?: () => void;
}

interface CategoryStripProps {
    categories: Category[];
}

const CategoryStrip: React.FC<CategoryStripProps> = () => {
    // Hardcoded categories as per new design requirements
    const categories = [
        {
            name: 'Movies',
            path: '/movies',
            image: 'https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg' // The Shawshank Redemption
        },
        {
            name: 'TV Shows',
            path: '/tv',
            image: 'https://image.tmdb.org/t/p/w500/zOpe0eHsq0A2NvNyBbtT6sj53qV.jpg' // The Boys
        },
        {
            name: 'Books',
            path: '/books',
            image: 'https://covers.openlibrary.org/b/id/14553193-L.jpg' // Sample book cover
        },
        {
            name: 'Anime',
            path: '/anime',
            image: 'https://media.themoviedb.org/t/p/w440_and_h660_face/jSCuXZbwxbUHCvebMzxjY2ccSWy.jpg' // Naruto Shippuden
        }
    ];

    return (
        <div className="category-strip">
            <div className="category-strip-header">
                <p className="category-strip-title">
                    Category
                </p>
            </div>

            <div className="category-strip-grid">
                {categories.map((cat) => (
                    <Link
                        key={cat.name}
                        to={cat.path}
                        className="category-strip-card group"
                    >
                        <span className="category-strip-label">{cat.name}</span>
                        <div className="category-strip-image-container">
                            <img
                                className="category-strip-image"
                                src={cat.image}
                                alt={`${cat.name} Poster`}
                            />
                        </div>
                        <div className="category-strip-decoration"></div>
                    </Link>
                ))}

                <Link
                    to="/categories"
                    className="category-strip-card category-strip-card-more group"
                >
                    <span>More</span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="category-strip-icon"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </Link>
            </div>
        </div>
    );
};

export default CategoryStrip;
