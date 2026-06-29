import React from 'react';

export default function VotingPanel({ players = [], playerId, votes, onVote }) {
  const alivePlayers = players.filter(p => p.isAlive);
  const targets      = alivePlayers.filter(p => p.id !== playerId);
  const totalAlive   = alivePlayers.length;
  const counts       = votes?.counts  || {};
  const voteMap      = votes?.voteMap || {};
  const votedCount   = Object.keys(voteMap).length;
  const myVote       = voteMap[playerId];

  const alreadyVoted = !!myVote;

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.icon}>Vote</span>
        <div>
          <p style={s.title}>โหวตคนที่สงสัย</p>
          <p style={s.sub}>ใครคือหมาป่าที่ซ่อนอยู่?</p>
        </div>
      </div>

      <div style={s.progressRow}>
        <span style={s.progressLabel}>{votedCount} / {totalAlive} โหวตแล้ว</span>
        <div style={s.progressTrack}>
          <div style={{
            ...s.progressFill,
            width: totalAlive > 0 ? `${(votedCount / totalAlive) * 100}%` : '0%',
          }} />
        </div>
      </div>

      {alreadyVoted && (
        <div style={s.myVoteBox}>
          คุณโหวต:{' '}
          <strong style={{ color: 'var(--color-accent)' }}>
            {players.find(p => p.id === myVote)?.nickname ?? '?'}
          </strong>
        </div>
      )}

      <div style={s.list}>
        {targets.map(p => {
          const voteCount  = counts[p.id] || 0;
          const hasVoted   = voteMap[p.id] !== undefined;
          const isMyTarget = myVote === p.id;

          return (
            <div key={p.id} style={{
              ...s.row,
              background: isMyTarget ? 'rgba(232,160,39,.08)' : 'var(--color-surface-2)',
              borderColor: isMyTarget ? 'var(--color-accent)' : 'var(--color-border)',
            }}>
              <div style={s.playerInfo}>
                <span style={s.avatar}>Player</span>
                <span style={s.name}>{p.nickname}</span>
                {hasVoted && <span style={s.votedBadge}>โหวตแล้ว</span>}
              </div>

              <div style={s.right}>
                {voteCount > 0 && (
                  <span style={s.voteCount}>{voteCount} votes</span>
                )}
                <button
                  onClick={() => !alreadyVoted && onVote(p.id)}
                  disabled={alreadyVoted}
                  style={{
                    ...s.voteBtn,
                    ...(isMyTarget   ? s.voteBtnSelected : {}),
                    ...(alreadyVoted ? s.voteBtnDisabled : {}),
                  }}
                >
                  {isMyTarget ? 'เลือกแล้ว' : 'โหวต'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!alreadyVoted && (
        <p style={s.hint}>กดโหวต 1 ครั้ง — เปลี่ยนใจไม่ได้</p>
      )}
    </div>
  );
}

const s = {
  panel: {
    background:    'var(--color-surface)',
    border:        '1px solid var(--color-border)',
    borderRadius:  'var(--radius-lg)',
    padding:       '16px',
    display:       'flex',
    flexDirection: 'column',
    gap:           '12px',
  },
  header: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
  },
  icon:    { fontSize: '2rem', lineHeight: 1 },
  title:   { fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-accent)' },
  sub:     { fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' },

  progressRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
  },
  progressLabel: { fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 },
  progressTrack: {
    flex:         1,
    height:       '6px',
    background:   'var(--color-surface-2)',
    borderRadius: '3px',
    overflow:     'hidden',
    border:       '1px solid var(--color-border)',
  },
  progressFill: {
    height:     '100%',
    background: '#7c6bbf',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  },

  myVoteBox: {
    background:   'rgba(232,160,39,.08)',
    border:       '1px solid var(--color-accent-dim)',
    borderRadius: 'var(--radius-md)',
    padding:      '8px 12px',
    fontSize:     '13px',
    color:        'var(--color-text-muted)',
  },

  list: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '6px',
  },
  row: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '10px 12px',
    borderRadius:   'var(--radius-md)',
    border:         '1px solid var(--color-border)',
    gap:            '8px',
  },
  playerInfo: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1 },
  avatar:     { fontSize: '16px' },
  name:       { fontWeight: 600, fontSize: '14px' },
  votedBadge: {
    fontSize:     '10px',
    fontWeight:   700,
    background:   'var(--color-village)',
    color:        '#a8d8c8',
    borderRadius: '999px',
    padding:      '1px 6px',
    textTransform:'uppercase',
  },

  right:     { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  voteCount: { fontSize: '12px', color: 'var(--color-text-muted)' },

  voteBtn: {
    padding:      '6px 14px',
    borderRadius: 'var(--radius-md)',
    background:   'var(--color-surface)',
    border:       '1px solid var(--color-border)',
    color:        'var(--color-text)',
    fontFamily:   'var(--font-body)',
    fontWeight:   700,
    fontSize:     '12px',
    cursor:       'pointer',
    transition:   'background var(--transition)',
    whiteSpace:   'nowrap',
  },
  voteBtnSelected: {
    background:   'var(--color-accent)',
    border:       '1px solid var(--color-accent)',
    color:        '#0d1117',
  },
  voteBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },

  hint: {
    fontSize:  '11px',
    color:     'var(--color-text-muted)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
};