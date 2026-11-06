import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { restaurantInfo } from '../data/restaurantInfo';
import './MenuPage.css';

function MenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['Бүгд']);
  const [selectedCategory, setSelectedCategory] = useState('Бүгд');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;
        setMenuItems(data || []);

        const cats = ['Бүгд', ...new Set(data.map(item => item.category).filter(Boolean))];
        setCategories(cats);
      } catch (err) {
        console.error('Цэс татахад алдаа гарлаа:', err.message);
        setLoadFailed(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, []);

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'Бүгд' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const { name, tagline, description, address, phone, hours, services, paymentNote } = restaurantInfo;

  let menuStatus = null;
  if (isLoading) menuStatus = 'Цэс ачаалж байна...';
  else if (loadFailed) menuStatus = 'Цэс татахад алдаа гарлаа. Хуудсаа дахин ачаална уу.';
  else if (filteredItems.length === 0) menuStatus = 'Хоол олдсонгүй.';

  return (
    <div className="menu-page">
      <div className="menu-page-layout">

        {/* Зоогийн газрын мэдээлэл */}
        <aside className="about-panel">
          <h1 className="about-name">{name}</h1>
          <p className="about-tagline">{tagline}</p>
          {description && <p className="about-description">{description}</p>}

          <dl className="about-details">
            {address && (
              <div className="about-row">
                <dt>📍 Хаяг</dt>
                <dd>{address}</dd>
              </div>
            )}
            {phone && (
              <div className="about-row">
                <dt>📞 Утас</dt>
                <dd><a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a></dd>
              </div>
            )}
            {hours && (
              <div className="about-row">
                <dt>🕒 Цагийн хуваарь</dt>
                <dd>{hours}</dd>
              </div>
            )}
            <div className="about-row">
              <dt>🍽️ Үйлчилгээ</dt>
              <dd>{services.join(' • ')}</dd>
            </div>
            <div className="about-row">
              <dt>💳 Төлбөр</dt>
              <dd>{paymentNote}</dd>
            </div>
          </dl>
        </aside>

        {/* Хоолны цэс (зөвхөн харах) */}
        <main className="menu-panel">
          <h2 className="menu-title">Хоолны цэс</h2>

          <input
            type="text"
            className="menu-search"
            placeholder="🔍 Хоол хайх..."
            aria-label="Хоол хайх"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="menu-categories">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`menu-category${selectedCategory === cat ? ' is-active' : ''}`}
                aria-pressed={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {menuStatus ? (
            <p className="menu-status">{menuStatus}</p>
          ) : (
            <div className="menu-grid">
              {filteredItems.map(item => {
                const isSoldOut = item.stock === 0;
                return (
                  <article key={item.id} className={`menu-card${isSoldOut ? ' is-sold-out' : ''}`}>
                    {item.image_url && (
                      <div className="menu-card-image">
                        <img src={item.image_url} alt={item.name} />
                      </div>
                    )}
                    <div className="menu-card-body">
                      <h3 className="menu-card-name">{item.name}</h3>
                      <p className="menu-card-price">{item.price?.toLocaleString()} ₮</p>
                      {isSoldOut && <span className="menu-card-badge">Дууссан</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}

export default MenuPage;
