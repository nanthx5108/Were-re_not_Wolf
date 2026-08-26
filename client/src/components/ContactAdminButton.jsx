import React from 'react';
import { IconFacebook } from './ui/Icons.jsx';
import '../styles/ContactAdminButton.css';

const ADMIN_CONTACT_URL = 'https://www.facebook.com/nanthaphat.phaton.9?locale=th_TH';

export default function ContactAdminButton() {
  return (
    <a
      className="contact-admin-button"
      href={ADMIN_CONTACT_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="ติดต่อแอดมินผ่าน Facebook"
      aria-label="ติดต่อแอดมินผ่าน Facebook"
    >
      <IconFacebook size={18} />
      <span>ติดต่อแอดมิน</span>
    </a>
  );
}
