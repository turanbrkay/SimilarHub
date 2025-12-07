import React, { useEffect, useRef, useMemo, useState } from 'react';
import { getSimilarMap, type Show } from '../services/api';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { useThrottledAnimationFrame } from '../hooks/useThrottledAnimationFrame';
import { useScrollDetection } from '../hooks/useScrollDetection';
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
    const starsRef = useRef<Star[]>([]);

    // Intersection Observer - pause animation when not visible
    const [intersectionRef, isVisible] = useIntersectionObserver({ threshold: 0.1 });

    // Scroll detection - pause animation during scroll
    const isScrolling = useScrollDetection(150);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const { clientWidth: width, clientHeight: height } = containerRef.current;

        canvas.width = width;
        canvas.height = height;

        // Reduced star count for better performance (was /4000, now /6000)
        const starCount = Math.floor((width * height) / 6000);
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

    // Throttled animation at 30fps instead of 60fps
    useThrottledAnimationFrame((time) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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

        // Optimized connection drawing - limit iterations
        const maxConnections = Math.min(starsRef.current.length, 50);
        for (let i = 0; i < maxConnections; i++) {
            const starA = starsRef.current[i];
            for (let j = i + 1; j < maxConnections; j++) {
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
    }, 30, isVisible); // 30fps, only when visible

    return (
        <div
            ref={(node) => {
                if (node) {
                    containerRef.current = node;
                    intersectionRef(node);
                }
            }}
            className="trending-hero-map-container"
        >
            <canvas
                ref={canvasRef}
                className="trending-hero-map-canvas"
                style={{
                    maskImage: `radial - gradient(circle 350px at var(--mouse - x, -1000px) var(--mouse - y, -1000px), black 0 %, transparent 100 %)`,
                    WebkitMaskImage: `radial - gradient(circle 350px at var(--mouse - x, -1000px) var(--mouse - y, -1000px), black 0 %, transparent 100 %)`
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

    // Intersection Observer - pause animation when not visible
    const [intersectionRef, isVisible] = useIntersectionObserver({ threshold: 0.1 });

    // Scroll detection - pause animation during scroll  
    const isScrolling = useScrollDetection(150);

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
        const originX = width / 2;
        const originY = height / 2;

        const positions: NodePosition[] = [];
        const posMap = new Map<number, NodePosition>();

        const N = limitedShows.length;

        // Configuration
        const safePadding = 120; // Increased safe padding (was 80)
        const centralExclusionRadiusX = 160;
        const centralExclusionRadiusY = 220;

        // Vertical Clamping
        const verticalBandHeight = 400;
        const maxVerticalOffset = verticalBandHeight / 2;

        limitedShows.forEach((show, i) => {
            let validPosition = false;
            let attempt = 0;
            let x = 0, y = 0, angle = 0, radius = 0;

            // Distribute only on Left and Right sectors
            const spread = 0.5;

            while (!validPosition && attempt < 50) {
                const isLeft = i % 2 === 0;
                const baseAngle = isLeft ? Math.PI : 0;

                const angleOffset = (Math.random() - 0.5) * 2 * spread;
                angle = baseAngle + angleOffset;

                const minRadius = centralExclusionRadiusX;
                const maxRadius = width / 2 - safePadding;

                const rNorm = (i + 1) / N;
                const rRandom = rNorm + (Math.random() * 0.2);
                radius = minRadius + (maxRadius - minRadius) * Math.min(rRandom, 1);

                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;

                if (Math.abs(y) > maxVerticalOffset) {
                    y = Math.sign(y) * (maxVerticalOffset - Math.random() * 50);
                }

                const inExclusion = (x * x) / (centralExclusionRadiusX * centralExclusionRadiusX) + (y * y) / (centralExclusionRadiusY * centralExclusionRadiusY) < 1;

                const inBounds =
                    (originX + x) > safePadding &&
                    (originX + x) < (width - safePadding) &&
                    (originY + y) > safePadding &&
                    (originY + y) < (height - safePadding);

                if (!inExclusion && inBounds) {
                    validPosition = true;
                } else {
                    attempt++;
                }
            }

            if (!validPosition) {
                const isLeft = i % 2 === 0;
                const safeX = isLeft ? -(centralExclusionRadiusX + 50) : (centralExclusionRadiusX + 50);
                x = safeX;
                y = (Math.random() - 0.5) * 100;
            }

            const pos: NodePosition = {
                x, y,
                angle, radius,
                showId: show.id,
                // Increased float speed range (was 0.0002 + 0.0003)
                floatSpeed: 0.0005 + Math.random() * 0.0008,
                floatOffset: Math.random() * 1000,
                floatPhase: Math.random() * Math.PI * 2
            };
            positions.push(pos);
            posMap.set(show.id, pos);
        });

        return { positionMap: posMap, originX, originY };
    }, [limitedShows, dimensions]);

    // Throttled animation at 30fps instead of 60fps
    useThrottledAnimationFrame((time) => {
        const startTime = performance.now();

        positionMap.forEach((pos) => {
            const nodeEl = nodeRefs.current.get(pos.showId);
            const lineEl = lineRefs.current.get(pos.showId);

            if (nodeEl) {
                const speed = time * pos.floatSpeed;
                // Reduced float amplitude for smoother animation (was 15)
                const floatX = Math.sin(speed + pos.floatOffset) * 12;
                const floatY = Math.cos(speed + pos.floatOffset) * 12;

                const currentX = originX + pos.x + floatX;
                const currentY = originY + pos.y + floatY;

                nodeEl.style.transform = `translate(-50 %, -50 %) translate(${currentX}px, ${currentY}px)`;

                // Smart Hover Card Positioning
                const distToRight = dimensions.width - currentX;
                const distToLeft = currentX;

                if (distToRight < 300) {
                    nodeEl.setAttribute('data-align', 'left');
                } else if (distToLeft < 300) {
                    nodeEl.setAttribute('data-align', 'right');
                } else {
                    nodeEl.removeAttribute('data-align');
                }

                if (lineEl) {
                    lineEl.setAttribute('x2', String(currentX));
                    lineEl.setAttribute('y2', String(currentY));
                }
            }
        });
    }, 30, isVisible, isScrolling); // 30fps, pause when not visible or scrolling

    return (
        <div
            ref={(node) => {
                if (node) {
                    containerRef.current = node;
                    intersectionRef(node);
                }
            }}
            className="trending-hero-map-container"
        >
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
                            key={`line - ${show.id} `}
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
                        key={`node - ${show.id} `}
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
                        </div >

                        {/* Hover Card */}
                        < div className="trending-hero-hover-card" >
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
                        </div >
                    </div >
                );
            })}
        </div >
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
