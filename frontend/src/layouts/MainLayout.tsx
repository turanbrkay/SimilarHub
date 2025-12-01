import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/AtmosphericBackground.css';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [pathname]);

    return null;
};

const MainLayout: React.FC = () => {
    const location = useLocation();
    const isDetailPage = location.pathname.startsWith('/details/');

    return (
        <div className="atmospheric-bg-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <ScrollToTop />
            <Navbar />
            <div style={{ flex: 1 }}>
                <Outlet />
            </div>
            {!isDetailPage && <Footer />}
        </div>
    );
};

export default MainLayout;
