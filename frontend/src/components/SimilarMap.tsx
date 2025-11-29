import React, { useMemo, useState } from 'react';
import type { Show } from '../services/api';

interface SimilarMapProps {
    sourceShow: Show;
    similarShows: Show[];
    onShowClick: (showId: number) => void;
}

interface NodePosition {
    x: number;
    y: number;
    floatX: number;
    floatY: number;
    angle: number;
    radius: number;
}

const SimilarMap: React.FC<SimilarMapProps> = ({ sourceShow, similarShows, onShowClick }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Calculate node positions with STRICT rank-based radius and hard clamping
    const { nodePositions, canvasWidth, canvasHeight } = useMemo(() => {
        // Container dimensions (matching CSS)
        const containerWidth = 1400;
        const containerHeight = 700;
        const padding = 40;
        const canvasW = containerWidth - padding;
        const canvasH = containerHeight - padding;

        // Node dimensions
        const cardWidth = 60;
        const cardHeight = 90;
        const centerNodeWidth = 100;
        const centerNodeHeight = 150;
        const floatOffsetMaxX = 4;
        const floatOffsetMaxY = 4;

        // HARD CLAMPING BOUNDS (accounting for card size and animation)
        const paddingX = cardWidth * 0.25;
        const paddingY = cardHeight * 0.25;
        const minX = paddingX + floatOffsetMaxX;
        const maxX = canvasW - paddingX - cardWidth - floatOffsetMaxX;
        const minY = paddingY + floatOffsetMaxY;
        const maxY = canvasH - paddingY - cardHeight - floatOffsetMaxY;

        // Container size for radius calculations
        const baseSize = Math.min(canvasW, canvasH);

        // Ellipse stretch factors
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
        const jitterAmount = radiusRange * 0.03; // 3% jitter max

        // STEP 1: SORT by similarity (descending: highest first)
        const sortedShows = similarShows.slice().sort((a, b) =>
            (b.similarity_percent || 50) - (a.similarity_percent || 50)
        );

        const N = sortedShows.length;
        const positions: NodePosition[] = [];

        // Minimum distance for anti-collision
        const minNodeDistance = nodeDiagonal * 1.25;

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
            const sim = show.similarity_percent || 50;

            // Rank-based t: 0 for most similar (index 0), 1 for least similar (index N-1)
            const t = N > 1 ? index / (N - 1) : 0;

            // Base radius from rank (STRICT: higher rank = larger radius)
            const baseRadius = innerRadius + t * radiusRange;

            // Tiny jitter (±3%), but clamped to preserve ordering
            const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
            const minRadiusForIndex = baseRadius - jitterAmount;
            const maxRadiusForIndex = baseRadius + jitterAmount;
            let radius = Math.min(Math.max(baseRadius + jitter, minRadiusForIndex), maxRadiusForIndex);
            radius = Math.max(innerRadius, Math.min(outerRadius, radius));

            // ANGLE: organic distribution
            const shuffledIndex = shuffledIndices[index];
            let baseAngle = (2 * Math.PI * shuffledIndex) / N;
            let angleJitter = (Math.random() - 0.5) * (Math.PI / 2.5);
            let angle = baseAngle + angleJitter;

            // Convert to Cartesian (elliptical)
            let x = radius * Math.cos(angle) * horizontalStretch;
            let y = radius * Math.sin(angle) * verticalStretch;

            // Anti-collision
            let attempts = 0;
            const maxAttempts = 25;
            while (isOverlapping(x, y) && attempts < maxAttempts) {
                if (attempts < 15) {
                    angle += (Math.PI / 10) * (attempts % 2 === 0 ? 1 : -1);
                } else {
                    radius += 8;
                    radius = Math.min(radius, outerRadius);
                }
                x = radius * Math.cos(angle) * horizontalStretch;
                y = radius * Math.sin(angle) * verticalStretch;
                attempts++;
            }

            // HARD CLAMP to container bounds (centered coordinates)
            const halfW = canvasW / 2;
            const halfH = canvasH / 2;

            // Clamp to safe zone (accounting for animation)
            x = Math.max(minX - halfW, Math.min(maxX - halfW, x));
            y = Math.max(minY - halfH, Math.min(maxY - halfH, y));

            // Float offsets (already accounted for in clamping)
            const floatX = (Math.random() - 0.5) * (floatOffsetMaxX * 2);
            const floatY = (Math.random() - 0.5) * (floatOffsetMaxY * 2);

            positions.push({ x, y, floatX, floatY, angle, radius });

            // DEBUG LOG (first 3 items)
            if (index < 3) {
                console.log(`[SimilarMap] Index ${index}: sim=${sim}%, radius=${radius.toFixed(1)}px`);
            }
        });

        // Verify monotonic property (DEBUG)
        const radii = positions.map(p => p.radius);
        const isMonotonic = radii.every((r, i) => i === 0 || r >= radii[i - 1] - 0.1);
        console.log(`[SimilarMap] Radius monotonic: ${isMonotonic}, range: [${Math.min(...radii).toFixed(1)}, ${Math.max(...radii).toFixed(1)}]`);

        return { nodePositions: positions, canvasWidth: canvasW, canvasHeight: canvasH };
    }, [similarShows]);

    // Get display name (handle both 'title' and 'name' fields)
    const getDisplayName = (show: Show): string => {
        return show.title || show.name || 'Unknown';
    };

    // Extract year from first_air_date or use year field
    const getYear = (show: Show): string => {
        if (show.year) return String(show.year);
        if (show.first_air_date) {
            return show.first_air_date.substring(0, 4);
        }
        return '';
    };

    // Calculate hover card position to keep it inside container
    const getHoverCardPosition = (index: number) => {
        const pos = nodePositions[index];
        const cardWidth = 320;
        const cardHeight = 280;
        const offset = 15;

        // Default: position above the node
        let position: React.CSSProperties = {
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: `${offset}px`,
        };

        // Check if card would overflow top
        const nodeY = pos.y;
        if (nodeY - cardHeight - offset < -canvasHeight / 2) {
            // Place below instead
            position = {
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: `${offset}px`,
            };
        }

        // Check horizontal overflow
        const nodeX = pos.x;
        if (nodeX - cardWidth / 2 < -canvasWidth / 2) {
            // Too far left, align to right of node
            position = {
                ...position,
                left: '100%',
                transform: 'none',
                marginLeft: `${offset}px`,
            };
        } else if (nodeX + cardWidth / 2 > canvasWidth / 2) {
            // Too far right, align to left of node
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
            <h2 className="similar-map-title">Visual Similarity Network</h2>

            <div className="similar-map-container">
                <div className="similar-map-canvas">
                    {/* Connection lines from center to each node (SVG overlay, behind cards) */}
                    <svg
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
                            {/* Gradient for connection lines */}
                            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style={{ stopColor: '#2bd9c6', stopOpacity: 0.5 }} />
                                <stop offset="100%" style={{ stopColor: '#2bd9c6', stopOpacity: 0.15 }} />
                            </linearGradient>
                            {/* Soft glow filter */}
                            <filter id="connectionGlow">
                                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Lines from center (0, 0) to each node */}
                        {similarShows.map((show, index) => {
                            const pos = nodePositions[index];
                            // Center of canvas
                            const centerX = canvasWidth / 2;
                            const centerY = canvasHeight / 2;
                            // Node dimensions (from layout calculations)
                            const cardWidth = 60;
                            const cardHeight = 90;
                            // Node position + offset to geometric center of card
                            const nodeX = centerX + pos.x + (cardWidth / 2);
                            const nodeY = centerY + pos.y + (cardHeight / 2);

                            return (
                                <g
                                    key={show.id}
                                    style={{
                                        ['--float-x' as any]: `${pos.floatX}px`,
                                        ['--float-y' as any]: `${pos.floatY}px`,
                                        animation: `floatLine 4s ease-in-out infinite`,
                                        animationDelay: `${index * 0.1}s`,
                                        transformOrigin: `${centerX}px ${centerY}px`,
                                    } as React.CSSProperties}
                                >
                                    <line
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
                                </g>
                            );
                        })}

                        {/* Central glow effect */}
                        <circle
                            cx={canvasWidth / 2}
                            cy={canvasHeight / 2}
                            r="60"
                            fill="url(#connectionGradient)"
                            opacity="0.08"
                            filter="url(#connectionGlow)"
                        />
                    </svg>

                    {/* Center node (source show) */}
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
                    {similarShows.map((show, index) => {
                        const pos = nodePositions[index];
                        const displayName = getDisplayName(show);
                        const year = getYear(show);
                        const hoverCardStyle = hoveredIndex === index ? getHoverCardPosition(index) : {};

                        return (
                            <div
                                key={show.id}
                                className="similar-map-node animated"
                                style={{
                                    width: '60px',
                                    height: '90px',
                                    left: '50%',
                                    top: '50%',
                                    // CSS variables for base position and float offsets
                                    ['--base-x' as any]: `${pos.x}px`,
                                    ['--base-y' as any]: `${pos.y}px`,
                                    ['--float-x' as any]: `${pos.floatX}px`,
                                    ['--float-y' as any]: `${pos.floatY}px`,
                                    animationDelay: `${index * 0.1}s`,
                                }}
                                onClick={() => onShowClick(show.id)}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <div className="similar-map-node-poster">
                                    <img
                                        src={`https://image.tmdb.org/t/p/w200${show.poster_path}`}
                                        alt={displayName}
                                    />
                                </div>

                                {/* Hover card */}
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
