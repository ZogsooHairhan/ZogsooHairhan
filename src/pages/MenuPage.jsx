import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { restaurantInfo } from '../data/restaurantInfo';
import { DEFAULT_LANGUAGE, LANGUAGES, localize, translateMenuText, uiText } from '../data/translations';
import './MenuPage.css';

const LANGUAGE_STORAGE_KEY = 'zogsoo-language';
const OTHER_CATEGORY = 'Бусад';

const categoryOf = (item) => item.category || OTHER_CATEGORY;

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGES.some(({ code }) => code === saved) ? saved : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function MenuRow({ item, language }) {
  const isSoldOut = item.stock === 0;
  return (
    <li className={`menu-row${isSoldOut ? ' is-sold-out' : ''}`}>
      {item.image_url && <img className="menu-row-image" src={item.image_url} alt="" loading="lazy" />}
      <div className="menu-row-text">
        <span className="menu-row-name">{translateMenuText(item.name, language)}</span>
        {isSoldOut && <span className="menu-row-badge">{uiText[language].soldOut}</span>}
      </div>
      <span className="menu-row-price">{item.price?.toLocaleString()} ₮</span>
    </li>
  );
}

function MenuDrawer({ isOpen, onClose, items, categories, openCategory, onToggleCategory, status, language }) {
  const [searchQuery, setSearchQuery] = useState('');
  const panelRef = useRef(null);
  const text = uiText[language];

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  const query = searchQuery.trim().toLowerCase();
  const searchResults = items.filter(item => (
    item.name.toLowerCase().includes(query)
    || translateMenuText(item.name, language).toLowerCase().includes(query)
  ));

  let content;
  if (status) {
    content = <p className="menu-status">{status}</p>;
  } else if (query) {
    content = searchResults.length > 0 ? (
      <ul className="menu-rows">
        {searchResults.map(item => <MenuRow key={item.id} item={item} language={language} />)}
      </ul>
    ) : (
      <p className="menu-status">{text.noResults}</p>
    );
  } else {
    content = categories.map(({ name, count }) => {
      const isExpanded = openCategory === name;
      return (
        <section key={name} className="menu-group">
          <button
            type="button"
            className="menu-group-toggle"
            aria-expanded={isExpanded}
            onClick={() => onToggleCategory(name)}
          >
            <span className="menu-group-name">{translateMenuText(name, language)}</span>
            <span className="menu-group-count">{count}</span>
          </button>
          {isExpanded && (
            <ul className="menu-rows">
              {items.filter(item => categoryOf(item) === name).map(item => (
                <MenuRow key={item.id} item={item} language={language} />
              ))}
            </ul>
          )}
        </section>
      );
    });
  }

  return (
    <>
      <div className={`menu-overlay${isOpen ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        id="menu-drawer"
        ref={panelRef}
        className={`menu-drawer${isOpen ? ' is-open' : ''}`}
        aria-label={text.menu}
        tabIndex={-1}
      >
        <div className="menu-drawer-search">
          <input
            type="text"
            placeholder={text.search}
            aria-label={text.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="menu-drawer-body">{content}</div>
      </aside>
    </>
  );
}

function MenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState(null);
  const [language, setLanguage] = useState(getSavedLanguage);

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

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const openMenu = (category = null) => {
    setOpenCategory(category);
    setIsMenuOpen(true);
  };

  // Олон хоолонд давхар тавигдсан зураг нь түр зураг байдаг тул ангиллын картад хэрэглэхгүй.
  const imageUses = new Map();
  menuItems.forEach(({ image_url: url }) => {
    if (url) imageUses.set(url, (imageUses.get(url) || 0) + 1);
  });

  const categories = [...new Set(menuItems.map(categoryOf))]
    .sort((a, b) => a.localeCompare(b, 'mn'))
    .map(name => {
      const categoryItems = menuItems.filter(item => categoryOf(item) === name);
      return {
        name,
        count: categoryItems.length,
        image: categoryItems.find(item => imageUses.get(item.image_url) === 1)?.image_url,
      };
    });

  const text = uiText[language];

  let menuStatus = null;
  if (isLoading) menuStatus = text.loading;
  else if (loadFailed) menuStatus = text.loadFailed;
  else if (menuItems.length === 0) menuStatus = text.emptyMenu;

  const { phone, map, sections, gallery, links } = restaurantInfo;
  const name = localize(restaurantInfo.name, language);
  const tagline = localize(restaurantInfo.tagline, language);
  const description = localize(restaurantInfo.description, language);
  const address = localize(restaurantInfo.address, language);
  const hours = localize(restaurantInfo.hours, language);
  const phoneHref = `tel:${phone.replace(/\s/g, '')}`;
  const mapUrl = map.embedUrl.replaceAll('!1smn!2smn', `!1s${language}!2smn`);

  const facts = [
    address && { label: text.address, value: address },
    hours && { label: text.hours, value: hours },
    { label: text.services, value: restaurantInfo.services.map(service => localize(service, language)).join(' • ') },
    { label: text.payment, value: localize(restaurantInfo.paymentNote, language) },
    phone && { label: text.phone, value: phone, href: phoneHref },
  ].filter(Boolean);

  return (
    <div className="home-root">
      <div className="home-rail">
        <button
          type="button"
          className={`menu-toggle${isMenuOpen ? ' is-open' : ''}`}
          aria-label={isMenuOpen ? text.closeMenu : text.openMenu}
          aria-expanded={isMenuOpen}
          aria-controls="menu-drawer"
          onClick={() => (isMenuOpen ? closeMenu() : openMenu())}
        >
          <span /><span /><span />
        </button>
        <p className="home-rail-text">{tagline}</p>
      </div>

      <header className="home-bar">
        <span className="home-bar-brand">{name}</span>
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

      <div className="home-page" inert={isMenuOpen}>
        <section className="hero">
          <svg className="hero-ridge" viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 240 L170 130 L300 195 L480 40 L650 180 L790 105 L960 210 L1130 70 L1290 175 L1440 110" />
            <path d="M0 285 L220 205 L400 260 L600 180 L810 265 L1010 190 L1220 262 L1440 200" />
          </svg>
          <div className="hero-inner">
            <h1 className="hero-title">{name}</h1>
            {description && <p className="hero-lead">{description}</p>}
            <div className="hero-actions">
              <button type="button" className="hero-button is-primary" onClick={() => openMenu()}>{text.menu}</button>
              <a className="hero-button" href="#location">{text.location}</a>
            </div>
          </div>
        </section>

        <section className="fact-grid" aria-label={text.keyInfo}>
          {facts.map(({ label, value, href }) => (
            <div key={label} className="fact-card">
              <span className="fact-label">{label}</span>
              {href ? <a className="fact-value" href={href}>{value}</a> : <span className="fact-value">{value}</span>}
            </div>
          ))}
        </section>

        {sections.length > 0 && (
          <section className="home-section">
            <h2 className="home-heading">{text.about}</h2>
            <div className="story-grid">
              {sections.map(({ title, text: body }) => (
                <article key={localize(title, DEFAULT_LANGUAGE)} className="story-card">
                  <h3>{localize(title, language)}</h3>
                  <p>{localize(body, language)}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {categories.length > 0 && (
          <section className="home-section">
            <h2 className="home-heading">{text.ourMenu}</h2>
            <div className="category-grid">
              {categories.map(({ name: category, count, image }) => (
                <button key={category} type="button" className="category-card" onClick={() => openMenu(category)}>
                  <span className="category-card-image">
                    {image && <img src={image} alt="" loading="lazy" />}
                  </span>
                  <span className="category-card-name">{translateMenuText(category, language)}</span>
                  <span className="category-card-count">{text.itemCount(count)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="home-section">
            <h2 className="home-heading">{text.gallery}</h2>
            <div className="gallery-grid">
              {gallery.map(({ src, alt }) => <img key={src} src={src} alt={localize(alt, language)} loading="lazy" />)}
            </div>
          </section>
        )}

        <section className="home-section" id="location">
          <h2 className="home-heading">{text.location}</h2>
          <iframe
            className="location-map"
            title={`${name}: ${text.mapTitle}`}
            src={mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <a className="location-link" href={map.link} target="_blank" rel="noreferrer">{text.directions}</a>
        </section>

        <footer className="home-footer">
          <strong>{name}</strong>
          {phone && <a href={phoneHref}>{phone}</a>}
          {links.map(({ label, url }) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">{localize(label, language)}</a>
          ))}
        </footer>
      </div>

      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={closeMenu}
        items={menuItems}
        categories={categories}
        openCategory={openCategory}
        onToggleCategory={(category) => setOpenCategory(current => (current === category ? null : category))}
        status={menuStatus}
        language={language}
      />
    </div>
  );
}

export default MenuPage;
