import React from 'react';
import { IconClock } from '../ui/Icons.jsx';
import '../../styles/HomePage.css';

export default function NewsRow({ news }) {
  return (
    <div className="home-news-item">
      <div className="home-news-item-meta">
        <span className="home-news-item-tag">{news.tag}</span>
        <span className="home-news-item-date"><IconClock />{news.date}</span>
      </div>
      <div className="home-news-item-title">{news.title}</div>
      <div className="home-news-item-desc">{news.desc}</div>
    </div>
  );
}