<div className="wrap-head">
    {/* Left Head - Logo & Navigation */}
    <div className="l-head">
        <div
            id="head-nav-btn"
            onClick={() => setShowMobileNav(!showMobileNav)}
        >
            <span className="material-icons">menu</span>
        </div>

        <div className="head-logo">
            <Link to="/home">
                <img
                    src="/assets/img/logo.png"
                    alt="SimilarHub Logo"
                />
            </Link>
        </div>
    </div>

    <nav id="head-nav" className={showMobileNav ? 'show' : ''}>
        <ul>
            <li>
                <NavLink
                    to="/home"
                    className={({ isActive }) =>
                        isActive ? 'nav-link active' : 'nav-link'
                    }
                >
                    HOME
                </NavLink>
            </li>
            <li>
                <NavLink
                    to="/movies"
                    className={({ isActive }) =>
                        isActive ? 'nav-link active' : 'nav-link'
                    }
                >
                    MOVIES
                </NavLink>
            </li>
            <li>
                <NavLink
                    to="/tv-shows"
                    className={({ isActive }) =>
                        isActive ? 'nav-link active' : 'nav-link'
                    }
                >
                    TV SHOWS
                </NavLink>
            </li>
            <li>
                <NavLink
                    to="/books"
                    className={({ isActive }) =>
                        isActive ? 'nav-link active' : 'nav-link'
                    }
                >
                    BOOKS
                </NavLink>
            </li>
        </ul>
    </nav>

    {/* Right Head - Search & User */}
    <div className="r-head">
        <Search onSearchSelect={onSearchSelect || (() => { })} />
    </div>
</div>
                                        </div >
                                    </header >
                                    );
};

export default Navbar;
