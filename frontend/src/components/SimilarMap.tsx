import React, { useMemo } from 'react';
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
}

const SimilarMap: React.FC<SimilarMapProps> = ({ sourceShow, similarShows, onShowClick }) => {
    // Calculate node positions using polar coordinates
    const nodePositions = useMemo(() => {
        const positions: NodePosition[] = [];
        const goldenAngle = 137.5; // Golden angle for better distribution

        similarShows.forEach((show, index) => {
            const similarity = show.similarity_percent || 50;

            // Base radius + distance based on similarity (less similar = farther away)
            const baseRadius = 150;
            const radiusScale = 3;
            const radius = baseRadius + (100 - similarity) * radiusScale;

            // Angle using golden angle
            const angle = (index * goldenAngle) * (Math.PI / 180);

            // Calculate position
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            // Small random offsets for floating animation (5-8px range)
            const floatX = (Math.random() * 6 + 2) * (Math.random() > 0.5 ? 1 : -1);
            const floatY = (Math.random() * 6 + 2) * (Math.random() > 0.5 ? 1 : -1);

            positions.push({ x, y, floatX, floatY });
        });

        return positions;
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

    return (
        <div className="similar-map-section">
            <h2 className="similar-map-title">Visual Similarity Network</h2>

            <div className="similar-map-container">
                <div className="similar-map-canvas">
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
                                    ['--node-index' as any]: index,
                                    animationDelay: `${index * 0.15}s`,
                                }}
                                onClick={() => onShowClick(show.id)}
                            >
                                <div className="similar-map-node-poster">
                                    <img
                                        src={`https://image.tmdb.org/t/p/w200${show.poster_path}`}
                                        alt={displayName}
                                    />
                                </div>

                                {/* Hover card */}
                                <div className="similar-map-hover-card">
                                    <div className="similar-map-hover-card-poster">
                                        <img
                                            src={`https://image.tmdb.org/t/p/w300${show.poster_path}`}
                                            alt={displayName}
                                        />
                                    </div>
                                    <div className="similar-map-hover-card-info">
                                        <h3>{displayName}</h3>
                                        {year && <p style={{ marginBottom: '0.25rem' }}>{year}</p>}
                                        {show.overview && (
                                            <p>{show.overview}</p>
                                        )}
                                        <span className="similar-map-hover-card-similarity">
                                            {show.similarity_percent}% Match
                                        </span>
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
