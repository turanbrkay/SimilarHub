import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SimilarShows from '../components/SimilarShows';

const Details: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    if (!id) return null;

    const showId = parseInt(id, 10);

    const handleShowClick = (newId: number) => {
        navigate(`/details/${newId}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div>
            <SimilarShows
                showId={showId}
                onBack={() => navigate(-1)}
                onShowClick={handleShowClick}
            />
        </div>
    );
};

export default Details;
