import React, { useMemo, useState, useEffect } from 'react';
import { useGame } from '../../context/Gamecontext.jsx';

const ROLE_PROMPTS = {
  werewolf:  'เลือกเหยื่อของคืนนี้',
  seer:      'เลือกคนที่จะตรวจคืนนี้ — เจ้าจะรู้แค่ว่าเขาอยู่ฝ่ายไหน',
  bodyguard: 'เลือกคนที่จะปกป้องคืนนี้ — ห้ามเฝ้าคนเดิม 2 คืนติด',
  silencer:  'เลือกคนที่จะปิดปาก — พรุ่งนี้ทั้งวันเขาจะพิมพ์อะไรไม่ได้เลย',
};

const ACTION_ROLES = ['werewolf', 'seer', 'bodyguard', 'silencer'];

const FACTION_LABEL = {
  village:  'ฝ่ายชาวบ้าน',
  werewolf: 'ฝ่ายหมาป่า',
  neutral:  'ฝ่ายเป็นกลาง',
  unclear:  'ผลไม่ชัดเจน — หมอกหนาเกินไป',
};

export default function NightAction() {
  const {
    room, playerId, myRole, submitNightAction, myNightAction,
    morningEvent, seerResult, wolfTargets, teammates, blockedTargets,
  } = useGame();
  const [chosenIds, setChosenIds] = useState([]);

  const isNight = room?.phase === 'night';
  useEffect(() => { if (isNight) setChosenIds([]); }, [isNight, room?.round]);

  const alivePlayers = useMemo(() => (room?.players || []).filter((player) => player.isAlive), [room?.players]);

  if (!room || !myRole || !ACTION_ROLES.includes(myRole)) {
    return null;
  }

  // ผลตรวจของ Seer มาถึงตอน night จบ (phase เป็น day แล้ว) จึงต้องแสดงได้นอก night ด้วย
  const seerReport = myRole === 'seer' && seerResult ? (
    <section style={{ border: '1px solid #9fbcd0', padding: '1rem', borderRadius: '12px', background: 'rgba(8,12,20,0.7)' }}>
      <h3 style={{ marginTop: 0, color: '#9fbcd0' }}>🔮 ผลการตรวจ</h3>
      <p style={{ margin: 0 }}>
        <strong>{alivePlayers.find((p) => p.id === seerResult.targetId)?.nickname
          ?? room.players.find((p) => p.id === seerResult.targetId)?.nickname
          ?? 'ผู้เล่นคนนั้น'}</strong>
        {' — '}
        <strong style={{ color: seerResult.faction === 'werewolf' ? '#e57373' : '#7ddf7d' }}>
          {FACTION_LABEL[seerResult.faction] ?? 'ไม่ทราบ'}
        </strong>
      </p>
    </section>
  ) : null;

  if (!isNight) return seerReport;

  // เหตุการณ์ "เรือกลับเข้าฝั่ง" — คืนนี้ผู้พิทักษ์เลือกป้องกันได้ 2 คน
  const doubleGuard = myRole === 'bodyguard' && morningEvent?.id === 'boat_return';
  const maxTargets = doubleGuard ? 2 : 1;

  const prompt = doubleGuard
    ? 'คืนนี้เจ้าแข็งแรงเป็นพิเศษ — เลือกป้องกันได้ 2 คน'
    : ROLE_PROMPTS[myRole] || 'Take your night action.';

  const chosenPlayers = alivePlayers.filter((p) =>
    chosenIds.includes(p.id) || (chosenIds.length === 0 && p.id === myNightAction?.targetId)
  );
  const actionComplete = doubleGuard
    ? chosenPlayers.length >= maxTargets
    : Boolean(myNightAction);

  function handlePick(targetId) {
    submitNightAction(targetId);
    setChosenIds((ids) => (ids.includes(targetId) ? ids : [...ids, targetId].slice(0, maxTargets)));
  }

  return (
    <>
    {seerReport}
    <section style={{ border: '1px solid #9fbcd0', padding: '1rem', borderRadius: '12px', background: 'rgba(8,12,20,0.7)' }}>
      <h3 style={{ marginTop: 0, color: '#9fbcd0' }}>🌙 Night Action</h3>
      <p style={{ marginBottom: '0.75rem' }}>{prompt}</p>
      <p style={{ marginBottom: '0.75rem', color: '#d9e4ec' }}>
        Role: <strong>{myRole}</strong>
      </p>

      {actionComplete ? (
        <p style={{ color: '#7ddf7d' }}>
          Your action is set for <strong>{chosenPlayers.map((p) => p.nickname).join(', ') || 'this player'}</strong>.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {doubleGuard && chosenPlayers.length > 0 && (
            <p style={{ width: '100%', color: '#7ddf7d', margin: 0 }}>
              เลือกแล้ว: {chosenPlayers.map((p) => p.nickname).join(', ')} (เลือกได้อีก {maxTargets - chosenPlayers.length})
            </p>
          )}
          {alivePlayers
            .filter((player) => player.id !== playerId && !chosenIds.includes(player.id))
            .map((player) => {
              // ผู้พิทักษ์เฝ้าคนเดิม 2 คืนติดไม่ได้ — server ก็ปฏิเสธ ปุ่มนี้แค่กันไม่ให้กดไปเสียเปล่า
              const blocked = myRole === 'bodyguard' && (blockedTargets || []).includes(player.id);
              return (
                <button
                  key={player.id}
                  onClick={() => handlePick(player.id)}
                  disabled={blocked}
                  title={blocked ? 'เจ้าเพิ่งเฝ้าคนนี้เมื่อคืน' : undefined}
                  style={{
                    padding: '0.6rem 0.9rem', borderRadius: '999px',
                    border: '1px solid #9fbcd0', background: '#111827', color: '#fff',
                    opacity: blocked ? 0.35 : 1,
                    cursor: blocked ? 'not-allowed' : 'pointer',
                  }}
                >
                  {player.nickname}{blocked ? ' 🛡️' : ''}
                </button>
              );
            })}
        </div>
      )}

      {myRole === 'werewolf' && (
        <div style={{ marginTop: '0.75rem', color: '#d9e4ec' }}>
          <strong style={{ color: '#e57373' }}>🐺 ทีมของเจ้า:</strong>{' '}
          {(teammates || []).length === 0
            ? 'เจ้าล่าเพียงลำพัง'
            : teammates.map((mate) => {
                const pick = wolfTargets?.[mate.id]?.targetId;
                const victim = pick ? alivePlayers.find((p) => p.id === pick)?.nickname : null;
                return victim ? `${mate.nickname} → ${victim}` : `${mate.nickname} (ยังไม่เลือก)`;
              }).join(' · ')}
        </div>
      )}
    </section>
    </>
  );
}
