import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bgHome from '../src/assets/bgHome.png';
import '../src/styles/NewsPage.css';

const ALL_NEWS = [
  {
    id: 1,
    tag: 'อัปเดต',
    title: 'อัปเดตเวอร์ชัน 1.2.0',
    desc: 'เพิ่มระบบรายงานผู้เล่น และปรับสมดุลเกม — หมาป่าบ่นว่าโดนเพิ่มความยากอีกแล้ว',
    date: '24/06/2026',
    devNote: 'เราไม่ได้ buff หมาป่าเพิ่มเติม... อย่างเป็นทางการ',
  },
  {
    id: 2,
    tag: 'กิจกรรม',
    title: 'กิจกรรม : คืนหมาป่า',
    desc: 'เล่นครบ 3 เกม รับของรางวัลพิเศษ ! ชาวบ้านขอให้มีรางวัล เราก็ทำตาม',
    date: '24/06/2026',
    devNote: 'ชาวบ้านขอ เราให้ แต่หมาป่าก็ได้ด้วย',
  },
  {
    id: 3,
    tag: 'ประกาศ',
    title: 'ปิดปรับปรุงระบบ',
    desc: 'ปรับปรุงเซิร์ฟเวอร์ในวันที่ 30/06/2026 ตั้งแต่ 02:00 - 06:00 น.',
    date: '24/06/2026',
    devNote: 'เซิร์ฟเวอร์ก็โกหกเป็นเหมือนกัน',
  },
  {
    id: 4,
    tag: 'แพทช์',
    title: 'แพทช์โน้ต 1.1.8',
    desc: 'แก้ไขบัคที่ทำให้ Fool สามารถชนะโดยถูกหมาป่ากำจัดได้ — นั่นไม่ใช่ intention',
    date: '10/06/2026',
    devNote: 'Fool ชนะได้แค่ตอนถูกโหวต ไม่ใช่ตอนถูกฆ่า',
  },
  {
    id: 5,
    tag: 'ชุมชน',
    title: 'ผู้เล่นสะสมครบ 10,000 คน',
    desc: 'หมู่บ้านเติบโตขึ้น มีคนโกหกกันมากขึ้น ขอบคุณทุกคนที่เข้ามาร่วม... หรือมาเพื่อโกหก',
    date: '01/06/2026',
    devNote: 'ในจำนวนนั้นมีหมาป่าอยู่เท่าไหร่? เราไม่บอก',
  },
  {
    id: 6,
    tag: 'อัปเดต',
    title: 'เพิ่มระบบ Silencer',
    desc: 'Role ใหม่ Silencer ฝ่ายหมู่บ้าน สามารถปิดปากผู้เล่น 1 คนในวันถัดไปได้',
    date: '15/05/2026',
    devNote: 'บางทีความเงียบคือคำตอบที่ดีที่สุด',
  },
];

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

  const tags = ['ทั้งหมด', ...new Set(ALL_NEWS.map(n => n.tag))];
  const filtered = filter === 'ทั้งหมด' ? ALL_NEWS : ALL_NEWS.filter(n => n.tag === filter);

  return (
    <div className="news-page" style={{ backgroundImage: bgHome ? `url(${bgHome})` : undefined }}>
      <div className="news-overlay" />
      <div className="news-fog" />

      <div className="news-container">
        {/* Topbar */}
        <div className="news-topbar">
          <button className="news-back-btn" onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            กลับหน้าหลัก
          </button>
        </div>

        {/* Header */}
        <div className="news-header">
          <div className="news-header-ornament">
            <span className="news-ornament-line" />
            <span className="news-ornament-diamond" />
            <span className="news-ornament-line" />
          </div>
          <h1 className="news-title">กระดานประกาศหมู่บ้าน</h1>
          <p className="news-subtitle">ข่าวสารจากหมู่บ้านที่ทุกคนรู้จักกัน... แต่ไม่มีใครไว้ใจกัน</p>
        </div>

        {/* Filter tabs */}
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

        {/* News grid */}
        <div className="news-grid">
          {filtered.map(news => (
            <div
              key={news.id}
              className={`news-card ${hovered === news.id ? 'is-hovered' : ''}`}
              onMouseEnter={() => setHovered(news.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Corner ornaments */}
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
                <span className="news-card-date">{news.date}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Narrator footer */}
        <div className="news-narrator">
          <span>— นกส่งสาร กล่าวว่า "อ่านแล้วอย่าเพิ่งเชื่อทั้งหมด" —</span>
        </div>
      </div>
    </div>
  );
}