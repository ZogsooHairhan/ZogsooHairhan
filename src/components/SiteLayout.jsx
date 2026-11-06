import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { restaurantInfo } from '../data/restaurantInfo';
import { DEFAULT_LANGUAGE, LANGUAGES, localize, uiText } from '../data/translations';
import '../pages/MenuPage.css';

const LANGUAGE_STORAGE_KEY = 'zogsoo-language';

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGES.some(({ code }) => code === saved) ? saved : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function SiteLayout() {
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [language, setLanguage] = useState(getSavedLanguage);
  const panelRef = useRef(null);
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;
        setMenuItems(data || []);
      } catch (err) {
        console.error('Цэс татахад алдаа гарлаа:', err.message);
        setLoadFailed(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Хадгалах боломжгүй хөтөч дээр сонголт зөвхөн энэ удаад хүчинтэй.
    }
  }, [language]);

  const closeNav = useCallback(() => setIsNavOpen(false), []);

  useEffect(() => {
    if (!isNavOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeNav();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isNavOpen, closeNav]);

  // Хуудас солигдоход дээрээс нь, #хэсэг рүү ороход тухайн хэсгээс нь харуулна.
  useEffect(() => {
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    } else if (navigationType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [location.key, location.hash, navigationType]);

  // Цэс ачаалагдахад хуудас уртасдаг тул #хэсэг рүүгээ дахин очно.
  useEffect(() => {
    if (!isLoading && location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    }
    // Зөвхөн ачаалал дуусах үед ажиллана.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const text = uiText[language];

  let menuStatus = null;
  if (isLoading) menuStatus = text.loading;
  else if (loadFailed) menuStatus = text.loadFailed;
  else if (menuItems.length === 0) menuStatus = text.emptyMenu;

  const { phone, links } = restaurantInfo;
  const name = localize(restaurantInfo.name, language);
  const phoneHref = `tel:${phone.replace(/\s/g, '')}`;

  const navLinks = [
    { to: '/#about', label: text.about },
    { to: '/#location', label: text.location },
    { to: '/menu', label: text.menu, isCurrent: location.pathname === '/menu' },
  ];

  return (
    <div className="home-root">
      <div className="home-rail">
        <button
          type="button"
          className={`menu-toggle${isNavOpen ? ' is-open' : ''}`}
          aria-label={isNavOpen ? text.closeMenu : text.openMenu}
          aria-expanded={isNavOpen}
          aria-controls="site-nav"
          onClick={() => setIsNavOpen(open => !open)}
        >
          <span /><span /><span />
        </button>
        <p className="home-rail-text">{localize(restaurantInfo.tagline, language)}</p>
      </div>

      <header className="home-bar">
        <Link className="home-bar-brand" to="/">{name}</Link>
        <div className="home-bar-end">
          {phone && <a className="home-bar-phone" href={phoneHref}>{phone}</a>}
          <div className="lang-switch" role="group" aria-label={text.language}>
            {LANGUAGES.map(({ code, label, name: languageName }) => (
              <button
                key={code}
                type="button"
                className="lang-button"
                aria-label={languageName}
                aria-pressed={language === code}
                onClick={() => setLanguage(code)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="home-page" inert={isNavOpen}>
        <Outlet context={{ language, text, menuItems, menuStatus }} />

        <footer className="home-footer">
          <strong>{name}</strong>
          {phone && <a href={phoneHref}>{phone}</a>}
          {links.map(({ label, url }) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">{localize(label, language)}</a>
          ))}
        </footer>
      </div>

      <div className={`nav-overlay${isNavOpen ? ' is-open' : ''}`} onClick={closeNav} aria-hidden="true" />
      <nav
        id="site-nav"
        ref={panelRef}
        className={`nav-panel${isNavOpen ? ' is-open' : ''}`}
        aria-label={text.navigation}
        tabIndex={-1}
      >
        {navLinks.map(({ to, label, isCurrent }) => (
          <Link key={to} className="nav-link" to={to} aria-current={isCurrent ? 'page' : undefined} onClick={closeNav}>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default SiteLayout;
