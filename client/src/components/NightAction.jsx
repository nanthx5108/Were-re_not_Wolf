import React, { useMemo, useState, useEffect } from 'react';
import { useGame } from '../context/Gamecontext.jsx';
import { useSound } from '../context/SoundContext.jsx';
import { useGameData } from '../context/GameDataContext.jsx';
import '../styles/NightAction.css';

const FACTION_LABEL = {
  village:  'ฝ่ายชาวบ้าน',
  werewolf: 'ฝ่ายหมาป่า',
  neutral:  'ฝ่ายเป็นกลาง',
  unclear:  'ผลไม่ชัดเจน หมอกหนาเกินไป',
};

export default function NightAction() {
  const {
    room, playerId, myRole, submitNightAction, myNightAction,
    morningEvent, seerResult, wolfTargets, teammates, blockedTargets,
  } = useGame();
  const { roleMap } = useGameData();
  const sound = useSound();
  const [chosenIds, setChosenIds] = useState([]);

  const isNight = room?.phase === 'night';
  useEffect(() => { if (isNight) setChosenIds([]); }, [isNight, room?.round]);

  const nightActionRoles = useMemo(() =>
    new Set(Array.from(roleMap.values()).filter(r => r.night_action).map(r => r.name_en))
  , [roleMap]);

  const alivePlayers = useMemo(() => (room?.players || []).filter((player) => player.isAlive), [room?.players]);

  if (!room || !myRole || !nightActionRoles.has(myRole)) {
    return null;
  }

  // ผลตรวจของ Seer มาถึงตอน night จบ (phase เป็น day แล้ว) จึงต้องแสดงได้นอก night ด้วย
  const seerReport = myRole === 'seer' && seerResult ? (
    <section className="na-panel">
      <h3 className="na-title">ผลการตรวจ</h3>
      <p className="na-seer-result">
        <strong>{alivePlayers.find((p) => p.id === seerResult.targetId)?.nickname
          ?? room.players.find((p) => p.id === seerResult.targetId)?.nickname
          ?? 'ผู้เล่นคนนั้น'}</strong>
        {' คือ '}
        <strong className={seerResult.faction === 'werewolf' ? 'is-wolf' : 'is-village'}>
          {FACTION_LABEL[seerResult.faction] ?? 'ไม่ทราบ'}
        </strong>
      </p>
    </section>
  ) : null;

  if (!isNight) return seerReport;

  // เหตุการณ์ "คืนที่ปลอดภัย" — คืนนี้ผู้พิทักษ์เลือกป้องกันได้ 2 คน
  const doubleGuard = myRole === 'bodyguard' && morningEvent?.id === 'boat_return';
  const maxTargets = doubleGuard ? 2 : 1;
  const roleInfo = roleMap.get(myRole);

  const { prompt, hint } = doubleGuard
    ? { prompt: 'คืนนี้เจ้าแข็งแรงเป็นพิเศษ เลือกป้องกันได้ 2 คน', hint: null }
    : { prompt: roleInfo?.description_th, hint: null };

  const chosenPlayers = alivePlayers.filter((p) =>
    chosenIds.includes(p.id) || (chosenIds.length === 0 && p.id === myNightAction?.targetId)
  );
  const actionComplete = doubleGuard
    ? chosenPlayers.length >= maxTargets
    : Boolean(myNightAction);

  function handlePick(targetId) {
    sound.playSfx('/audio/sfx_action_confirm.wav');
    submitNightAction(targetId);
    setChosenIds((ids) => (ids.includes(targetId) ? ids : [...ids, targetId].slice(0, maxTargets)));
  }

  return (
    <>
    {seerReport}
    <section className="na-panel">
      <h3 className="na-title">ค่ำคืนนี้</h3>
      <p className="na-prompt">{prompt}</p>
      {hint && <p className="na-hint">{hint}</p>}
      <p className="na-role-info">
        บทบาทของเจ้า: <strong>{roleInfo?.name_th || myRole}</strong>
      </p>

      {actionComplete ? (
        <p className="na-complete-msg">
          เลือก <strong>{chosenPlayers.map((p) => p.nickname).join(', ') || 'ผู้เล่นคนนี้'}</strong> แล้ว
        </p>
      ) : (
        <div className="na-target-list">
          {doubleGuard && chosenPlayers.length > 0 && (
            <p className="na-chosen-info">
              เลือกแล้ว: {chosenPlayers.map((p) => p.nickname).join(', ')} (เลือกได้อีก {maxTargets - chosenPlayers.length})
            </p>
          )}
          {alivePlayers
            .filter((player) => player.id !== playerId && !chosenIds.includes(player.id))
            .map((player) => {
              const blocked = myRole === 'bodyguard' && (blockedTargets || []).includes(player.id);
              return (
                <button
                  key={player.id}
                  onClick={() => handlePick(player.id)}
                  disabled={blocked}
                  title={blocked ? 'เจ้าเพิ่งเฝ้าคนนี้เมื่อคืน' : undefined}
                  className="na-target-btn"
                >
                  {player.nickname}
                </button>
              );
            })}
        </div>
      )}

      {myRole === 'werewolf' && (
        <div className="na-teammates">
          <strong>ทีมของเจ้า:</strong>{' '}
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
