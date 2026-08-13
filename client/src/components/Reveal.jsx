import React, { useEffect, useRef, useState } from 'react';

/**
 * ห่อส่วนที่อยู่นอกจอไว้ — ซ่อนไว้ก่อน แล้วค่อย pop ขึ้นมาตอนผู้ใช้เลื่อนมาเจอ
 * และตั้ง content-visibility: auto ให้เบราว์เซอร์ข้ามงาน layout/paint ของเนื้อหา
 * ที่ยังไม่เข้าจอไปเลย (ประหยัดจริง ไม่ใช่แค่ opacity ซ่อนแล้วยังคำนวณอยู่ข้างใน)
 *
 * once = false (ค่าเริ่มต้น) ซ่อนกลับทุกครั้งที่เลื่อนผ่านออกจากจอ ไม่ใช่แค่ตอนเปิดหน้าแรก —
 * ตั้งใจให้เนื้อหานอกจอไม่ถูก render ค้างไว้ (คู่กับ content-visibility ด้านบน)
 * ส่ง once={true} ที่จุดใช้งานถ้าไม่อยากให้กะพริบตอนเลื่อนขึ้นลงเร็ว ๆ
 *
 * as = แท็กที่จะ render (บางที่ต้องเป็น li/section ไม่ใช่ div)
 * intrinsicSize = ความสูงโดยประมาณ ใช้กันเลย์เอาต์กระโดดตอน content-visibility
 *   ยังไม่เคยวัดขนาดจริง (ค่าเริ่มต้นเดาไว้กว้าง ๆ — เบราว์เซอร์จะจำขนาดจริงหลัง reflow แรก)
 */
export default function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
  once = false,
  intrinsicSize = 300,
  style,
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
      style={{
        ...(delay ? { transitionDelay: `${delay}ms` } : null),
        containIntrinsicSize: `auto ${intrinsicSize}px`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
