import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import bgHome from '../src/assets/bgHome.jpg';
import Reveal from '../src/components/Reveal.jsx';
import '../src/styles/Newspage.css';

const TAG_COLORS = {
  'อัปเดต': 'tag-update',
  'กิจกรรม': 'tag-event',
  'ประกาศ': 'tag-notice',
  'แพทช์': 'tag-patch',
  'ชุมชน': 'tag-community',
};

export default function NewsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ทั้งหมด');
  const [hovered, setHovered] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchNews() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/news'); // Fetch all news for the dedicated page
        const data = await res.json();
        if (!cancelled && res.ok) setNews(data.news || []);
      } catch (err) { setError(err.message || 'ไม่สามารถโหลดข่าวสารได้'); }
      finally { if (!cancelled) setLoading(false); }
    }
    fetchNews();
    return () => { cancelled = true; };
  }, []);

  const tags = ['ทั้งหมด', ...new Set(news.map(n => n.tag))];
  const filtered = filter === 'ทั้งหมด' ? news : news.filter(n => n.tag === filter);

  return (
    <div className="news-page" style={{ backgroundImage: bgHome ? `url(${bgHome})` : undefined }}>
      <div className="news-overlay" />
      <div className="news-fog" />

      <div className="news-container">
        <div className="news-topbar">
          <button className="news-back-btn" onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            กลับหน้าหลัก
          </button>
        </div>

        <div className="news-header">
          <div className="news-header-ornament">
            <span className="news-ornament-line" />
            <span className="news-ornament-diamond" />
            <span className="news-ornament-line" />
          </div>
          <h1 className="news-title">กระดานประกาศข่าวสาร</h1>
          <p className="news-subtitle">ข่าวสารการอัพเดตทั้งหมด</p>
        </div>

        <div className="news-filters">
          {tags.map(tag => (
            <button
              key={tag}
              className={`news-filter-btn ${filter === tag ? 'is-active' : ''}`}
              onClick={() => setFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {loading && <p className="news-loading">กำลังโหลดข่าวสาร...</p>}
        {error && <p className="news-error">{error}</p>}
        <div className="news-grid">
          {filtered.map((news, i) => (
            <Reveal
              key={news.id}
              delay={Math.min(i, 5) * 70}
              className={`news-card ${hovered === news.id ? 'is-hovered' : ''}`}
              onMouseEnter={() => setHovered(news.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="news-card-corner tl" />
              <span className="news-card-corner br" />

              <div className={`news-card-tag ${TAG_COLORS[news.tag] || ''}`}>
                {news.tag}
              </div>

              <h2 className="news-card-title">{news.title}</h2>
              <p className="news-card-desc">{news.desc}</p>

              {news.devNote && (
                <div className="news-card-dev">
                  <span className="news-card-dev-label">Dev Note:</span>
                  <span className="news-card-dev-text">"{news.devNote}"</span>
                </div>
              )}

              <div className="news-card-footer">
                <span className="news-card-date">{new Date(news.created_at).toLocaleDateString('th-TH')}</span>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="news-narrator">
          <span>ข่าวสารการอัพเดตทั้งหมด</span>
        </div>
      </div>
    </div>
  );
}