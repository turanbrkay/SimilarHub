import React, { useEffect, useRef, useMemo, useState } from 'react';
import { getSimilarMap, type Show } from '../services/api';
import '../styles/TrendingHero.css';

interface TrendingHeroProps {
    show: Show | null;
    onShowClick: (showId: number) => void;
}

// Extended interface for local use
interface HeroShow extends Show {
    similar?: Show[];
}

// ==================== STARFIELD FALLBACK ====================
interface Star {
    x: number;
    y: number;
    radius: number;
    opacity: number;
    vx: number;
    vy: number;
}

const StarfieldCanvas: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const starsRef = useRef<Star[]>([]);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const { clientWidth: width, clientHeight: height } = containerRef.current;

        canvas.width = width;
        canvas.height = height;

        const starCount = Math.floor((width * height) / 4000);
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

            ctx.fillStyle = '#fff';
            starsRef.current.forEach(star => {
                star.x += star.vx;
                star.y += star.vy;

                if (star.x < 0) star.x = width;
                if (star.x > width) star.x = 0;
                if (star.y < 0) star.y = height;
                if (star.y > height) star.y = 0;

                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.fill();
            });

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

    return (
        <div ref={containerRef} className="trending-hero-map-container">
            <canvas
                ref={canvasRef}
                className="trending-hero-map-canvas"
                style={{
                    maskImage: `radial-gradient(circle 350px at var(--mouse-x, -1000px) var(--mouse-y, -1000px), black 0%, transparent 100%)`,
                    WebkitMaskImage: `radial-gradient(circle 350px at var(--mouse-x, -1000px) var(--mouse-y, -1000px), black 0%, transparent 100%)`
                }}
            />
        </div>
    );
};

// ==================== CONNECTION MAP IMPLEMENTATION ====================

interface NodePosition {
    x: number;
    y: number;
    floatSpeed: number;
    floatOffset: number;
    floatPhase: number;
    angle: number;
    radius: number;
    showId: number;
}

