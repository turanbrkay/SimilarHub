import React, { useState, useEffect } from 'react';
import MostLovedHeader from './MostLovedHeader';
import HorizontalRow from './HorizontalRow';
import { getPopularMovies, getPopularShows, type Show } from '../services/api';

interface MostLovedSectionProps {
    onShowClick: (showId: number) => void;
    contentType: 'movies' | 'tvshows';
}

const MostLovedSection: React.FC<MostLovedSectionProps> = ({ onShowClick, contentType }) => {
    const [selectedPlatform, setSelectedPlatform] = useState<string>('Netflix');
    const [shows, setShows] = useState<Show[]>([]);

    useEffect(() => {
        const fetchMostLoved = async () => {
            try {
                // Backend henüz hazır olmadığı için mevcut API'leri kullanıyoruz
                const data = contentType === 'movies'
                    ? await getPopularMovies()
                    : await getPopularShows();
                setShows(data);
            } catch (error) {
                console.error('Error fetching most-loved content:', error);
                setShows([]);
            }
        };

        fetchMostLoved();
    }, [selectedPlatform, contentType]);

    const handlePlatformChange = (platform: string) => {
        setSelectedPlatform(platform);
    };

    return (
        <div>
            <MostLovedHeader
                selectedPlatform={selectedPlatform}
                onPlatformChange={handlePlatformChange}
                contentType={contentType}
            />
            <div style={{ marginTop: '2rem' }}>
                <HorizontalRow
                    title=""
                    shows={shows}
                    onShowClick={onShowClick}
                    contentType={contentType}
                    customHeader={<></>}
                />
            </div>
        </div>
    );
};

export default MostLovedSection;
