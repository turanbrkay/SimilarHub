import React, { useState, useRef, useEffect } from 'react';
import '../styles/MostLovedHeader.css';

interface MostLovedHeaderProps {
    selectedPlatform: string;
    onPlatformChange: (platform: string) => void;
}

const PLATFORM_LOGOS: Record<string, string> = {
    'Netflix': 'https://image.tmdb.org/t/p/w300_filter(negate,000,000)/tyHnxjQJLH6h4iDQKhN5iqebWmX.png',
    'Prime': 'https://image.tmdb.org/t/p/w300_filter(negate,000,000)/ifhbNuuVnlwYy5oXA5VIb2YR8AZ.png',
    'Max': 'https://image.tmdb.org/t/p/w300_filter(negate,000,000)/rAb4M1LjGpWASxpk6Va791A7Nkw.png',
    'Disney+': 'https://image.tmdb.org/t/p/w300_filter(negate,000,000)/1edZOYAfoyZyZ3rklNSiUpXX30Q.png',
    'Apple TV+': 'https://image.tmdb.org/t/p/w300_filter(negate,000,666)/4KAy34EHvRM25Ih8wb82AuGU7zJ.png',
    'Paramount+': 'https://image.tmdb.org/t/p/w300_filter(negate,000,000)/fi83B1oztoS47xxcemFdPMhIzK.png'
};

const PLATFORMS = ['Netflix', 'Prime', 'Max', 'Disney+', 'Apple TV+', 'Paramount+'];

const MostLovedHeader: React.FC<MostLovedHeaderProps> = ({
    selectedPlatform,
    onPlatformChange
}) => {
    const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);

    const platformDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                platformDropdownRef.current &&
                !platformDropdownRef.current.contains(event.target as Node)
            ) {
                setIsPlatformDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handlePlatformSelect = (platform: string) => {
        onPlatformChange(platform);
        setIsPlatformDropdownOpen(false);
    };

    return (
        <div className="most-loved-header-container">
            {/* Left Section: Text and Logo */}
            <div className="most-loved-left-section">
                {/* Background "WATCH" Text */}
                <div className="most-loved-background">watch</div>

                {/* Foreground Text with Glow Effects */}
                <div className="most-loved-foreground">
                    <div className="most-loved-text-container">
                        <p className="most-loved-line1">
                            Most-<span className="most-loved-text-glow">Loved</span>
                        </p>
                        <p className="most-loved-line2">
                            <span className="most-loved-text-glow">Movies</span> ON
                        </p>
                    </div>

                    {/* Platform Logo */}
                    {PLATFORM_LOGOS[selectedPlatform] && (
                        <img
                            src={PLATFORM_LOGOS[selectedPlatform]}
                            alt={`${selectedPlatform} logo`}
                            className="most-loved-platform-logo"
                        />
                    )}
                </div>
            </div>

            {/* Platform Dropdown (single dropdown on the right) */}
            <div className="most-loved-dropdowns">
                <div className="most-loved-dropdown" ref={platformDropdownRef}>
                    <button
                        className="most-loved-dropdown-button"
                        onClick={() => setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}
                    >
                        {selectedPlatform}
                        <svg
                            className={`most-loved-dropdown-arrow ${isPlatformDropdownOpen ? 'open' : ''}`}
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>

                    {isPlatformDropdownOpen && (
                        <div className="most-loved-dropdown-menu">
                            {PLATFORMS.map((platform) => (
                                <button
                                    key={platform}
                                    className={`most-loved-dropdown-item ${
                                        selectedPlatform === platform ? 'active' : ''
                                    }`}
                                    onClick={() => handlePlatformSelect(platform)}
                                >
                                    {platform}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MostLovedHeader;
