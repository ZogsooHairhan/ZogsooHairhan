import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { restaurantInfo } from '../data/restaurantInfo';
import './MenuPage.css';

const OTHER_CATEGORY = 'Бусад';

const categoryOf = (item) => item.category || OTHER_CATEGORY;

function MenuRow({ item }) {
  const isSoldOut = item.stock === 0;
  return (
    <li className={`menu-row${isSoldOut ? ' is-sold-out' : ''}`}>
      {item.image_url && <img className="menu-row-image" src={item.image_url} alt="" loading="lazy" />}
      <div className="menu-row-text">
        <span className="menu-row-name">{item.name}</span>
        {isSoldOut && <span className="menu-row-badge">Дууссан</span>}
      </div>
      <span className="menu-row-price">{item.price?.toLocaleString()} ₮</span>
    </li>
  );
}

function MenuDrawer({ isOpen, onClose, items, categories, openCategory, onToggleCategory, status }) {
  const [searchQuery, setSearchQuery] = useState('');
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  const query = searchQuery.trim().toLowerCase();
  const searchResults = items.filter(item => item.name.toLowerCase().includes(query));

  let content;
  if (status) {
    content = <p className="menu-status">{status}</p>;
  } else if (query) {
    content = searchResults.length > 0 ? (
      <ul className="menu-rows">
        {searchResults.map(item => <MenuRow key={item.id} item={item} />)}
      </ul>
    ) : (
      <p className="menu-status">Хоол олдсонгүй.</p>
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
            <span>{name}</span>
            <span className="menu-group-meta">
              {count}
              <span className={`menu-group-chevron${isExpanded ? ' is-open' : ''}`} aria-hidden="true">›</span>
            </span>
          </button>
          {isExpanded && (
            <ul className="menu-rows">
              {items.filter(item => categoryOf(item) === name).map(item => <MenuRow key={item.id} item={item} />)}
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
        className={`menu-drawer${isOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Хоолны цэс"
      >
        <div className="menu-drawer-head">
          <h2 className="menu-drawer-title">Хоолны цэс</h2>
          <button ref={closeButtonRef} type="button" className="menu-drawer-close" aria-label="Цэс хаах" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="menu-drawer-search">
          <input
            type="text"
            placeholder="🔍 Хоол хайх..."
            aria-label="Хоол хайх"
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

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const openMenu = (category = null) => {
    setOpenCategory(category);
    setIsMenuOpen(true);
  };

  const categories = [...new Set(menuItems.map(categoryOf))]
    .sort((a, b) => a.localeCompare(b, 'mn'))
    .map(name => ({ name, count: menuItems.filter(item => categoryOf(item) === name).length }));

  let menuStatus = null;
  if (isLoading) menuStatus = 'Цэс ачаалж байна...';
  else if (loadFailed) menuStatus = 'Цэс татахад алдаа гарлаа. Хуудсаа дахин ачаална уу.';
  else if (menuItems.length === 0) menuStatus = 'Цэс хоосон байна.';

  const { name, tagline, description, address, phone, hours, services, paymentNote, map, sections, gallery, links } = restaurantInfo;
  const phoneHref = `tel:${phone.replace(/\s/g, '')}`;

  const facts = [
    address && { icon: '📍', label: 'Хаяг', value: address },
    hours && { icon: '🕒', label: 'Цагийн хуваарь', value: hours },
    { icon: '🍽️', label: 'Үйлчилгээ', value: services.join(' • ') },
    { icon: '💳', label: 'Төлбөр', value: paymentNote },
    phone && { icon: '📞', label: 'Утас', value: phone, href: phoneHref },
  ].filter(Boolean);

  return (
    <div className="home-root">
      <div className="home-page" inert={isMenuOpen}>

        <header className="home-bar">
          <button
            type="button"
            className="menu-toggle"
            aria-label="Хоолны цэс нээх"
            aria-expanded={isMenuOpen}
            aria-controls="menu-drawer"
            onClick={() => openMenu()}
          >
            <span className="menu-toggle-lines" aria-hidden="true"><span /><span /><span /></span>
            <span className="menu-toggle-label">Цэс</span>
          </button>
          <span className="home-bar-brand">{name}</span>
          {phone && <a className="home-bar-phone" href={phoneHref}>📞 {phone}</a>}
        </header>

        <section className="hero">
          <div className="hero-inner">
            <p className="hero-eyebrow">{tagline}</p>
            <h1 className="hero-title">{name}</h1>
            {description && <p className="hero-lead">{description}</p>}
            <div className="hero-actions">
              <button type="button" className="hero-button is-primary" onClick={() => openMenu()}>Хоолны цэс харах</button>
              <a className="hero-button" href="#location">Байршил харах</a>
            </div>
          </div>
          <svg className="hero-ridges" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true">
            <path className="hero-ridge-back" d="M0 150 L150 80 L270 125 L430 30 L590 120 L720 70 L880 135 L1050 45 L1210 120 L1330 75 L1440 115 V220 H0 Z" />
            <path className="hero-ridge-front" d="M0 190 L210 130 L380 175 L560 115 L760 180 L960 125 L1160 180 L1320 140 L1440 170 V220 H0 Z" />
          </svg>
        </section>

        <main className="home-main">
          <section className="fact-grid" aria-label="Үндсэн мэдээлэл">
            {facts.map(({ icon, label, value, href }) => (
              <div key={label} className="fact-card">
                <span className="fact-icon" aria-hidden="true">{icon}</span>
                <span className="fact-label">{label}</span>
                {href ? <a className="fact-value" href={href}>{value}</a> : <span className="fact-value">{value}</span>}
              </div>
            ))}
          </section>

          {sections.length > 0 && (
            <section className="home-section">
              <h2 className="home-heading">Бидний тухай</h2>
              <div className="story-grid">
                {sections.map(({ title, text }) => (
                  <article key={title} className="story-card">
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {categories.length > 0 && (
            <section className="home-section">
              <h2 className="home-heading">Манай цэсэнд</h2>
              <div className="category-grid">
                {categories.map(({ name: category, count }) => (
                  <button key={category} type="button" className="category-card" onClick={() => openMenu(category)}>
                    <span className="category-card-name">{category}</span>
                    <span className="category-card-count">{count} төрөл</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {gallery.length > 0 && (
            <section className="home-section">
              <h2 className="home-heading">Зургийн цомог</h2>
              <div className="gallery-grid">
                {gallery.map(({ src, alt }) => <img key={src} src={src} alt={alt} loading="lazy" />)}
              </div>
            </section>
          )}

          <section className="home-section" id="location">
            <h2 className="home-heading">Байршил</h2>
            <div className="location-card">
              <iframe
                className="location-map"
                title={`${name} газрын зураг`}
                src={map.embedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <div className="location-info">
                <a className="location-link" href={map.link} target="_blank" rel="noreferrer">Google Maps-аас чиглэл авах →</a>
              </div>
            </div>
          </section>
        </main>

        <footer className="home-footer">
          <strong>{name}</strong>
          {phone && <a href={phoneHref}>{phone}</a>}
          {links.map(({ label, url }) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">{label}</a>
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
      />
    </div>
  );
}

export default MenuPage;
