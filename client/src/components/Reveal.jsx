import React, { useEffect, useRef, useState } from 'react';

/**
 * ห่อส่วนที่อยู่นอกจอไว้ — ซ่อนไว้ก่อน แล้วค่อย pop ขึ้นมาตอนผู้ใช้เลื่อนมาเจอ
 *
 * once = true (ค่าเริ่มต้น) โผล่แล้วโผล่เลย ไม่ซ่อนอีกตอนเลื่อนผ่านไป —
 * ถ้าให้ซ่อนกลับทุกครั้ง เนื้อหาจะกะพริบตอนเลื่อนขึ้นลงเร็ว ๆ
 *
 * as = แท็กที่จะ render (บางที่ต้องเป็น li/section ไม่ใช่ div)
 */
export default function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
  once = true,
  ...rest
}) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // เบราว์เซอร์เก่าที่ไม่มี IntersectionObserver — แสดงเลย ดีกว่าซ่อนค้างถาวร
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          if (once) io.disconnect();
        } else if (!once) {
          setRevealed(false);
        }
      },
      // rootMargin ลบด้านล่าง = ต้องเลื่อนเข้ามาจริง ๆ ~12% ถึงจะนับว่าเห็น
      // ไม่งั้นมันจะ trigger ตั้งแต่ขอบยังไม่พ้นจอ แล้วดูเหมือนโผล่มาก่อนเวลา
      { threshold: 0.15, rootMargin: '0px 0px -12% 0px' },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={`reveal ${revealed ? 'is-revealed' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
