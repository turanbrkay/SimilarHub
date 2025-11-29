import React from 'react';
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

const CategoryStrip: React.FC<CategoryStripProps> = ({ categories }) => {
    return (
        <div className="category-strip">
            <div className="category-strip-header">
                <h2 className="category-strip-bg-text">CATEGORY</h2>
            </div>
            <div className="category-strip-container">
                {categories.map((category, index) => {
                    const isMore = category.name === 'More';
                    const sampleShow = category.shows && category.shows.length > 0 ? category.shows[0] : null;

                    return (
                        <div
                            key={index}
                            className="category-card"
                            onClick={category.onClick}
                        >
                            <div className="category-card-label">
                                {category.name}
                            </div>

                            {isMore ? (
                                <div className="category-card-more">
                                    <span className="category-card-arrow">→</span>
                                </div>
                            ) : sampleShow && sampleShow.poster_path ? (
                                <div className="category-card-image">
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${sampleShow.poster_path}`}
                                        alt={category.name}
                                    />
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CategoryStrip;
