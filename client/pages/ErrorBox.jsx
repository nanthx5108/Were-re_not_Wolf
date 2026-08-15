import React from 'react';
import '../../styles/HomePage.css';

export default function ErrorBox({ msg }) {
  return <div className="error-box">{msg}</div>;
}