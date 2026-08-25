import React, { useEffect, useRef, useState, useCallback } from 'react';
import { socket } from '../socket/socket.jsx';
import { useGame } from '../context/Gamecontext.jsx';
import { getMicSettings } from '../utils/micSettings.js';
import soundManager from '../sound/soundManager.js';

const ICE_SERVERS = [
  { urls: import.meta.env.VITE_STUN_SERVER || 'stun:stun.l.google.com:19302' },
];

// เปิดไมค์เฉพาะกลางวัน/โหวต — คนเป็นคุยกับคนเป็น คนตายคุยกับคนตาย (mesh WebRTC)
// server แค่ relay SDP/ICE (ดู voice:* ใน socketHandlers.js) ไม่แตะเสียงเลย
export default function VoiceChat() {
  const { room, playerId, isDead } = useGame();
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [pttHeld, setPttHeld] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState({});
  const [micStatus, setMicStatus] = useState('off');
  const [micError, setMicError] = useState(null);

  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const audioElsRef = useRef(new Map()); // peerId -> HTMLAudioElement
  const iceQueueRef = useRef(new Map());
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const speakingRef = useRef(false);

  const micMode = getMicSettings().mode; // 'toggle' | 'ptt'
  const isVoicePhase = room?.status === 'in_progress' && (room?.phase === 'day' || room?.phase === 'voting');

  const applyTrackEnabled = useCallback((val) => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = val;
    speakingRef.current = val;
    setSpeaking(val);
    setMicStatus(val ? 'enabled' : 'muted');
    socket.emit('voice:mute_state', { isMuted: !val });
  }, []);

  const closePeer = useCallback((peerId) => {
    peersRef.current.get(peerId)?.close();
    peersRef.current.delete(peerId);
    const el = audioElsRef.current.get(peerId);
    if (el) { el.srcObject = null; el.remove(); audioElsRef.current.delete(peerId); }
    iceQueueRef.current.delete(peerId);
  }, []);

  const teardownAll = useCallback(() => {
    for (const id of Array.from(peersRef.current.keys())) closePeer(id);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setEnabled(false);
    setSpeaking(false);
    setMicStatus('off');
    setRemoteMuted({});
  }, [closePeer]);

  const resetPeers = useCallback(() => {
    for (const id of Array.from(peersRef.current.keys())) closePeer(id);
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
        el.volume = soundManager.getVoiceVolume();
        document.body.appendChild(el);
        audioElsRef.current.set(peerId, el);
      }
      el.srcObject = e.streams[0];
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('voice:signal', { targetPlayerId: peerId, signal: { sdp: pc.localDescription } });
        } catch (err) {
          console.error('[voice negotiation]', err);
          setMicError('เชื่อมต่อเสียงกับผู้เล่นอื่นไม่สำเร็จ');
        }
      };
    }
    return pc;
  }, []);

  useEffect(() => {
    for (const el of audioElsRef.current.values()) el.volume = soundManager.getVoiceVolume();
  }, [soundManager.getSettings().voice, soundManager.getSettings().master, soundManager.getSettings().muted]);

  useEffect(() => {
    if (!enabled || !localStreamRef.current || micMode !== 'toggle') return undefined;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return undefined;
    const context = new AudioContextCtor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    const source = context.createMediaStreamSource(localStreamRef.current);
    source.connect(analyser);
    const levels = new Uint8Array(analyser.fftSize);
    let frameId;
    let quietFrames = 0;
    const sample = () => {
      analyser.getByteTimeDomainData(levels);
      let sum = 0;
      for (const value of levels) {
        const normalized = (value - 128) / 128;
        sum += normalized * normalized;
      }
      const active = Math.sqrt(sum / levels.length) > 0.055;
      if (active) quietFrames = 0;
      else quietFrames += 1;
      if (active && !speakingRef.current) {
        speakingRef.current = true;
        setSpeaking(true);
      } else if (!active && quietFrames >= 8 && speakingRef.current) {
        speakingRef.current = false;
        setSpeaking(false);
      }
      frameId = requestAnimationFrame(sample);
    };
    analyserRef.current = analyser;
    audioContextRef.current = context;
    context.resume().catch(() => {});
    sample();
    return () => {
      cancelAnimationFrame(frameId);
      source.disconnect();
      analyser.disconnect();
      context.close().catch(() => {});
      analyserRef.current = null;
      audioContextRef.current = null;
    };
  }, [enabled, micMode]);

  const startVoice = useCallback(async () => {
    if (localStreamRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicStatus('unavailable');
      setMicError('เบราว์เซอร์นี้ไม่รองรับไมโครโฟน');
      return;
    }
    setMicStatus('requesting');
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // เริ่มแบบปิดไมค์ไว้ก่อนเสมอ ผู้เล่นต้องกดเปิด/กดค้างเอง
      stream.getAudioTracks()[0].enabled = false;
      localStreamRef.current = stream;
      setEnabled(true);
      setMicStatus('muted');
      socket.emit('voice:join');
    } catch (err) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      const unavailable = err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError';
      setMicStatus(denied ? 'denied' : unavailable ? 'unavailable' : 'error');
      setMicError(
        denied
          ? 'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน'
          : unavailable
            ? 'ไม่พบไมโครโฟน'
            : 'ไม่สามารถเข้าถึงไมโครโฟนได้'
      );
    }
  }, []);

  // เปิด/ปิด mesh ตามช่วงเกม (กลางวัน/โหวต เท่านั้น)
  useEffect(() => {
    if (!isVoicePhase) {
      socket.emit('voice:leave');
      teardownAll();
    }
  }, [isVoicePhase, teardownAll]);

  useEffect(() => {
    const onDisconnect = () => {
      if (localStreamRef.current) {
        resetPeers();
        setMicStatus('error');
      }
    };
    const onConnect = () => {
      if (localStreamRef.current && isVoicePhase) {
        setMicError(null);
        setMicStatus('muted');
        socket.emit('voice:join');
      }
    };
    socket.on('disconnect', onDisconnect);
    socket.on('connect', onConnect);
    return () => {
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onConnect);
    };
  }, [isVoicePhase, resetPeers]);

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
      try {
        let pc = peersRef.current.get(fromPlayerId);
        if (!pc) pc = createPeer(fromPlayerId, false);
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const queued = iceQueueRef.current.get(fromPlayerId) || [];
          for (const candidate of queued) await pc.addIceCandidate(candidate);
          iceQueueRef.current.delete(fromPlayerId);
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('voice:signal', { targetPlayerId: fromPlayerId, signal: { sdp: pc.localDescription } });
          }
        } else if (signal.candidate) {
          const candidate = new RTCIceCandidate(signal.candidate);
          if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
          } else {
            const queued = iceQueueRef.current.get(fromPlayerId) || [];
            queued.push(candidate);
            iceQueueRef.current.set(fromPlayerId, queued);
          }
        }
      } catch (err) {
        console.error('[voice signal]', err);
        setMicError('สัญญาณเสียงขัดข้อง กำลังลองเชื่อมต่อใหม่');
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

  const remoteMutedCount = Object.values(remoteMuted).filter(Boolean).length;

  return (
    <div className="voice-bar">
      {!enabled ? (
        <button className="voice-btn voice-btn-start" onClick={startVoice}>
          {micStatus === 'requesting' ? 'กำลังขอสิทธิ์ไมค์…' : `🎤 เปิดไมค์ ${isDead ? '(ห้องวิญญาณ)' : ''}`}
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
      {enabled && <span className="voice-peer-status">{remoteMutedCount ? `ปิดไมค์ ${remoteMutedCount} คน` : 'เสียงพร้อมใช้งาน'}</span>}
      {micError && <span className="voice-error">{micError}</span>}
    </div>
  );
}