const ConnectionMap: React.FC<{ similarShows: Show[], onShowClick: (id: number) => void }> = ({ similarShows, onShowClick }) => {
    const [dimensions, setDimensions] = useState({ width: 1000, height: 500 });
    const containerRef = useRef<HTMLDivElement>(null);

    const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const lineRefs = useRef<Map<number, SVGLineElement>>(new Map());

    // Limit nodes for performance and aesthetics
    const limitedShows = useMemo(() => similarShows.slice(0, 15), [similarShows]);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const { positionMap, originX, originY } = useMemo(() => {
        const { width, height } = dimensions;
        // Center origin
        const originX = width / 2;
        const originY = height / 2;

        const positions: NodePosition[] = [];
        const posMap = new Map<number, NodePosition>();

        const N = limitedShows.length;
        const innerRadius = Math.min(width, height) * 0.3; // Clear space for content
        const outerRadius = Math.max(width, height) * 0.6;

        limitedShows.forEach((show, i) => {
            // Distribute only on left and right sides to avoid vertical overflow
            // Left sector: PI - 0.6 to PI + 0.6
            // Right sector: -0.6 to +0.6
            const isLeft = i % 2 === 0;
            const baseAngle = isLeft ? Math.PI : 0;
            const spread = 0.8; // Spread angle in radians (approx 45 degrees each way)
            const randomOffset = (Math.random() - 0.5) * spread * 2;
            const angle = baseAngle + randomOffset;

            // Elliptical radius: wider on X, narrower on Y
            const radiusX = innerRadius + Math.random() * (outerRadius - innerRadius);
            const radiusY = radiusX * 0.4; // Flatten vertically

            const x = Math.cos(angle) * radiusX;
            const y = Math.sin(angle) * radiusY;

            const pos: NodePosition = {
                x, y,
                angle, radius: radiusX,
                showId: show.id,
                floatSpeed: 0.0005 + Math.random() * 0.001,
                floatOffset: Math.random() * 1000,
                floatPhase: Math.random() * Math.PI * 2
            };
            positions.push(pos);
            posMap.set(show.id, pos);
        });

        return { positionMap: posMap, originX, originY };
    }, [limitedShows, dimensions]);

    // Animation Loop
    useEffect(() => {
        let frameId: number;
        const startTime = performance.now();

        const animate = (time: number) => {
            const elapsed = time - startTime;

            positionMap.forEach((pos) => {
                const nodeEl = nodeRefs.current.get(pos.showId);
                const lineEl = lineRefs.current.get(pos.showId);

                if (nodeEl) {
                    const speed = elapsed * pos.floatSpeed;
                    const floatX = Math.sin(speed + pos.floatOffset) * 10;
                    const floatY = Math.cos(speed + pos.floatOffset) * 10;

                    const currentX = originX + pos.x + floatX;
                    const currentY = originY + pos.y + floatY;

                    nodeEl.style.transform = `translate(-50%, -50%) translate(${currentX}px, ${currentY}px)`;

                    if (lineEl) {
                        lineEl.setAttribute('x2', String(currentX));
                        lineEl.setAttribute('y2', String(currentY));
                    }
                }
            });
            frameId = requestAnimationFrame(animate);
        };

        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [positionMap, originX, originY]);

    return (
        <div ref={containerRef} className="trending-hero-map-container">
            <svg className="trending-hero-connections">
                <defs>
                    <linearGradient id="heroConnectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: '#2bd9c6', stopOpacity: 0.4 }} />
                        <stop offset="100%" style={{ stopColor: '#2bd9c6', stopOpacity: 0.1 }} />
                    </linearGradient>
                </defs>
                {limitedShows.map(show => {
                    const pos = positionMap.get(show.id);
                    if (!pos) return null;
                    return (
                        <line
                            key={`line-${show.id}`}
                            ref={el => { if (el) lineRefs.current.set(show.id, el); }}
                            x1={originX}
                            y1={originY}
                            x2={originX + pos.x}
                            y2={originY + pos.y}
                            stroke="url(#heroConnectionGradient)"
                            strokeWidth="1"
                        />
                    );
                })}
            </svg>

            {limitedShows.map(show => {
                const pos = positionMap.get(show.id);
                if (!pos) return null;

                return (
                    <div
                        key={`node-${show.id}`}
                        ref={el => { if (el) nodeRefs.current.set(show.id, el); }}
                        className="trending-hero-node"
                        style={{ width: '50px', height: '75px' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowClick(show.id);
                        }}
                    >
                        <div className="trending-hero-node-poster">
                            <img src={`https://image.tmdb.org/t/p/w200${show.poster_path}`} alt="" />
                        </div>

                        {/* Hover Card */}
                        <div className="trending-hero-hover-card">
                            <div className="trending-hero-hover-card-content">
                                <div className="trending-hero-hover-card-poster-small">
                                    <img src={`https://image.tmdb.org/t/p/w200${show.poster_path}`} alt="" />
                                </div>
                                <div className="trending-hero-hover-card-info">
                                    <h3>{show.title || show.name}</h3>
                                    <div className="trending-hero-hover-card-meta">
                                        <span className="trending-hero-hover-card-rating">
                                            ★ {show.vote_average?.toFixed(1)}
                                        </span>
                                        <span>{show.release_date ? show.release_date.substring(0, 4) : ''}</span>
                                    </div>
                                    {show.overview && (
                                        <p className="trending-hero-hover-card-overview">{show.overview}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ==================== MAIN COMPONENT ====================

const TrendingHero: React.FC<TrendingHeroProps> = ({ show, onShowClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [fetchedSimilar, setFetchedSimilar] = useState<Show[]>([]);

    useEffect(() => {
        if (!show) return;

        const heroShow = show as HeroShow;
        if (heroShow.similar && heroShow.similar.length > 0) {
            setFetchedSimilar(heroShow.similar);
        } else {
            // Fetch similar if not provided
            getSimilarMap(show.id).then(data => {
                if (data.similar_items && data.similar_items.length > 0) {
                    setFetchedSimilar(data.similar_items);
                }
            }).catch(err => console.error("Failed to fetch similar for hero", err));
        }
    }, [show]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            containerRef.current.style.setProperty('--mouse-x', `${x}px`);
            containerRef.current.style.setProperty('--mouse-y', `${y}px`);
        }
    };

    if (!show) return null;

    const hasSimilar = fetchedSimilar.length > 0;


    return (
        <div
            className="trending-hero-container"
            ref={containerRef}
            onMouseMove={handleMouseMove}
        >
            {/* Background */}
            <div
                className="trending-hero-bg"
                style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${show.backdrop_path})` }}
            />
            <div className="trending-hero-overlay" />

            {/* Map or Fallback */}
            {hasSimilar ? (
                <ConnectionMap similarShows={fetchedSimilar} onShowClick={onShowClick} />
            ) : (
                <StarfieldCanvas />
            )}

            {/* Content */}
            <div className="trending-hero-content">
                <div className="trending-hero-poster-wrapper" onClick={() => onShowClick(show.id)} style={{ cursor: 'pointer' }}>
                    <img
                        src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                        alt={show.title || show.name}
                        className="trending-hero-poster"
                    />
                    {/* Compact Info Card Removed */}
                </div>
            </div>
        </div>
    );
};

export default TrendingHero;
