import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ShoppingCart, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import useOrderNotifications from '../hooks/useOrderNotifications.js';
import NotificationBell from './NotificationBell.jsx';
import './PillNav.css';

const PillNav = () => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { notifications, unreadCount, markAllRead, clearNotifications } = useOrderNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const circleRefs = useRef([]);
  const tlRefs = useRef([]);
  const activeTweenRefs = useRef([]);

  const items = [
    { label: 'Home', href: '/' },
    { label: 'Menu', href: '/menu' },
    { label: 'Orders', href: '/orders' },
    { label: 'Contact', href: '/contact' },
  ];

  const ease = 'power3.out';

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle, index) => {
        if (!circle?.parentElement) return;
        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` });

        const label = pill.querySelector('.pill-label');
        const hover = pill.querySelector('.pill-label-hover');
        if (label) gsap.set(label, { y: 0 });
        if (hover) gsap.set(hover, { y: h + 12, opacity: 0 });

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });
        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0);
        if (label) tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: 'auto' }, 0);
        if (hover) {
          gsap.set(hover, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(hover, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0);
        }
        tlRefs.current[index] = tl;
      });
    };

    layout();
    window.addEventListener('resize', layout);
    if (document.fonts?.ready) document.fonts.ready.then(layout).catch(() => { });
    return () => window.removeEventListener('resize', layout);
  }, []);

  const handleEnter = (i) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), { duration: 0.3, ease, overwrite: 'auto' });
  };

  const handleLeave = (i) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, { duration: 0.2, ease, overwrite: 'auto' });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="pill-nav-wrapper">
      {/* Left - Logo */}
      <Link to="/" className="pill-nav-logo">
        <span className="pill-nav-logo-text">Aki<span className="pill-nav-logo-accent">o</span></span>
      </Link>

      {/* Center - Pill navigation */}
      <div className="pill-bar">
        <ul className="pill-list" role="menubar">
          {items.map((item, i) => (
            <li key={item.href} role="none">
              <Link
                role="menuitem"
                to={item.href}
                className={`pill${location.pathname === item.href ? ' is-active' : ''}`}
                onMouseEnter={() => handleEnter(i)}
                onMouseLeave={() => handleLeave(i)}
              >
                <span
                  className="hover-circle"
                  aria-hidden="true"
                  ref={el => { circleRefs.current[i] = el; }}
                />
                <span className="label-stack">
                  <span className="pill-label">{item.label}</span>
                  <span className="pill-label-hover" aria-hidden="true">{item.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Right - Action buttons */}
      <div className="pill-nav-actions">
        {user ? (
          <>
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              markAllRead={markAllRead}
              clearNotifications={clearNotifications}
            />
            <Link to="/cart" className="pill-action-btn" aria-label="Cart">
              <ShoppingCart size={18} />
              {itemCount > 0 && <span className="pill-action-badge">{itemCount}</span>}
            </Link>
            <Link to="/profile" className="pill-action-btn" aria-label="Profile">
              <User size={18} />
            </Link>
            <button onClick={handleLogout} className="pill-action-btn" aria-label="Logout">
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <Link to="/login" className="pill-login-btn">
            Login
          </Link>
        )}
      </div>
    </div>
  );
};

export default PillNav;
