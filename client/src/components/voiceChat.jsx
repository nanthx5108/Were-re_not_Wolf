import React, { useEffect, useRef, useState, useCallback } from 'react';
import { socket } from '../socket/socket.jsx';
import { useGame } from '../context/Gamecontext.jsx';
import { getMicSettings } from '../utils/micSettings.js';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// เปิดไมค์เฉพาะกลางวัน/โหวต — คนเป็นคุยกับคนเป็น คนตายคุยกับคนตาย (mesh WebRTC)
// server แค่ relay SDP/ICE (ดู voice:* ใน socketHandlers.js) ไม่แตะเสียงเลย
export default function VoiceChat() {
  const { room, playerId, isDead } = useGame();
  const [enabled, setEnabled] = useState(false);       // ผู้เล่นเปิดไมค์เอง (ต้อง getUserMedia สำเร็จ)
  const [speaking, setSpeaking] = useState(false);      // สถานะ track.enabled ปัจจุบัน
  const [pttHeld, setPttHeld] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState({});   // { [peerId]: boolean }
  const [micError, setMicError] = useState(null);

  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const audioElsRef = useRef(new Map()); // peerId -> HTMLAudioElement

  const micMode = getMicSettings().mode; // 'toggle' | 'ptt'
  const isVoicePhase = room?.status === 'in_progress' && (room?.phase === 'day' || room?.phase === 'voting');

  const applyTrackEnabled = useCallback((val) => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = val;
    setSpeaking(val);
    socket.emit('voice:mute_state', { isMuted: !val });
  }, []);

  const closePeer = useCallback((peerId) => {
    peersRef.current.get(peerId)?.close();
    peersRef.current.delete(peerId);
    const el = audioElsRef.current.get(peerId);
    if (el) { el.srcObject = null; el.remove(); audioElsRef.current.delete(peerId); }
  }, []);

  const teardownAll = useCallback(() => {
    for (const id of Array.from(peersRef.current.keys())) closePeer(id);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setEnabled(false);
    setSpeaking(false);
  }, [closePeer]);

  const createPeer = useCallback((peerId, isInitiator) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current.set(peerId, pc);

    localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('voice:signal', { targetPlayerId: peerId, signal: { candidate: e.candidate } });
    };
    pc.ontrack = (e) => {
      let el = audioElsRef.current.get(peerId);
      if (!el) {
        el = document.createElement('audio');
        el.autoplay = true;
        document.body.appendChild(el);
        audioElsRef.current.set(peerId, el);
      }
      el.srcObject = e.streams[0];
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice:signal', { targetPlayerId: peerId, signal: { sdp: pc.localDescription } });
      };
    }
    return pc;
  }, []);

  const startVoice = useCallback(async () => {
    if (localStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // เริ่มแบบปิดไมค์ไว้ก่อนเสมอ ผู้เล่นต้องกดเปิด/กดค้างเอง
      stream.getAudioTracks()[0].enabled = false;
      localStreamRef.current = stream;
      setEnabled(true);
      setMicError(null);
      socket.emit('voice:join');
    } catch (err) {
      setMicError('ไม่สามารถเข้าถึงไมโครโฟนได้ — เช็คสิทธิ์การใช้งานไมค์ของเบราว์เซอร์');
    }
  }, []);

  // เปิด/ปิด mesh ตามช่วงเกม (กลางวัน/โหวต เท่านั้น)
  useEffect(() => {
    if (!isVoicePhase) {
      socket.emit('voice:leave');
      teardownAll();
    }
  }, [isVoicePhase, teardownAll]);

  useEffect(() => () => { socket.emit('voice:leave'); teardownAll(); }, [teardownAll]);

  useEffect(() => {
    function onPeers(peerIds) {
      for (const id of peerIds) {
        if (!peersRef.current.has(id)) createPeer(id, playerId < id);
      }
    }
    function onPeerJoined({ peerId }) {
      if (!peersRef.current.has(peerId)) createPeer(peerId, playerId < peerId);
    }
    function onPeerLeft({ peerId }) {
      closePeer(peerId);
      setRemoteMuted(m => { const next = { ...m }; delete next[peerId]; return next; });
    }
    async function onSignal({ fromPlayerId, signal }) {
      let pc = peersRef.current.get(fromPlayerId);
      if (!pc) pc = createPeer(fromPlayerId, false);
      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice:signal', { targetPlayerId: fromPlayerId, signal: { sdp: pc.localDescription } });
        }
      } else if (signal.candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch { /* ignore late candidates */ }
      }
    }
    function onMuteState({ playerId: pid, isMuted }) {
      setRemoteMuted(m => ({ ...m, [pid]: isMuted }));
    }

    socket.on('voice:peers', onPeers);
    socket.on('voice:peer_joined', onPeerJoined);
    socket.on('voice:peer_left', onPeerLeft);
    socket.on('voice:signal', onSignal);
    socket.on('voice:mute_state', onMuteState);
    return () => {
      socket.off('voice:peers', onPeers);
      socket.off('voice:peer_joined', onPeerJoined);
      socket.off('voice:peer_left', onPeerLeft);
      socket.off('voice:signal', onSignal);
      socket.off('voice:mute_state', onMuteState);
    };
  }, [playerId, createPeer, closePeer]);

  // push-to-talk: กดค้างปุ่มที่ตั้งไว้เพื่อพูด
  useEffect(() => {
    if (micMode !== 'ptt' || !enabled) return;
    const key = getMicSettings().pttKey;
    function onKeyDown(e) {
      if (e.code !== key || pttHeld) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      setPttHeld(true);
      applyTrackEnabled(true);
    }
    function onKeyUp(e) {
      if (e.code !== key) return;
      setPttHeld(false);
      applyTrackEnabled(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [micMode, enabled, pttHeld, applyTrackEnabled]);

  if (!isVoicePhase) return null;

  return (
    <div className="voice-bar">
      {!enabled ? (
        <button className="voice-btn voice-btn-start" onClick={startVoice}>
          🎤 เปิดไมค์ {isDead && '(ห้องวิญญาณ)'}
        </button>
      ) : micMode === 'ptt' ? (
        <div className={`voice-btn voice-btn-ptt ${pttHeld ? 'is-speaking' : ''}`}>
          🎤 กดค้าง [{getMicSettings().pttKey === 'Space' ? 'Space' : getMicSettings().pttKey}] เพื่อพูด
        </div>
      ) : (
        <button
          className={`voice-btn ${speaking ? 'is-speaking' : 'is-muted'}`}
          onClick={() => applyTrackEnabled(!speaking)}
        >
          {speaking ? '🎤 กำลังพูด (กดปิด)' : '🔇 ไมค์ปิดอยู่ (กดพูด)'}
        </button>
      )}
      {micError && <span className="voice-error">{micError}</span>}
    </div>
  );
}