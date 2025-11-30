import React from 'react';
import '../styles/Dashboard.css';
import '../styles/RankedGrid.css';

interface SectionHeaderProps {
    backgroundText: string;
    label?: string;
    title: string;
    contentType?: 'movies' | 'tvshows' | 'books';
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ backgroundText, label, title, contentType }) => {
    // Generate dynamic label for genre sections
    const getDynamicLabel = (): string | undefined => {
        if (label) return label; // Use explicit label if provided (e.g., "BUZZ")

        // For genre sections, show content type
        if (contentType === 'movies') return 'MOVIES';
        if (contentType === 'tvshows') return 'TV SHOWS';
        if (contentType === 'books') return 'BOOKS';

        return undefined;
    };

    const displayLabel = getDynamicLabel() || title;

    return (
        <div className="ranked-grid-header" style={{ marginBottom: '-3.5rem', paddingLeft: '2rem' }}>
            <div className="ranked-grid-bg-text">{backgroundText}</div>
            <div className="ranked-grid-title" style={{ left: '2rem', top: '2.5rem' }}>
                <span>{displayLabel}</span>
            </div>
        </div>
    );
};

export default SectionHeader;
