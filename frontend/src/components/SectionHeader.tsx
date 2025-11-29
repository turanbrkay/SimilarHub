import React from 'react';
import '../styles/Dashboard.css';

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

    const displayLabel = getDynamicLabel();
    // Removed isGenreSection logic to enforce consistent left alignment for all labels

    return (
        <div className="section-header-hero">
            <div className="section-header-background">
                {backgroundText}
            </div>
            <div className="section-header-foreground">
                {displayLabel && <p className="section-header-label">{displayLabel}</p>}
                <h2 className="section-header-title">{title}</h2>
            </div>
        </div>
    );
};

export default SectionHeader;
