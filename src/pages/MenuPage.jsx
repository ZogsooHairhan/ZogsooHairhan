import { useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { groupByCategory } from '../data/menuCategories';
import { translateMenuText } from '../data/translations';

function FoodCard({ item, language, text }) {
  const isSoldOut = item.stock === 0;
  return (
    <article className={`food-card${isSoldOut ? ' is-sold-out' : ''}`}>
      <span className="image-tile">
        {item.image_url && <img src={item.image_url} alt="" loading="lazy" />}
      </span>
      <h3 className="food-card-name">{translateMenuText(item.name, language)}</h3>
      <p className="food-card-price">{item.price?.toLocaleString()} ₮</p>
      {isSoldOut && <span className="food-card-badge">{text.soldOut}</span>}
    </article>
  );
}

function MenuPage() {
  const { language, text, menuItems, menuStatus } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  const groups = groupByCategory(menuItems);
  const requestedCategory = searchParams.get('category');
  const activeCategory = groups.some(({ name }) => name === requestedCategory) ? requestedCategory : null;

  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (item) => (
    item.name.toLowerCase().includes(query)
    || translateMenuText(item.name, language).toLowerCase().includes(query)
  );

  const visibleGroups = groups
    .filter(({ name }) => !activeCategory || name === activeCategory)
    .map(({ name, items }) => ({ name, items: items.filter(matchesSearch) }))
    .filter(({ items }) => items.length > 0);

  const tabs = [{ value: null, label: text.allCategories }].concat(
    groups.map(({ name }) => ({ value: name, label: translateMenuText(name, language) })),
  );

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

      <div className="food-tabs">
        {tabs.map(({ value, label }) => (
          <button
            key={label}
            type="button"
            className="food-tab"
            aria-pressed={activeCategory === value}
            onClick={() => setSearchParams(value ? { category: value } : {})}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="food-body">
        {menuStatus && <p className="menu-status">{menuStatus}</p>}
        {!menuStatus && visibleGroups.length === 0 && <p className="menu-status">{text.noResults}</p>}
        {!menuStatus && visibleGroups.map(({ name, items }) => (
          <section key={name} className="food-group">
            <h2 className="food-group-title">
              {translateMenuText(name, language)}
              <span className="food-group-count">{items.length}</span>
            </h2>
            <div className="food-grid">
              {items.map(item => <FoodCard key={item.id} item={item} language={language} text={text} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default MenuPage;
