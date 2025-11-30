import React, { useState, useEffect } from 'react';
import MostLovedHeader from './MostLovedHeader';
import HorizontalRow from './HorizontalRow';
import { getPopularMovies, type Show } from '../services/api';

interface MostLovedSectionProps {
    onShowClick: (showId: number) => void;
}

const MostLovedSection: React.FC<MostLovedSectionProps> = ({ onShowClick }) => {
    const [selectedPlatform, setSelectedPlatform] = useState<string>('Netflix');
    const [shows, setShows] = useState<Show[]>([]);

    useEffect(() => {
        const fetchMostLoved = async () => {
            try {
                // Backend henüz hazır olmadığı için mevcut API'leri kullanıyoruz
                // Movies sayfasında olduğumuz için sadece movies getiriyoruz
                const data = await getPopularMovies();
                setShows(data);
            } catch (error) {
                console.error('Error fetching most-loved content:', error);
                setShows([]);
            }
        };

        fetchMostLoved();
    }, [selectedPlatform]);

    const handlePlatformChange = (platform: string) => {
        setSelectedPlatform(platform);
    };

    return (
        <div>
            <MostLovedHeader
                selectedPlatform={selectedPlatform}
                onPlatformChange={handlePlatformChange}
            />
            <HorizontalRow
                title=""
                shows={shows}
                onShowClick={onShowClick}
                contentType="movies"
                customHeader={<></>}
            />
        </div>
    );
};

export default MostLovedSection;
