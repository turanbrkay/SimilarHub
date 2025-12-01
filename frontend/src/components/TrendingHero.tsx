import React, { useEffect, useRef } from 'react';
import type { Show } from '../services/api';
import '../styles/TrendingHero.css';

interface TrendingHeroProps {
    show: Show | null;
    onShowClick: (showId: number) => void;
}

interface Star {
    x: number;
    y: number;
    radius: number;
    opacity: number;
    vx: number;
    vy: number;
}

const TrendingHero: React.FC<TrendingHeroProps> = ({ show, onShowClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const starsRef = useRef<Star[]>([]);

    // Initialize stars
    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const { clientWidth: width, clientHeight: height } = containerRef.current;

        canvas.width = width;
        canvas.height = height;

        const starCount = Math.floor((width * height) / 4000); // Density
        const stars: Star[] = [];

        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.5 + 0.3,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2
            });
        }
        starsRef.current = stars;

        const handleResize = () => {
            if (containerRef.current && canvasRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Animation Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const animate = () => {
            if (!canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const width = canvas.width;
            const height = canvas.height;

            // Update and Draw Stars
            ctx.fillStyle = '#fff';
            starsRef.current.forEach(star => {
                // Move
                star.x += star.vx;
                star.y += star.vy;

                // Wrap
                if (star.x < 0) star.x = width;
                if (star.x > width) star.x = 0;
                if (star.y < 0) star.y = height;
                if (star.y > height) star.y = 0;

                // Draw Star
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.fill();
            });

            // Draw Connections
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 0.5;

            const connectionDist = 100;

            for (let i = 0; i < starsRef.current.length; i++) {
                const starA = starsRef.current[i];
                for (let j = i + 1; j < starsRef.current.length; j++) {
                    const starB = starsRef.current[j];
                    const dx = starA.x - starB.x;
                    const dy = starA.y - starB.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDist) {
                        ctx.beginPath();
                        ctx.moveTo(starA.x, starA.y);
                        ctx.lineTo(starB.x, starB.y);
                        ctx.stroke();
                    }
                }
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Update CSS variables for mask
            containerRef.current.style.setProperty('--mouse-x', `${x}px`);
            containerRef.current.style.setProperty('--mouse-y', `${y}px`);
        }
    };

    const handleMouseLeave = () => {
        // Optional: Hide mask or move it away
    };

    if (!show) return null;

    const releaseYear = show.release_date ? new Date(show.release_date).getFullYear() :
        show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'N/A';

    const rating = show.vote_average ? show.vote_average.toFixed(1) : 'NR';

    return (
        <div
            className="trending-hero-container"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                // Inline mask style to ensure it works with dynamic variables
            } as React.CSSProperties}
        >
            {/* Background */}
            <div
                className="trending-hero-bg"
                style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${show.backdrop_path})` }}
            />
            <div className="trending-hero-overlay" />

            {/* Map Canvas with Mask */}
            <canvas
                ref={canvasRef}
                className="trending-hero-map-canvas"
                style={{
                    maskImage: `radial-gradient(circle 350px at var(--mouse-x, -1000px) var(--mouse-y, -1000px), black 0%, transparent 100%)`,
                    WebkitMaskImage: `radial-gradient(circle 350px at var(--mouse-x, -1000px) var(--mouse-y, -1000px), black 0%, transparent 100%)`
                }}
            />

            {/* Content */}
            <div className="trending-hero-content">
                {/* Poster */}
                <div className="trending-hero-poster-wrapper" onClick={() => onShowClick(show.id)} style={{ cursor: 'pointer' }}>
                    <img
                        src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                        alt={show.title || show.name}
                        className="trending-hero-poster"
                    />
                    {/* Capsule */}
                    <div className="trending-hero-capsule">
                        <span className="capsule-rating">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                            </svg>
                            {rating}
                        </span>
                        <span className="capsule-divider"></span>
                        <span>{releaseYear}</span>
                    </div>
                </div>

                {/* Info */}
                <div className="trending-hero-info">
                    <h2 className="trending-hero-title">{show.title || show.name}</h2>

                    <div className="trending-hero-meta">
                        <span className="trending-hero-tag">Trending Now</span>
                        {show.original_language && (
                            <span className="trending-hero-tag">{show.original_language.toUpperCase()}</span>
                        )}
                        {/* Add more tags if available */}
                    </div>

                    <p className="trending-hero-description">{show.overview}</p>
                </div>
            </div>
        </div>
    );
};

export default TrendingHero;
