import React, { useRef, useState, useEffect } from 'react';
import type { Show } from '../services/api';
import SectionHeader from './SectionHeader';
import '../styles/HorizontalRow.css';

interface HorizontalRowProps {
    title: string;
    shows: Show[];
    onShowClick: (showId: number) => void;
    backgroundText?: string;
    label?: string;
    myList?: Show[];
    onToggleList?: (show: Show) => void;
    contentType?: 'movies' | 'tvshows' | 'books';
    selectedShowId?: number | null;
    onShowHover?: (show: Show) => void;
}

const HorizontalRow: React.FC<HorizontalRowProps> = ({
    title,
    shows,
    onShowClick,
    backgroundText,
    label,
    myList = [],
    onToggleList,
    contentType,
    selectedShowId,
    onShowHover
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScrollButtons = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        setCanScrollLeft(container.scrollLeft > 0);
        setCanScrollRight(
            container.scrollLeft < container.scrollWidth - container.clientWidth - 1
        );
    };

    useEffect(() => {
        checkScrollButtons();
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScrollButtons);
            window.addEventListener('resize', checkScrollButtons);
        }
        return () => {
            if (container) {
                container.removeEventListener('scroll', checkScrollButtons);
            }
            window.removeEventListener('resize', checkScrollButtons);
        };
    }, [shows]);

    const scroll = (direction: 'left' | 'right') => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const scrollAmount = container.clientWidth * 0.8;
        const targetScroll = direction === 'left'
            ? container.scrollLeft - scrollAmount
            : container.scrollLeft + scrollAmount;

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    };

    const getDisplayName = (show: Show): string => {
        return show.title || show.name || 'Unknown';
    };

    const getYear = (show: Show): string => {
        if (show.year) return String(show.year);
        if (show.first_air_date) {
            return show.first_air_date.substring(0, 4);
        }
        return '';
    };

    if (shows.length === 0) {
        return null;
    }

    const isInMyList = (show: Show): boolean => {
        return myList.some(s => String(s.id) === String(show.id));
    };

    const handleToggleList = (e: React.MouseEvent, show: Show) => {
        e.stopPropagation();
        if (onToggleList) {
            onToggleList(show);
        }
    };

    return (
        <div className="horizontal-row-section">
            {backgroundText && (
                <SectionHeader
                    backgroundText={backgroundText}
                    label={label}
                    title={title}
                    contentType={contentType}
                />
            )}

            <div className="horizontal-row-wrapper">
                {canScrollLeft && (
                    <button
                        className="horizontal-row-arrow horizontal-row-arrow-left"
                        onClick={() => scroll('left')}
                        aria-label="Scroll left"
                    >
                        ‹
                    </button>
                )}

                <div
                    className="horizontal-row-container"
                    ref={scrollContainerRef}
                >
                    {shows.map((show) => {
                        const displayName = getDisplayName(show);
                        const year = getYear(show);
                        const inList = isInMyList(show);
                        const isSelected = selectedShowId === show.id;

                        return (
                            <div
                                key={show.id}
                                className={`horizontal-row-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => onShowClick(show.id)}
                                onMouseEnter={() => onShowHover && onShowHover(show)}
                            >
                                <div className="horizontal-row-card-poster">
                                    {show.poster_path ? (
                                        <img
                                            src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                                            alt={displayName}
                                        />
                                    ) : (
                                        <div className="horizontal-row-card-no-image">
                                            No Image
                                        </div>
                                    )}
                                </div>

                                {onToggleList && (
                                    <div className="horizontal-row-card-actions">
                                        <button
                                            className={`action-icon-btn ${inList ? 'active' : ''}`}
                                            onClick={(e) => handleToggleList(e, show)}
                                            aria-label={inList ? 'Remove from list' : 'Add to list'}
                                        >
                                            <svg viewBox="0 0 24 24">
                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                            </svg>
                                        </button>
                                        <button
                                            className="action-icon-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                            aria-label="Bookmark"
                                        >
                                            <svg viewBox="0 0 24 24">
                                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                )}

                                <div className="horizontal-row-card-info">
                                    <h3>{displayName}</h3>
                                    <div className="horizontal-row-card-meta">
                                        {year && <span>{year}</span>}
                                        {show.source_type && (
                                            <span>{show.source_type === 'movie' ? 'Movie' : 'TV Show'}</span>
                                        )}
                                        {show.vote_average && (
                                            <div className="horizontal-row-card-rating">
                                                ⭐ {show.vote_average.toFixed(1)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {canScrollRight && (
                    <button
                        className="horizontal-row-arrow horizontal-row-arrow-right"
                        onClick={() => scroll('right')}
                        aria-label="Scroll right"
                    >
                        ›
                    </button>
                )}
            </div>
        </div>
    );
};

export default HorizontalRow;
