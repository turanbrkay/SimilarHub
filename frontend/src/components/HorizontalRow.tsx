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
                {/* Edge blur overlays */}
                <div className={`horizontal-row-edge-overlay horizontal-row-edge-overlay-left ${canScrollLeft ? 'visible' : ''}`} />
                <div className={`horizontal-row-edge-overlay horizontal-row-edge-overlay-right ${canScrollRight ? 'visible' : ''}`} />

                {canScrollLeft && (
                    <button
                        className="horizontal-row-arrow horizontal-row-arrow-left"
                        onClick={() => scroll('left')}
                        aria-label="Scroll left"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                )}

                <div
                    className="horizontal-row-container"
                    ref={scrollContainerRef}
                >
                    {shows.map((show) => {
                        const displayName = getDisplayName(show);
                        const year = getYear(show);
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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default HorizontalRow;
