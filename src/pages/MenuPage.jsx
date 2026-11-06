import { useEffect, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { groupByCategory } from '../data/menuCategories';
import { translateMenuText } from '../data/translations';

function Dish({ item, language, text }) {
  const isSoldOut = item.stock === 0;
  const [firstWord, ...otherWords] = translateMenuText(item.name, language).trim().split(/\s+/);

  return (
    <li className={`dish${isSoldOut ? ' is-sold-out' : ''}`}>
      <p className="dish-name"><strong>{firstWord}</strong> {otherWords.join(' ')}</p>
      <p className="dish-price">{item.price?.toLocaleString()} ₮</p>
      {isSoldOut && <p className="dish-badge">{text.soldOut}</p>}
    </li>
  );
}

function MenuPage() {
  const { language, text, menuItems, menuStatus } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const activeRowRef = useRef(null);

  const groups = groupByCategory(menuItems);
  const requestedCategory = searchParams.get('category');
  const activeCategory = groups.some(({ name }) => name === requestedCategory) ? requestedCategory : null;

  // Дэлгэсэн ангиллын мөр дээд мөрийн яг доор ирнэ.
  useEffect(() => {
    if (activeCategory) activeRowRef.current?.scrollIntoView();
  }, [activeCategory]);

  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (item) => (
    item.name.toLowerCase().includes(query)
    || translateMenuText(item.name, language).toLowerCase().includes(query)
  );

  const visibleGroups = groups
    .map(({ name, items }) => ({ name, items: items.filter(matchesSearch) }))
    .filter(({ items }) => items.length > 0);

  const toggleCategory = (name) => {
    setSearchParams(name === activeCategory ? {} : { category: name }, { replace: true, state: { keepScroll: true } });
  };

  return (
    <div className="food-page">
      <header className="food-head">
        <h1 className="home-heading food-title">{text.menu}</h1>
        <input
          className="food-search"
          type="text"
          placeholder={text.search}
          aria-label={text.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </header>

      {menuStatus && <p className="menu-status">{menuStatus}</p>}
      {!menuStatus && visibleGroups.length === 0 && <p className="menu-status">{text.noResults}</p>}

      {!menuStatus && visibleGroups.length > 0 && (
        <div className="menu-accordion">
          {visibleGroups.map(({ name, items }, index) => {
            const isActive = name === activeCategory;
            const isExpanded = isActive || Boolean(query);
            const panelId = `menu-category-${index}`;
            return (
              <section key={name} ref={isActive ? activeRowRef : null} className="menu-category">
                <h2 className="menu-category-heading">
                  <button
                    type="button"
                    className="menu-category-toggle"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => toggleCategory(name)}
                  >
                    <span className="menu-category-name">{translateMenuText(name, language)}</span>
                    <span className="menu-category-icon" aria-hidden="true" />
                  </button>
                </h2>
                {isExpanded && (
                  <ul id={panelId} className="menu-dishes">
                    {items.map(item => <Dish key={item.id} item={item} language={language} text={text} />)}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MenuPage;
