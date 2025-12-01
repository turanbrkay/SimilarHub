import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Show } from '../services/api';

interface DetailConnectionMapProps {
    sourceShow: Show;
    similarShows: Show[];
    onShowClick: (showId: number) => void;
}

interface NodePosition {
    x: number;
    y: number;
    // Base float parameters for organic movement
    floatSpeed: number;
    floatOffset: number;
    floatPhase: number;
    angle: number;
    radius: number;
    showId: number;
}

const DetailConnectionMap: React.FC<DetailConnectionMapProps> = React.memo(({ sourceShow, similarShows, onShowClick }) => {
    const [hoveredShowId, setHoveredShowId] = useState<number | null>(null);
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 1400, height: 700 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Refs for direct DOM manipulation (performance)
    const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const lineRefs = useRef<Map<number, SVGLineElement>>(new Map());

    // OPTIMIZATION: Cap the number of nodes to 40 to prevent performance bottlenecks
    const limitedShows = useMemo(() => {
        return similarShows.slice(0, 40);
    }, [similarShows]);

    // Dynamic canvas sizing
    useEffect(() => {
        const updateDimensions = () => {
            const container = containerRef.current;
            if (container) {
                setCanvasDimensions({
                    width: container.clientWidth,
                    height: container.clientHeight
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Calculate initial node positions with bottom-left origin
    // Calculate initial node positions with center origin of the poster
    const { positionMap, canvasWidth, canvasHeight, originX, originY } = useMemo(() => {
        const containerWidth = canvasDimensions.width;
        const containerHeight = canvasDimensions.height;

        // Use full container dimensions for the canvas coordinate system
        const canvasW = containerWidth;
        const canvasH = containerHeight;

        // Poster Dimensions & Position (CSS values)
        const posterWidth = 140;
        const posterHeight = 210;
        const posterLeft = 40; // 2.5rem
        const posterBottom = 40; // 2.5rem

        // Origin at CENTER of the dock poster
        // X = Left margin + half width
        const originX = posterLeft + posterWidth / 2;
        // Y = Container Height - Bottom margin - half height
        const originY = canvasH - posterBottom - posterHeight / 2;

        const cardWidth = 60;
        const cardHeight = 90;

        // Max float amplitude (must match animation loop)
        const safetyMargin = 15;

        // STEP 1: SORT by similarity (descending: highest first)
        const sortedShows = limitedShows.slice().sort((a, b) =>
            (b.similarity_percent || 50) - (a.similarity_percent || 50)
        );

        const N = sortedShows.length;
        const positions: NodePosition[] = [];

        // Minimum distance for anti-collision
        const nodeDiagonal = Math.sqrt(cardWidth ** 2 + cardHeight ** 2);
        const minNodeDistance = nodeDiagonal * 1.05;

        const isOverlapping = (newX: number, newY: number): boolean => {
            return positions.some(pos => {
                const absX = originX + pos.x;
                const absY = originY + pos.y;
                const dist = Math.sqrt((newX - absX) ** 2 + (newY - absY) ** 2);
                return dist < minNodeDistance;
            });
        };

        // Shuffle angles for organic distribution
        const shuffledIndices = Array.from({ length: N }, (_, i) => i)
            .sort(() => Math.random() - 0.5);

        // Radius band for organic spread
        // Distance from center to poster corner is approx 126px. 
        // Start at 200px to give clear separation.
        const innerRadius = 200;
        const outerRadius = Math.min(
            Math.sqrt((canvasW - originX) ** 2 + originY ** 2),
            900
        );
        const radiusRange = outerRadius - innerRadius;

        // Angular constraints - 90-degree fan opening to top-right quadrant
        // Origin is Center of poster.
        // 0 degrees is Right. -90 degrees is Up.
        const minAngle = -Math.PI / 2; // Up
        const maxAngle = 0;            // Right
        const angleRange = maxAngle - minAngle;

        // STEP 2: ASSIGN RADIUS BY RANK and distribute organically
        sortedShows.forEach((show, index) => {
            // Rank-based t: 0 for most similar, 1 for least similar
            const t = N > 1 ? index / (N - 1) : 0;

            // Base radius from rank
            let radius = innerRadius + t * radiusRange;
            radius = Math.max(innerRadius, Math.min(outerRadius, radius));

            // ANGLE: organic distribution across angular range
            const shuffledIndex = shuffledIndices[index];
            let baseAngle = minAngle + (angleRange * shuffledIndex) / N;

            // Add slight random jitter
            const angleJitter = (Math.random() - 0.5) * (Math.PI / 12);
            let angle = baseAngle + angleJitter;

            // Clamp angle to stay within top-right quadrant
            angle = Math.max(minAngle, Math.min(maxAngle, angle));

            // Convert to Cartesian (relative to origin)
            let x = radius * Math.cos(angle);
            let y = radius * Math.sin(angle);

            // Convert to absolute coordinates for overlap check
            let absX = originX + x;
            let absY = originY + y;

            // Anti-collision: adjust angle only
            let attempts = 0;
            const maxAttempts = 150;
            const angleIncrement = Math.PI / 60; // 3 degrees

            while (isOverlapping(absX, absY) && attempts < maxAttempts) {
                angle += angleIncrement;
                // Bounce back if out of bounds
                if (angle > maxAngle) {
                    angle = minAngle + (angle - maxAngle);
                }
                angle = Math.max(minAngle, Math.min(maxAngle, angle));

                x = radius * Math.cos(angle);
                y = radius * Math.sin(angle);
                absX = originX + x;
                absY = originY + y;
                attempts++;
            }

            // If still overlapping, try increasing radius
            if (isOverlapping(absX, absY)) {
                radius += 80;
                x = radius * Math.cos(angle);
                y = radius * Math.sin(angle);
                absX = originX + x;
                absY = originY + y;
            }

            // HARD CLAMP to container bounds
            // Ensure we don't go off-screen
            absX = Math.max(cardWidth / 2 + safetyMargin,
                Math.min(canvasW - cardWidth / 2 - safetyMargin, absX));
            absY = Math.max(cardHeight / 2 + safetyMargin,
                Math.min(canvasH - cardHeight / 2 - safetyMargin, absY));

            // CRITICAL: Ensure node is strictly above/right of poster
            // Since origin is Center, and angle is -90 to 0, it should naturally be there.
            // But we must ensure it doesn't overlap the poster itself.
            // Poster bounds:
            const pTop = canvasH - posterBottom - posterHeight;
            const pRight = posterLeft + posterWidth;

            // If node is within poster area + margin
            if (absX < pRight + safetyMargin && absY > pTop - safetyMargin) {
                // Push it out
                if (Math.abs(absX - pRight) < Math.abs(absY - pTop)) {
                    absX = pRight + safetyMargin + cardWidth / 2;
                } else {
                    absY = pTop - safetyMargin - cardHeight / 2;
                }
            }

            // Recalculate relative pos
            x = absX - originX;
            y = absY - originY;

            // Randomize float parameters for each node
            positions.push({
                x,
                y,
                angle,
                radius,
                showId: show.id,
                floatSpeed: 0.001 + Math.random() * 0.0015, // Speed of oscillation
                floatOffset: Math.random() * 1000, // Random start time
                floatPhase: Math.random() * Math.PI * 2 // Random phase
            });
        });

        const posMap = new Map<number, NodePosition>();
        positions.forEach(pos => posMap.set(pos.showId, pos));

        return { positionMap: posMap, canvasWidth: canvasW, canvasHeight: canvasH, originX, originY };
    }, [limitedShows, canvasDimensions]);

    // Animation Loop
    useEffect(() => {
        const startTime = performance.now();
        let animationFrameId: number;

        const animate = (time: number) => {
            const elapsed = time - startTime;

            // Optimize: Use for...of or regular loop instead of forEach for better performance in hot path
            const posIterator = positionMap.values();
            let result = posIterator.next();

            while (!result.done) {
                const pos = result.value;
                const showId = pos.showId;
                const nodeEl = nodeRefs.current.get(showId);
                const lineEl = lineRefs.current.get(showId);

                if (nodeEl) {
                    // Calculate organic float movement
                    const speed = elapsed * pos.floatSpeed;
                    const phase = pos.floatPhase;
                    const offset = pos.floatOffset;

                    const floatX = Math.sin(speed + offset) * 6 +
                        Math.cos(speed * 0.5 + phase) * 3;

                    const floatY = Math.cos(speed + offset) * 6 +
                        Math.sin(speed * 0.5 + phase) * 3;

                    const currentX = pos.x + floatX;
                    const currentY = pos.y + floatY;

                    // Update Node Position (absolute positioning from origin)
                    const absoluteX = originX + currentX;
                    const absoluteY = originY + currentY;
                    nodeEl.style.transform = `translate(-50%, -50%) translate(${absoluteX}px, ${absoluteY}px)`;

                    // Update Line Position (if exists)
                    if (lineEl) {
                        // Line ends at the current node position
                        lineEl.setAttribute('x2', String(absoluteX));
                        lineEl.setAttribute('y2', String(absoluteY));
                    }
                }
                result = posIterator.next();
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [positionMap, canvasWidth, canvasHeight, originX, originY]);

    const getDisplayName = (show: Show): string => show.title || show.name || 'Unknown';

    const getYear = (show: Show): string => {
        if (show.year) return String(show.year);
        if (show.first_air_date) return show.first_air_date.substring(0, 4);
        return '';
    };

    const getHoverCardPosition = (pos: NodePosition) => {
        const cardWidth = 320;
        const cardHeight = 280;
        const offset = 15;

        // Default: above the node
        let position: React.CSSProperties = {
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: `${offset}px`,
        };

        // Calculate absolute position
        const absY = originY + pos.y;
        if (absY - cardHeight - offset < 0) {
            position = {
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: `${offset}px`,
            };
        }

        const absX = originX + pos.x;
        if (absX - cardWidth / 2 < 0) {
            position = {
                ...position,
                left: '100%',
                transform: 'none',
                marginLeft: `${offset}px`,
            };
        } else if (absX + cardWidth / 2 > canvasWidth) {
            position = {
                ...position,
                right: '100%',
                left: 'auto',
                transform: 'none',
                marginRight: `${offset}px`,
            };
        }

        return position;
    };

    return (
        <div ref={containerRef} className="detail-connection-map-container">
            <div className="detail-connection-map-canvas">
                <svg
                    key={`connections-${sourceShow.id}`}
                    className="similar-map-connections"
                    viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="detailConnectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#2bd9c6', stopOpacity: 0.5 }} />
                            <stop offset="100%" style={{ stopColor: '#2bd9c6', stopOpacity: 0.15 }} />
                        </linearGradient>
                        <filter id="detailConnectionGlow">
                            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {limitedShows.map((show) => {
                        const pos = positionMap.get(show.id);
                        if (!pos) return null;

                        // Line starts from origin (bottom-left)
                        const nodeX = originX + pos.x;
                        const nodeY = originY + pos.y;

                        return (
                            <line
                                key={`line-${sourceShow.id}-${show.id}`}
                                ref={(el) => {
                                    if (el) lineRefs.current.set(show.id, el);
                                    else lineRefs.current.delete(show.id);
                                }}
                                x1={originX}
                                y1={originY}
                                x2={nodeX}
                                y2={nodeY}
                                stroke="url(#detailConnectionGradient)"
                                strokeWidth="1.5"
                                opacity="0.3"
                                filter="url(#detailConnectionGlow)"
                                className="connection-line"
                            />
                        );
                    })}

                    {/* Glow circle at origin */}
                    <circle
                        cx={originX}
                        cy={originY}
                        r="60"
                        fill="url(#detailConnectionGradient)"
                        opacity="0.08"
                        filter="url(#detailConnectionGlow)"
                    />
                </svg>

                {/* Similar nodes */}
                {limitedShows.map((show) => {
                    const pos = positionMap.get(show.id);
                    if (!pos) return null;

                    const displayName = getDisplayName(show);
                    const year = getYear(show);
                    const hoverCardStyle = hoveredShowId === show.id ? getHoverCardPosition(pos) : {};

                    // Initial absolute position (will be updated by animation)
                    const initialX = originX + pos.x;
                    const initialY = originY + pos.y;

                    return (
                        <div
                            key={`node-${sourceShow.id}-${show.id}`}
                            ref={(el) => {
                                if (el) nodeRefs.current.set(show.id, el);
                                else nodeRefs.current.delete(show.id);
                            }}
                            className="similar-map-node"
                            style={{
                                width: '60px',
                                height: '90px',
                                left: '0',
                                top: '0',
                                // Initial transform, will be overridden by animation loop
                                transform: `translate(-50%, -50%) translate(${initialX}px, ${initialY}px)`,
                            }}
                            onClick={() => onShowClick(show.id)}
                            onMouseEnter={() => setHoveredShowId(show.id)}
                            onMouseLeave={() => setHoveredShowId(null)}
                        >
                            <div className="similar-map-node-poster">
                                <img
                                    src={`https://image.tmdb.org/t/p/w200${show.poster_path}`}
                                    alt={displayName}
                                />
                            </div>

                            <div
                                className="similar-map-hover-card"
                                style={hoverCardStyle}
                            >
                                <div className="similar-map-hover-card-content">
                                    <div className="similar-map-hover-card-poster-small">
                                        <img
                                            src={`https://image.tmdb.org/t/p/w200${show.poster_path}`}
                                            alt={displayName}
                                        />
                                    </div>
                                    <div className="similar-map-hover-card-info">
                                        <h3>{displayName}</h3>
                                        {year && <p className="hover-card-year">{year}</p>}
                                        {show.overview && (
                                            <p className="hover-card-overview">
                                                {show.overview.length > 150
                                                    ? show.overview.substring(0, 150) + '...'
                                                    : show.overview}
                                            </p>
                                        )}
                                        <div className="hover-card-similarity">
                                            {show.similarity_percent}% Match
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default DetailConnectionMap;
