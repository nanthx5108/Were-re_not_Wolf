import { io } from 'socket.io-client';

// undefined = ต่อกลับไปที่ origin ที่เสิร์ฟหน้านี้
//   prod: server เสิร์ฟ React build เอง → origin เดียวกันอยู่แล้ว
//   dev:  vite proxy /socket.io (ws:true) ส่งต่อไป :3001 ให้
// ตั้ง VITE_SERVER_URL เฉพาะตอนที่ client กับ server อยู่คนละ domain
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || undefined;

export const socket = io(SOCKET_URL, {
  autoConnect: false,        // เชื่อมต่อ manual หลัง user มี identity
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});