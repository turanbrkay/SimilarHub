import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HorizontalRow from '../components/HorizontalRow';
import RankedGrid from '../components/RankedGrid';
import CategoryStrip from '../components/CategoryStrip';
import {
    getPopularBooks,
    getByGenre,
    type Show
} from '../services/api';
import '../styles/Dashboard.css';

const Books: React.FC = () => {
    const navigate = useNavigate();

    const [popularBooks, setPopularBooks] = useState<Show[]>([]);
    const [sciFi, setSciFi] = useState<Show[]>([]);
    const [comedy, setComedy] = useState<Show[]>([]);
    const [drama, setDrama] = useState<Show[]>([]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const [books, sci, com, dra] = await Promise.all([
                    getPopularBooks(),
                    getByGenre('Science Fiction'),
                    getByGenre('Comedy'),
                    getByGenre('Drama')
                ]);

                setPopularBooks(books);
                setSciFi(sci);
                setComedy(com);
                setDrama(dra);
            } catch (err) {
                console.error('Error loading book categories', err);
            }
        };
        loadCategories();
    }, []);

    const handleShowClick = (showId: number) => {
        navigate(`/details/${showId}`);
    };

    return (
        <main className="dashboard-main">
            <div className="dashboard-container-netflix category-view">
                <div className="page-content-width" style={{ paddingTop: '80px' }}>
                    <HorizontalRow
                        title=""
                        backgroundText="WEEKLY"
                        shows={popularBooks}
                        onShowClick={handleShowClick}
                        contentType="books"
                    />
                </div>

                <div className="page-content-width">
                    <RankedGrid
                        onShowClick={handleShowClick}
                    />
                </div>

                <div className="page-content-width">
                    <CategoryStrip
                        categories={[
                            { name: 'Sci-Fi', shows: sciFi },
                            { name: 'Comedy', shows: comedy },
                            { name: 'Drama', shows: drama },
                            { name: 'Fiction', shows: popularBooks },
                            { name: 'More', onClick: () => { } }
                        ]}
                    />
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title=""
                        backgroundText="SCI-FI"
                        shows={sciFi}
                        onShowClick={handleShowClick}
                        contentType="books"
                    />
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title=""
                        backgroundText="COMEDY"
                        shows={comedy}
                        onShowClick={handleShowClick}
                        contentType="books"
                    />
                </div>

                <div className="page-content-width">
                    <HorizontalRow
                        title=""
                        backgroundText="DRAMA"
                        shows={drama}
                        onShowClick={handleShowClick}
                        contentType="books"
                    />
                </div>
            </div>
        </main>
    );
};

export default Books;
