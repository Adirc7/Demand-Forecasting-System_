import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Navbar.css';

const LINKS = [
    { to: '/dashboard', label: 'Dashboard', match: '/dashboard', show: () => true },
    { to: '/inventory', label: 'Inventory', match: '/inventory', show: (u) => u?.isAdmin || u?.role === 'inventory_manager' },
    { to: '/forecasts', label: 'Forecasts', match: '/forecasts', show: (u) => u?.isAdmin || u?.role === 'forecast_manager' },
    { to: '/sales', label: 'Sales', match: '/sales', show: (u) => u?.isAdmin || u?.role === 'sales_manager' },
    { to: '/products/add', label: 'Products', match: '/products', show: (u) => u?.isAdmin || u?.role === 'product_manager' },
    { to: '/reports', label: 'Reports', match: '/reports', show: (u) => u?.isAdmin || u?.role === 'report_analyst' },
    { to: '/users', label: 'Users', match: '/users', show: (u) => u?.isAdmin },
];

export default function Navbar() {
    const { logout, user } = useAuth();
    const loc = useLocation();
    const [open, setOpen] = useState(false);

    const links = LINKS.filter((l) => l.show(user));
    const initial = (user?.email || '?').charAt(0).toUpperCase();

    return (
        <nav className="topnav">
            <div className="topnav-inner">
                <Link to="/dashboard" className="brand" onClick={() => setOpen(false)}>
                    <span className="brand-mark" aria-hidden="true">D</span>
                    <span className="brand-name">Dropex<span>AI</span></span>
                </Link>

                <div className={`nav-links${open ? ' open' : ''}`}>
                    {links.map((l) => (
                        <Link
                            key={l.to}
                            to={l.to}
                            onClick={() => setOpen(false)}
                            className={`nav-link${loc.pathname.startsWith(l.match) ? ' active' : ''}`}
                        >
                            {l.label}
                        </Link>
                    ))}
                    <button onClick={logout} className="nav-link nav-logout-mobile">Log out</button>
                </div>

                <div className="nav-right">
                    <div className="nav-user" title={user?.email}>
                        <span className="avatar">{initial}</span>
                        <span className="nav-email">{user?.email}</span>
                    </div>
                    <button onClick={logout} className="logout-btn">Log out</button>
                    <button
                        className="menu-btn"
                        aria-label="Toggle menu"
                        aria-expanded={open}
                        onClick={() => setOpen((o) => !o)}
                    >
                        <span /><span /><span />
                    </button>
                </div>
            </div>
        </nav>
    );
}
