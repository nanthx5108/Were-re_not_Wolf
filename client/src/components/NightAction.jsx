import React, { useMemo } from 'react';
import { useGame } from '../../context/GameContext.jsx';

const ROLE_PROMPTS = {
  werewolf: 'Choose a target to strike tonight.',
  seer: 'Choose a player to inspect tonight.',
  bodyguard: 'Choose a player to protect tonight.',
};

export default function NightAction() {
  const { room, playerId, myRole, submitNightAction, myNightAction, nightResult } = useGame();

  const alivePlayers = useMemo(() => (room?.players || []).filter((player) => player.isAlive), [room?.players]);

  if (!room || !myRole || !['werewolf', 'seer', 'bodyguard'].includes(myRole)) {
    return null;
  }

  const prompt = ROLE_PROMPTS[myRole] || 'Take your night action.';
  const chosenPlayer = alivePlayers.find((player) => player.id === myNightAction?.targetId);

  return (
    <section style={{ border: '1px solid #e8a027', padding: '1rem', borderRadius: '12px', background: 'rgba(8,12,20,0.7)' }}>
      <h3 style={{ marginTop: 0, color: '#e8a027' }}>🌙 Night Action</h3>
      <p style={{ marginBottom: '0.75rem' }}>{prompt}</p>
      <p style={{ marginBottom: '0.75rem', color: '#f5dcb3' }}>
        Role: <strong>{myRole}</strong>
      </p>

      {myNightAction ? (
        <p style={{ color: '#7ddf7d' }}>
          Your action is set for <strong>{chosenPlayer?.nickname || 'this player'}</strong>.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {alivePlayers
            .filter((player) => player.id !== playerId)
            .map((player) => (
              <button
                key={player.id}
                onClick={() => submitNightAction(player.id)}
                style={{ padding: '0.6rem 0.9rem', borderRadius: '999px', border: '1px solid #e8a027', background: '#111827', color: '#fff' }}
              >
                {player.nickname}
              </button>
            ))}
        </div>
      )}

      {nightResult && (
        <div style={{ marginTop: '0.75rem', color: '#f5dcb3' }}>
          <strong>Night report:</strong>{' '}
          {nightResult.killedNickname ? `${nightResult.killedNickname} was struck.` : 'No one was harmed.'}
          {nightResult.seerResult && ` Seer saw ${nightResult.seerResult.role}.`}
        </div>
      )}
    </section>
  );
}
