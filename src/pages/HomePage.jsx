import { Link, useOutletContext } from 'react-router-dom';
import { phoneHref, restaurantInfo } from '../data/restaurantInfo';
import { DEFAULT_LANGUAGE, localize } from '../data/translations';

function HomePage() {
  const { language, text } = useOutletContext();

  const { map, about, sections, news, gallery, phones } = restaurantInfo;
  const name = localize(restaurantInfo.name, language);
  const description = localize(restaurantInfo.description, language);
  // Google Maps тува хэлгүй тул тува дээр монголоор харуулна.
  const mapLanguage = language === 'tyv' ? 'mn' : language;
  const mapUrl = map.embedUrl.replaceAll('!1smn!2smn', `!1s${mapLanguage}!2smn`);

  return (
    <>
      <section className="hero">
        <svg className="hero-ridge" viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 240 L170 130 L300 195 L480 40 L650 180 L790 105 L960 210 L1130 70 L1290 175 L1440 110" />
          <path d="M0 285 L220 205 L400 260 L600 180 L810 265 L1010 190 L1220 262 L1440 200" />
        </svg>
        <div className="hero-inner">
          <h1 className="hero-title">{name}</h1>
          {description && <p className="hero-lead">{description}</p>}
          <div className="hero-actions">
            <Link className="hero-button is-primary" to="/menu">{text.menu}</Link>
            <Link className="hero-button" to="/#location">{text.location}</Link>
          </div>
        </div>
      </section>

      <section className="home-section" id="about">
        <h2 className="home-heading">{text.about}</h2>
        {about.map((paragraph) => (
          <p key={localize(paragraph, DEFAULT_LANGUAGE)} className="about-text">{localize(paragraph, language)}</p>
        ))}
        {sections.length > 0 && (
          <div className="story-grid">
            {sections.map(({ title, text: body }) => (
              <article key={localize(title, DEFAULT_LANGUAGE)} className="story-card">
                <h3>{localize(title, language)}</h3>
                <p>{localize(body, language)}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {news.length > 0 && (
        <section className="home-section" id="news">
          <h2 className="home-heading">{text.news}</h2>
          <div className="news-list">
            {news.map(({ image, imageAlt, title, text: body, links }) => (
              <article key={localize(title, DEFAULT_LANGUAGE)} className="news-card">
                {image && <img className="news-image" src={image} alt={localize(imageAlt, language)} loading="lazy" />}
                <div className="news-body">
                  <h3 className="news-title">{localize(title, language)}</h3>
                  {body && <p className="news-text">{localize(body, language)}</p>}
                  {links?.length > 0 && (
                    <div className="news-links">
                      {links.map(({ label, url }) => (
                        <a key={url} className="hero-button" href={url} target="_blank" rel="noreferrer">{label}</a>
                      ))}
                    </div>
                  )}
                </div>
              </article>
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
        {phones.length > 0 && (
          <div className="contact-block">
            <h3 className="contact-title">{text.contact}</h3>
            <div className="contact-phones">
              {phones.map(phone => <a key={phone} className="contact-phone" href={phoneHref(phone)}>{phone}</a>)}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default HomePage;
