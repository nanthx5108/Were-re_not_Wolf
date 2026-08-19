import React, { useRef, useState, useCallback, useEffect } from 'react';
import '../styles/AdminFloatingWindow.css';

const MIN_WIDTH  = 420;
const MIN_HEIGHT = 320;

export default function AdminFloatingWindow({ onClose, children }) {
  const windowRef = useRef(null);
  const dragState  = useRef(null);
  const resizeState = useRef(null);

  const [pos,  setPos]  = useState(() => ({
    x: Math.max(24, (window.innerWidth  - 960) / 2),
    y: Math.max(24, (window.innerHeight - 640) / 2),
  }));
  const [size, setSize] = useState({ width: 960, height: 640 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [prevState, setPrevState] = useState(null);

  const clampToViewport = useCallback((x, y, width, height) => {
    const maxX = Math.max(0, window.innerWidth  - width);
    const maxY = Math.max(0, window.innerHeight - height);
    return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
  }, []);

  function handleDragStart(e) {
    if (isMaximized) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  }
  function handleDragMove(e) {
    const d = dragState.current;
    if (!d) return;
    const nextX = d.origX + (e.clientX - d.startX);
    const nextY = d.origY + (e.clientY - d.startY);
    setPos(clampToViewport(nextX, nextY, size.width, size.height));
  }
  function handleDragEnd() {
    dragState.current = null;
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
  }

  function handleResizeStart(e) {
    e.stopPropagation();
    if (isMaximized) return;
    resizeState.current = {
      startX: e.clientX, startY: e.clientY,
      origW: size.width, origH: size.height,
    };
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }
  function handleResizeMove(e) {
    const r = resizeState.current;
    if (!r) return;
    const nextW = Math.max(MIN_WIDTH,  r.origW + (e.clientX - r.startX));
    const nextH = Math.max(MIN_HEIGHT, r.origH + (e.clientY - r.startY));
    const maxW = window.innerWidth  - pos.x;
    const maxH = window.innerHeight - pos.y;
    setSize({ width: Math.min(nextW, maxW), height: Math.min(nextH, maxH) });
  }
  function handleResizeEnd() {
    resizeState.current = null;
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  }

  useEffect(() => () => {
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  }, []);

  function toggleMaximize() {
    if (isMaximized) {
      if (prevState) { setPos({ x: prevState.x, y: prevState.y }); setSize({ width: prevState.width, height: prevState.height }); }
      setIsMaximized(false);
    } else {
      setPrevState({ x: pos.x, y: pos.y, width: size.width, height: size.height });
      setIsMaximized(true);
    }
  }

  function toggleMinimize() {
    setIsMinimized(m => !m);
  }

  const style = isMaximized
    ? { top: 8, left: 8, right: 8, bottom: 8, width: 'auto', height: 'auto' }
    : { top: pos.y, left: pos.x, width: size.width, height: isMinimized ? 'auto' : size.height };

  return (
    <div
      ref={windowRef}
      className={`admin-floating-window ${isMaximized ? 'is-maximized' : ''} ${isMinimized ? 'is-minimized' : ''}`}
      style={style}
      role="dialog"
      aria-label="Admin Control Panel"
    >
      <div className="afw-titlebar" onMouseDown={handleDragStart} onDoubleClick={toggleMaximize}>
        <span className="afw-title">🛠 Admin Control Panel</span>
        <div className="afw-controls">
          <button type="button" className="afw-btn afw-btn-min" onClick={toggleMinimize} aria-label="Minimize" title="ย่อ">─</button>
          <button type="button" className="afw-btn afw-btn-max" onClick={toggleMaximize} aria-label="Maximize" title="ขยายเต็ม">▢</button>
          <button type="button" className="afw-btn afw-btn-close" onClick={onClose} aria-label="Close" title="ปิด">✕</button>
        </div>
      </div>

      {!isMinimized && (
        <div className="afw-body custom-scrollbar">
          {children}
        </div>
      )}

      {!isMaximized && !isMinimized && (
        <div className="afw-resize-handle" onMouseDown={handleResizeStart} />
      )}
    </div>
  );
}