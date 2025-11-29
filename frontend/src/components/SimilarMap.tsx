import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Show } from '../services/api';

interface SimilarMapProps {
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

const SimilarMap: React.FC<SimilarMapProps> = ({ sourceShow, similarShows, onShowClick }) => {
    const [hoveredShowId, setHoveredShowId] = useState<number | null>(null);

    // Refs for direct DOM manipulation (performance)
    const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const lineRefs = useRef<Map<number, SVGLineElement>>(new Map());
    const animationRef = useRef<number | null>(null);

    // Calculate initial node positions
    const { positionMap, canvasWidth, canvasHeight } = useMemo(() => {
        const containerWidth = 1400;
        const containerHeight = 700;
        const padding = 40;
        const canvasW = containerWidth - padding;
        const canvasH = containerHeight - padding;

        const cardWidth = 60;
        const cardHeight = 90;
        const centerNodeWidth = 100;
        const centerNodeHeight = 150;

        // Max float amplitude (must match animation loop)
        const maxFloatAmplitude = 9; // 6 (sin) + 3 (cos)
        const safetyMargin = 5;

        // HARD CLAMPING BOUNDS (accounting for card size and animation)
        // We calculate safe bounds dynamically later

        const baseSize = Math.min(canvasW, canvasH);
        const horizontalStretch = 1.15;
        const verticalStretch = 0.82;

        // Inner exclusion zone around center
        const centerDiagonal = Math.sqrt(centerNodeWidth ** 2 + centerNodeHeight ** 2);
        const nodeDiagonal = Math.sqrt(cardWidth ** 2 + cardHeight ** 2);
        const exclusionRadius = (centerDiagonal / 2) + (nodeDiagonal / 2) + 20;

        // Radius band
        const innerRadius = Math.max(exclusionRadius + 25, baseSize * 0.25);
        const outerRadius = baseSize * 0.72;
        const radiusRange = outerRadius - innerRadius;

        // STEP 1: SORT by similarity (descending: highest first)
        const sortedShows = similarShows.slice().sort((a, b) =>
            (b.similarity_percent || 50) - (a.similarity_percent || 50)
        );

        const N = sortedShows.length;
        const positions: NodePosition[] = [];

        // Minimum distance for anti-collision
        const minNodeDistance = nodeDiagonal * 1.1;

        const isOverlapping = (newX: number, newY: number): boolean => {
            return positions.some(pos => {
                const dist = Math.sqrt((newX - pos.x) ** 2 + (newY - pos.y) ** 2);
                return dist < minNodeDistance;
            });
        };

        // Shuffle angles for organic distribution
        const shuffledIndices = Array.from({ length: N }, (_, i) => i)
            .sort(() => Math.random() - 0.5);

        // STEP 2: ASSIGN RADIUS BY RANK (strict monotonic)
        sortedShows.forEach((show, index) => {
            // Rank-based t: 0 for most similar (index 0), 1 for least similar (index N-1)
            const t = N > 1 ? index / (N - 1) : 0;

            // Base radius from rank (STRICT: higher rank = larger radius)
            // NO JITTER allowed on radius to preserve strict ordering
            let radius = innerRadius + t * radiusRange;
            radius = Math.max(innerRadius, Math.min(outerRadius, radius));

            // ANGLE: organic distribution
            const shuffledIndex = shuffledIndices[index];
            let baseAngle = (2 * Math.PI * shuffledIndex) / N;
            let angle = baseAngle;

            // Convert to Cartesian (elliptical)
            let x = radius * Math.cos(angle) * horizontalStretch;
            let y = radius * Math.sin(angle) * verticalStretch;

            // Anti-collision: ONLY adjust angle, NEVER radius
            let attempts = 0;
            const maxAttempts = 50;
            const angleIncrement = Math.PI * (3 - Math.sqrt(5)); // Golden angle

            while (isOverlapping(x, y) && attempts < maxAttempts) {
                angle += angleIncrement;
                x = radius * Math.cos(angle) * horizontalStretch;
                y = radius * Math.sin(angle) * verticalStretch;
                attempts++;
            }

            // HARD CLAMP to container bounds (centered coordinates)
            // We must ensure that (x ± cardWidth/2 ± maxFloat) is within (-canvasWidth/2, canvasWidth/2)
            const halfW = canvasW / 2;
            const halfH = canvasH / 2;

            // Safe bounds for the CENTER of the node
            const safeX = halfW - (cardWidth / 2) - maxFloatAmplitude - safetyMargin;
            const safeY = halfH - (cardHeight / 2) - maxFloatAmplitude - safetyMargin;

            // Clamp
            x = Math.max(-safeX, Math.min(safeX, x));
            y = Math.max(-safeY, Math.min(safeY, y));

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

        return { positionMap: posMap, canvasWidth: canvasW, canvasHeight: canvasH };
    }, [sourceShow.id, similarShows]);

    // Animation Loop
    useEffect(() => {
        const startTime = performance.now();
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        const animate = (time: number) => {
            const elapsed = time - startTime;

            positionMap.forEach((pos, showId) => {
                const nodeEl = nodeRefs.current.get(showId);
                const lineEl = lineRefs.current.get(showId);

                if (nodeEl) {
                    // Calculate organic float movement
                    const floatX = Math.sin(elapsed * pos.floatSpeed + pos.floatOffset) * 6 +
                        Math.cos(elapsed * pos.floatSpeed * 0.5 + pos.floatPhase) * 3;

                    const floatY = Math.cos(elapsed * pos.floatSpeed + pos.floatOffset) * 6 +
                        Math.sin(elapsed * pos.floatSpeed * 0.5 + pos.floatPhase) * 3;

                    const currentX = pos.x + floatX;
                    const currentY = pos.y + floatY;

                    // Update Node Position
                    nodeEl.style.transform = `translate(-50%, -50%) translate(${currentX}px, ${currentY}px)`;

                    // Update Line Position (if exists)
                    if (lineEl) {
                        // Line ends at the center of the card
                        // pos.x/y are already relative to center, so we just add them to center coordinates
                        const lineEndX = centerX + currentX;
                        const lineEndY = centerY + currentY;

                        // Note: We only update x2/y2. x1/y1 are fixed at center.
                        lineEl.setAttribute('x2', String(lineEndX));
                        lineEl.setAttribute('y2', String(lineEndY));
                    }
                }
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [positionMap, canvasWidth, canvasHeight]);

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

        let position: React.CSSProperties = {
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: `${offset}px`,
        };

        const nodeY = pos.y;
        if (nodeY - cardHeight - offset < -canvasHeight / 2) {
            position = {
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: `${offset}px`,
            };
        }

        const nodeX = pos.x;
        if (nodeX - cardWidth / 2 < -canvasWidth / 2) {
            position = {
                ...position,
                left: '100%',
                transform: 'none',
                marginLeft: `${offset}px`,
            };
        } else if (nodeX + cardWidth / 2 > canvasWidth / 2) {
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
        <div className="similar-map-section">

            <div className="similar-map-container">
                <div className="similar-map-canvas">
                    <svg
                        key={`connections-${sourceShow.id}`}
                        className="similar-map-connections"
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
                            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style={{ stopColor: '#2bd9c6', stopOpacity: 0.5 }} />
                                <stop offset="100%" style={{ stopColor: '#2bd9c6', stopOpacity: 0.15 }} />
                            </linearGradient>
                            <filter id="connectionGlow">
                                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {similarShows.map((show) => {
                            const pos = positionMap.get(show.id);
                            if (!pos) return null;

                            const centerX = canvasWidth / 2;
                            const centerY = canvasHeight / 2;

                            // Cards are positioned with: left: 50%, top: 50%, transform: translate(base-x, base-y)
                            // This means the card's TOP-LEFT corner is at: (canvasCenter + pos.x, canvasCenter + pos.y)
                            // BUT our pos.x/pos.y are calculated as offsets from the center.
                            // And the transform `translate(-50%, -50%)` centers the card on that point.
                            // So the visual center of the card IS exactly at (centerX + pos.x, centerY + pos.y).
                            const nodeX = centerX + pos.x;
                            const nodeY = centerY + pos.y;

                            return (
                                <line
                                    key={`line-${sourceShow.id}-${show.id}`}
                                    ref={(el) => {
                                        if (el) lineRefs.current.set(show.id, el);
                                        else lineRefs.current.delete(show.id);
                                    }}
                                    x1={centerX}
                                    y1={centerY}
                                    x2={nodeX}
                                    y2={nodeY}
                                    stroke="url(#connectionGradient)"
                                    strokeWidth="1.5"
                                    opacity="0.3"
                                    filter="url(#connectionGlow)"
                                    className="connection-line"
                                />
                            );
                        })}

                        <circle
                            cx={canvasWidth / 2}
                            cy={canvasHeight / 2}
                            r="60"
                            fill="url(#connectionGradient)"
                            opacity="0.08"
                            filter="url(#connectionGlow)"
                        />
                    </svg>

                    {/* Center node */}
                    <div
                        className="similar-map-node similar-map-node-center"
                        style={{
                            width: '100px',
                            height: '150px',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                        }}
                        onClick={() => onShowClick(sourceShow.id)}
                    >
                        <div className="similar-map-node-poster">
                            <img
                                src={`https://image.tmdb.org/t/p/w200${sourceShow.poster_path}`}
                                alt={getDisplayName(sourceShow)}
                            />
                        </div>
                    </div>

                    {/* Similar nodes */}
                    {similarShows.map((show) => {
                        const pos = positionMap.get(show.id);
                        if (!pos) return null;

                        const displayName = getDisplayName(show);
                        const year = getYear(show);
                        const hoverCardStyle = hoveredShowId === show.id ? getHoverCardPosition(pos) : {};

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
                                    left: '50%',
                                    top: '50%',
                                    // Initial transform, will be overridden by animation loop
                                    transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
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
        </div>
    );
};

export default SimilarMap;
