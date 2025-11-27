import { useState } from 'react';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';

function DashboardPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    return (
        <>
            {isLoggedIn ? (
                <Dashboard onLogout={() => setIsLoggedIn(false)} />
            ) : (
                <Login onLogin={() => setIsLoggedIn(true)} />
            )}
        </>
    );
}

export default DashboardPage;
