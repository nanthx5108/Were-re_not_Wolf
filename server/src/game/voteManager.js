const voteStore = new Map();

export function initVoting(roomId) {
  voteStore.set(roomId, new Map());
}

export function castVote(roomId, voterId, targetId) {
  const roomVotes = voteStore.get(roomId);
  if (!roomVotes) return null;
  roomVotes.set(voterId, targetId);
  return getVoteData(roomId);
}

export function getVoteData(roomId) {
  const roomVotes = voteStore.get(roomId) || new Map();
  const voteMap = {};
  const counts  = {};
  for (const [voter, target] of roomVotes) {
    voteMap[voter] = target;
    counts[target] = (counts[target] || 0) + 1;
  }
  return { voteMap, counts };
}

export function resolveVotes(roomId, alivePlayerIds) {
  const { counts } = getVoteData(roomId);

  let maxVotes  = 0;
  let candidates = [];

  for (const [targetId, count] of Object.entries(counts)) {
    if (!alivePlayerIds.includes(targetId)) continue;
    if (count > maxVotes)      { maxVotes = count; candidates = [targetId]; }
    else if (count === maxVotes) { candidates.push(targetId); }
  }

  const wasTie      = candidates.length > 1;
  const eliminatedId = (candidates.length === 1 && maxVotes > 0) ? candidates[0] : null;

  return { eliminatedId, tally: counts, wasTie };
}

export function clearVoting(roomId) {
  voteStore.delete(roomId);
}

export function hasAllVoted(roomId, alivePlayerIds) {
  const roomVotes = voteStore.get(roomId);
  if (!roomVotes || alivePlayerIds.length === 0) return false;
  return alivePlayerIds.every(id => roomVotes.has(id));
}