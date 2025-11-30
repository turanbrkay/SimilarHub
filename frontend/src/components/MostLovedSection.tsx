import React, { useState, useEffect } from 'react';
import MostLovedHeader from './MostLovedHeader';
import HorizontalRow from './HorizontalRow';
import { getPopularMovies, getPopularShows, type Show } from '../services/api';

interface MostLovedSectionProps {
    onShowClick: (showId: number) => void;
}

const MostLovedSection: React.FC<MostLovedSectionProps> = ({ onShowClick }) => {
    const [selectedPlatform, setSelectedPlatform] = useState<string>('Netflix');
    const [selectedType, setSelectedType] = useState<'Movies' | 'Series'>('Movies');
    const [shows, setShows] = useState<Show[]>([]);

    useEffect(() => {
        const fetchMostLoved = async () => {
            try {
                // Backend henüz hazır olmadığı için mevcut API'leri kullanıyoruz
                // Type'a göre Movies veya Series getir
                const data = selectedType === 'Movies'
                    ? await getPopularMovies()
                    : await getPopularShows();
                setShows(data);
            } catch (error) {
                console.error('Error fetching most-loved content:', error);
                setShows([]);
            }
        };

        fetchMostLoved();
    }, [selectedPlatform, selectedType]);

    const handlePlatformChange = (platform: string) => {
        setSelectedPlatform(platform);
    };

    const handleTypeChange = (type: 'Movies' | 'Series') => {
        setSelectedType(type);
    };

    return (
        <div>
            <MostLovedHeader
                selectedPlatform={selectedPlatform}
                selectedType={selectedType}
                onPlatformChange={handlePlatformChange}
                onTypeChange={handleTypeChange}
            />
            <HorizontalRow
                title=""
                shows={shows}
                onShowClick={onShowClick}
                contentType={selectedType === 'Movies' ? 'movies' : 'tvshows'}
                customHeader={<></>}
            />
        </div>
    );
};

export default MostLovedSection;
