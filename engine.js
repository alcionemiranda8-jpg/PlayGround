/* Núcleo da liga: estado, tabelas, simulação e temporadas */
function rand(n) { return Math.floor(Math.random() * n); }
function pick(arr) { return arr[rand(arr.length)]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function poisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L && k < 12);
  return k - 1;
}

function cloneClub(c) { return Object.assign({}, c); }

function makeTable(clubs) {
  const t = {};
  clubs.forEach(c => {
    t[c.id] = { p: 0, j: 0, v: 0, e: 0, d: 0, gf: 0, gs: 0, gd: 0, form: [] };
  });
  return t;
}

function roundRobin(ids) {
  const arr = ids.slice();
  const n = arr.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      pairs.push(r % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  return rounds;
}

function doubleRoundRobin(ids) {
  const first = roundRobin(ids);
  const second = first.map(round => round.map(m => ({ home: m.away, away: m.home })));
  return first.concat(second);
}

function buildLeagueDiv(id, clubs) {
  const schedule = doubleRoundRobin(clubs.map(c => c.id));
  return {
    id, name: DIV_NAME[id], clubs,
    table: makeTable(clubs), schedule, round: 0, finished: false
  };
}

function buildD(clubs) {
  const player = clubs.find(c => c.id === PLAYER_ID);
  const rest = shuffle(clubs.filter(c => c.id !== PLAYER_ID));
  const groups = 'ABCDEFGH'.split('').map((gid, i) => {
    const gc = i === 0 && player ? [player, ...rest.splice(0, 7)] : rest.splice(0, 8);
    return {
      id: gid, clubs: gc, table: makeTable(gc),
      schedule: doubleRoundRobin(gc.map(c => c.id)), round: 0
    };
  });
  return {
    id: 'D', name: DIV_NAME.D, groups, phase: 'groups', koRound: 0,
    koRounds: [], finished: false, champion: null, promoted: [], playerExit: null
  };
}

function makeSquad() {
  return INITIAL_SQUAD.map(p => Object.assign({ goals: 0 }, p));
}

function createInitialState() {
  return {
    version: 3, season: 2026, playerDivision: 'D', screen: 'home',
    divisions: {
      A: buildLeagueDiv('A', A_CLUBS.map(cloneClub)),
      B: buildLeagueDiv('B', B_CLUBS.map(cloneClub)),
      C: buildLeagueDiv('C', C_CLUBS.map(cloneClub)),
      D: buildD(D_CLUBS.map(cloneClub))
    },
    squad: makeSquad(),
    tactic: 'equilibrado',
    history: [], lastResults: [],
    seasonEnded: false, pendingSeason: null, match: null,
    selectedDivision: 'D', selectedGroup: null
  };
}

let S = null;

function save() {
  try {
    const snapshot = Object.assign({}, S, { match: null });
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    const pill = document.getElementById('savePill');
    if (pill) {
      pill.textContent = 'Salvo';
      pill.classList.remove('saving');
    }
  } catch (e) { /* armazenamento indisponível */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.version !== 3 || !s.divisions || !s.squad) return null;
    s.match = null;
    s.pendingSeason = s.pendingSeason || null;
    s.selectedDivision = s.selectedDivision || s.playerDivision;
    s.selectedGroup = s.selectedGroup || null;
    if (!['home', 'league', 'squad', 'match'].includes(s.screen)) s.screen = 'home';
    return s;
  } catch (e) { return null; }
}

function allClubs() {
  const out = [];
  DIV_ORDER.forEach(d => {
    if (d === 'D') S.divisions.D.groups.forEach(g => out.push(...g.clubs));
    else out.push(...S.divisions[d].clubs);
  });
  return out;
}

function getClub(id) {
  return allClubs().find(c => c.id === id) || null;
}

function playerClub() { return getClub(PLAYER_ID); }

function standings(clubs, table) {
  return clubs.map(c => Object.assign({ club: c }, table[c.id]))
    .sort((a, b) =>
      b.p - a.p || b.v - a.v || b.gd - a.gd || b.gf - a.gf ||
      a.club.name.localeCompare(b.club.name, 'pt-BR')
    );
}

function record(table, homeId, awayId, hg, ag) {
  const H = table[homeId], A = table[awayId];
  if (!H || !A) return;
  H.j++; A.j++;
  H.gf += hg; H.gs += ag; A.gf += ag; A.gs += hg;
  H.gd = H.gf - H.gs; A.gd = A.gf - A.gs;
  if (hg > ag) {
    H.p += 3; H.v++; A.d++; H.form.push('V'); A.form.push('D');
  } else if (hg < ag) {
    A.p += 3; A.v++; H.d++; A.form.push('V'); H.form.push('D');
  } else {
    H.p++; A.p++; H.e++; A.e++; H.form.push('E'); A.form.push('E');
  }
  if (H.form.length > 5) H.form.shift();
  if (A.form.length > 5) A.form.shift();
}

function expectedGoals(attack, defense, advantage) {
  const diff = (attack.strength + advantage) - defense.strength;
  return clamp(1.32 * Math.exp(diff / 11), 0.22, 3.9);
}

function simulatePens(home, away) {
  let h = 0, a = 0;
  for (let i = 0; i < 5; i++) {
    if (Math.random() < 0.74) h++;
    if (Math.random() < 0.74) a++;
  }
  let guard = 0;
  while (h === a && guard < 30) {
    h += Math.random() < 0.7 ? 1 : 0;
    a += Math.random() < 0.7 ? 1 : 0;
    guard++;
  }
  if (h === a) h++;
  return [h, a];
}

function simScore(home, away, knockout) {
  const hg = poisson(expectedGoals(home, away, 3));
  const ag = poisson(expectedGoals(away, home, -3));
  let pens = null, winner = null;
  if (knockout && hg === ag) {
    pens = simulatePens(home, away);
    winner = pens[0] > pens[1] ? home.id : away.id;
  } else {
    winner = hg > ag ? home.id : ag > hg ? away.id : null;
  }
  return { hg, ag, pens, winner };
}

function simulateFixture(f, table) {
  if (f.result) return;
  const r = simScore(getClub(f.home), getClub(f.away), false);
  f.result = { hg: r.hg, ag: r.ag };
  record(table, f.home, f.away, r.hg, r.ag);
}

function simulateLeagueRound(div) {
  if (div.finished || div.round >= div.schedule.length) return;
  div.schedule[div.round].forEach(f => simulateFixture(f, div.table));
  div.round++;
  if (div.round >= div.schedule.length) div.finished = true;
}

function simulateGroupRound(group) {
  if (group.round >= group.schedule.length) return;
  group.schedule[group.round].forEach(f => simulateFixture(f, group.table));
  group.round++;
}

function getPlayerGroup(D) {
  return (D || S.divisions.D).groups.find(g => g.clubs.some(c => c.id === PLAYER_ID)) || null;
}

function playerStatus() {
  const div = S.playerDivision;
  if (div === 'D') {
    const g = getPlayerGroup();
    if (!g) return { pos: 0, pts: 0, j: 0, total: 0, rows: [], group: '-' };
    const rows = standings(g.clubs, g.table);
    const i = rows.findIndex(r => r.club.id === PLAYER_ID);
    return {
      pos: i + 1, pts: rows[i] ? rows[i].p : 0, j: rows[i] ? rows[i].j : 0,
      total: g.clubs.length, rows, group: g.id
    };
  }
  const d = S.divisions[div];
  const rows = standings(d.clubs, d.table);
  const i = rows.findIndex(r => r.club.id === PLAYER_ID);
  return {
    pos: i + 1, pts: rows[i] ? rows[i].p : 0, j: rows[i] ? rows[i].j : 0,
    total: d.clubs.length, rows, group: null
  };
}

function getPlayerFixture() {
  if (S.seasonEnded) return null;
  const div = S.playerDivision;
  if (div !== 'D') {
    const d = S.divisions[div];
    if (d.round >= d.schedule.length) return null;
    const f = d.schedule[d.round].find(m => m.home === PLAYER_ID || m.away === PLAYER_ID);
    return f ? Object.assign({ stage: 'league', div, roundIndex: d.round }, f) : null;
  }
  const D = S.divisions.D;
  if (D.phase === 'groups') {
    const g = getPlayerGroup(D);
    if (!g || g.round >= g.schedule.length) return null;
    const f = g.schedule[g.round].find(m => m.home === PLAYER_ID || m.away === PLAYER_ID);
    return f ? Object.assign({ stage: 'group', groupId: g.id, roundIndex: g.round }, f) : null;
  }
  if (D.phase === 'ko') {
    const round = D.koRounds[D.koRound];
    const i = round.ties.findIndex(t => !t.winner && (t.home === PLAYER_ID || t.away === PLAYER_ID));
    if (i >= 0) {
      const t = round.ties[i];
      return { stage: 'ko', koRound: D.koRound, tieIndex: i, home: t.home, away: t.away };
    }
  }
  return null;
}

function fixtureLabel(fx) {
  if (!fx) return 'Sem partida';
  if (fx.stage === 'league') return `${DIV_NAME[fx.div]} · Rodada ${fx.roundIndex + 1}`;
  if (fx.stage === 'group') return `Série D · Grupo ${fx.groupId} · Rodada ${fx.roundIndex + 1}`;
  if (fx.stage === 'ko') return `Série D · ${KO_NAMES[fx.koRound]}`;
  return 'Partida';
}

function upcomingPlayerFixtures(n) {
  const out = [];
  if (S.playerDivision !== 'D') {
    const d = S.divisions[S.playerDivision];
    for (let r = d.round; r < d.schedule.length && out.length < n; r++) {
      const f = d.schedule[r].find(m => m.home === PLAYER_ID || m.away === PLAYER_ID);
      if (f) out.push(Object.assign({ stage: 'league', div: S.playerDivision, roundIndex: r }, f));
    }
  } else {
    const D = S.divisions.D;
    if (D.phase === 'groups') {
      const g = getPlayerGroup(D);
      if (g) for (let r = g.round; r < g.schedule.length && out.length < n; r++) {
        const f = g.schedule[r].find(m => m.home === PLAYER_ID || m.away === PLAYER_ID);
        if (f) out.push(Object.assign({ stage: 'group', groupId: g.id, roundIndex: r }, f));
      }
    } else if (D.phase === 'ko') {
      const f = getPlayerFixture();
      if (f) out.push(f);
    }
  }
  return out;
}

function rowFor(clubId) {
  for (const d of DIV_ORDER) {
    if (d === 'D') {
      for (const g of S.divisions.D.groups) {
        if (g.table[clubId]) return g.table[clubId];
      }
    } else if (S.divisions[d].table[clubId]) {
      return S.divisions[d].table[clubId];
    }
  }
  return { form: [] };
}

/* ---------- mata-mata da Série D ---------- */
function simulateTie(tie) {
  if (tie.winner) return;
  const r = simScore(getClub(tie.home), getClub(tie.away), true);
  tie.score = [r.hg, r.ag];
  tie.pens = r.pens;
  tie.winner = r.winner;
  tie.simulated = true;
}

function simulateNonPlayerTies(round) {
  round.ties.forEach(t => {
    if (!t.winner && t.home !== PLAYER_ID && t.away !== PLAYER_ID) simulateTie(t);
  });
}

function allDecided(round) { return round.ties.every(t => t.winner); }

function createNextRound(D) {
  const winners = D.koRounds[D.koRound].ties.map(t => t.winner);
  const ties = [];
  for (let i = 0; i < winners.length; i += 2) {
    ties.push({ home: winners[i], away: winners[i + 1], score: null, pens: null, winner: null, simulated: false });
  }
  D.koRound++;
  D.koRounds.push({ name: KO_NAMES[D.koRound], ties });
}

function buildKnockout(D) {
  const q = [];
  D.groups.forEach(g => {
    const top = standings(g.clubs, g.table).slice(0, 2);
    q.push(top[0].club.id, top[1].club.id);
  });
  const pairs = [
    [q[0], q[3]], [q[4], q[7]], [q[8], q[11]], [q[12], q[15]],
    [q[2], q[1]], [q[6], q[5]], [q[10], q[9]], [q[14], q[13]]
  ];
  const ties = pairs.map(p => ({ home: p[0], away: p[1], score: null, pens: null, winner: null, simulated: false }));
  D.koRounds = [{ name: KO_NAMES[0], ties }];
  D.koRound = 0;
  D.phase = 'ko';
  simulateNonPlayerTies(D.koRounds[0]);
  if (!ties.some(t => t.home === PLAYER_ID || t.away === PLAYER_ID)) {
    D.playerExit = 'Fase de grupos';
    simulateRestOfD(D);
  }
}

function advanceKnockout(D) {
  const round = D.koRounds[D.koRound];
  if (!allDecided(round)) return;
  if (D.koRound === 3) { finishD(D); return; }
  createNextRound(D);
  const next = D.koRounds[D.koRound];
  simulateNonPlayerTies(next);
  if (!next.ties.some(t => t.home === PLAYER_ID || t.away === PLAYER_ID)) {
    D.playerExit = KO_NAMES[D.koRound - 1];
    simulateRestOfD(D);
  }
}

function simulateRestOfD(D) {
  if (D.phase !== 'ko') return;
  while (true) {
    const round = D.koRounds[D.koRound];
    round.ties.forEach(t => { if (!t.winner) simulateTie(t); });
    if (D.koRound === 3) break;
    createNextRound(D);
  }
  finishD(D);
}

function finishD(D) {
  D.champion = D.koRounds[3].ties[0].winner;
  D.promoted = D.koRounds[1].ties.map(t => t.winner);
  D.phase = 'done';
  D.finished = true;
}

/* ---------- avanço do resto do mundo ---------- */
function advanceLeague(div) {
  if (!div.finished && div.round < div.schedule.length) simulateLeagueRound(div);
}

function advanceD(D) {
  if (D.finished) return;
  if (D.phase === 'groups') {
    D.groups.forEach(g => { if (g.round < g.schedule.length) simulateGroupRound(g); });
    if (D.groups.every(g => g.round >= g.schedule.length)) {
      buildKnockout(D);
      if (D.phase === 'ko') simulateRestOfD(D);
    }
  } else if (D.phase === 'ko') {
    simulateRestOfD(D);
  }
}

function advanceOtherDivisions() {
  DIV_ORDER.forEach(id => {
    if (id === S.playerDivision) return;
    if (id === 'D') advanceD(S.divisions.D);
    else advanceLeague(S.divisions[id]);
  });
}

function applyPlayerResult(m) {
  if (m.stage === 'league') {
    const div = S.divisions[m.div];
    const round = div.schedule[m.roundIndex];
    const f = round.find(x => x.home === m.home.id && x.away === m.away.id);
    if (f) f.result = { hg: m.score[0], ag: m.score[1] };
    record(div.table, m.home.id, m.away.id, m.score[0], m.score[1]);
    round.forEach(x => { if (!x.result) simulateFixture(x, div.table); });
    div.round++;
    if (div.round >= div.schedule.length) div.finished = true;
    return;
  }
  if (m.stage === 'group') {
    const D = S.divisions.D;
    const g = D.groups.find(x => x.id === m.groupId);
    if (!g) return;
    const round = g.schedule[m.roundIndex];
    const f = round.find(x => x.home === m.home.id && x.away === m.away.id);
    if (f) f.result = { hg: m.score[0], ag: m.score[1] };
    record(g.table, m.home.id, m.away.id, m.score[0], m.score[1]);
    round.forEach(x => { if (!x.result) simulateFixture(x, g.table); });
    g.round++;
    D.groups.forEach(og => {
      if (og.id !== g.id && og.round < og.schedule.length) simulateGroupRound(og);
    });
    if (D.groups.every(x => x.round >= x.schedule.length)) buildKnockout(D);
    return;
  }
  if (m.stage === 'ko') {
    const D = S.divisions.D;
    const round = D.koRounds[m.koRound];
    const tie = round.ties[m.tieIndex];
    if (!tie) return;
    tie.score = [m.score[0], m.score[1]];
    tie.pens = m.pens || null;
    tie.winner = m.winner;
    tie.simulated = true;
    simulateNonPlayerTies(round);
    if (allDecided(round)) advanceKnockout(D);
  }
}

function checkSeasonEnd() {
  if (S.seasonEnded) return;
  if (S.playerDivision === 'D') {
    if (S.divisions.D.phase === 'done' || S.divisions.D.finished) endSeason();
  } else {
    const d = S.divisions[S.playerDivision];
    if (d.finished || d.round >= d.schedule.length) endSeason();
  }
}

function fastForwardAll() {
  DIV_ORDER.forEach(id => {
    const d = S.divisions[id];
    if (id === 'D') {
      if (d.phase === 'groups') {
        d.groups.forEach(g => { while (g.round < g.schedule.length) simulateGroupRound(g); });
        buildKnockout(d);
      }
      if (d.phase === 'ko') simulateRestOfD(d);
    } else {
      while (d.round < d.schedule.length) simulateLeagueRound(d);
      d.finished = true;
    }
  });
}

function buildSeasonSummary() {
  const stA = standings(S.divisions.A.clubs, S.divisions.A.table);
  const stB = standings(S.divisions.B.clubs, S.divisions.B.table);
  const stC = standings(S.divisions.C.clubs, S.divisions.C.table);
  const D = S.divisions.D;
  const pd = S.playerDivision;
  let playerPosition = '—', playerOutcome = '', playerPromoted = false, playerRelegated = false;

  if (pd === 'D') {
    playerPromoted = D.promoted.includes(PLAYER_ID);
    if (D.champion === PLAYER_ID) {
      playerPosition = 'Campeão';
      playerOutcome = 'Campeão da Série D!';
    } else if (playerPromoted) {
      playerPosition = 'Semifinalista';
      playerOutcome = 'Acesso à Série C conquistado!';
    } else {
      playerPosition = D.playerExit || 'Fase de grupos';
      playerOutcome = playerPosition === 'Fase de grupos'
        ? 'Eliminado na fase de grupos.'
        : `Eliminado nas ${playerPosition.toLowerCase()}.`;
    }
  } else {
    const st = pd === 'A' ? stA : pd === 'B' ? stB : stC;
    const i = st.findIndex(r => r.club.id === PLAYER_ID);
    playerPosition = (i + 1) + 'º lugar';
    playerPromoted = pd !== 'A' && i < 4;
    playerRelegated = i >= 16;
    if (pd === 'A') {
      playerOutcome = i === 0 ? 'Campeão brasileiro!' : playerRelegated ? 'Rebaixado para a Série B.' : `${i + 1}º lugar na Série A.`;
    } else if (pd === 'B') {
      playerOutcome = playerPromoted ? 'Acesso à Série A!' : playerRelegated ? 'Rebaixado para a Série C.' : `${i + 1}º lugar na Série B.`;
    } else {
      playerOutcome = playerPromoted ? 'Acesso à Série B!' : playerRelegated ? 'Rebaixado para a Série D.' : `${i + 1}º lugar na Série C.`;
    }
  }

  return {
    season: S.season,
    championA: stA[0].club.name,
    championB: stB[0].club.name,
    championC: stC[0].club.name,
    championD: getClub(D.champion) ? getClub(D.champion).name : '—',
    playerDivision: pd,
    playerPosition,
    playerOutcome,
    playerPromoted,
    playerRelegated,
    promotedA: stB.slice(0, 4).map(r => r.club.name),
    relegatedA: stA.slice(-4).map(r => r.club.name),
    promotedB: stC.slice(0, 4).map(r => r.club.name),
    relegatedB: stB.slice(-4).map(r => r.club.name),
    promotedC: D.promoted.map(id => getClub(id).name),
    relegatedC: stC.slice(-4).map(r => r.club.name)
  };
}

function endSeason() {
  if (S.seasonEnded) return;
  fastForwardAll();
  S.pendingSeason = buildSeasonSummary();
  S.seasonEnded = true;
  S.history.push({
    season: S.pendingSeason.season,
    division: S.pendingSeason.playerDivision,
    outcome: S.pendingSeason.playerOutcome,
    championA: S.pendingSeason.championA
  });
  save();
  renderAll();
  if (S.screen !== 'match') openSeasonSummary();
}

function adjustStrength(c, delta) {
  c.strength = clamp(c.strength + delta, 55, 92);
}

function makeYouth(index) {
  const pos = pick(POS_ORDER);
  return {
    name: pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES),
    pos, overall: 64 + rand(8), age: 18 + rand(3),
    number: 30 + index, goals: 0
  };
}

function startNextSeason() {
  if (!S.pendingSeason) return;
  const stA = standings(S.divisions.A.clubs, S.divisions.A.table).map(r => r.club);
  const stB = standings(S.divisions.B.clubs, S.divisions.B.table).map(r => r.club);
  const stC = standings(S.divisions.C.clubs, S.divisions.C.table).map(r => r.club);
  const D = S.divisions.D;
  const promotedD = D.promoted.map(getClub).filter(Boolean);

  const relegatedA = stA.slice(-4);
  const promotedB = stB.slice(0, 4);
  const relegatedB = stB.slice(-4);
  const promotedC = stC.slice(0, 4);
  const relegatedC = stC.slice(-4);

  const oldA = S.divisions.A.clubs;
  const oldB = S.divisions.B.clubs;
  const oldC = S.divisions.C.clubs;
  const oldD = D.groups.flatMap(g => g.clubs);

  const newA = oldA.filter(c => !relegatedA.some(x => x.id === c.id)).concat(promotedB);
  const newB = oldB.filter(c => !promotedB.some(x => x.id === c.id) && !relegatedB.some(x => x.id === c.id))
    .concat(relegatedA, promotedC);
  const newC = oldC.filter(c => !promotedC.some(x => x.id === c.id) && !relegatedC.some(x => x.id === c.id))
    .concat(relegatedB, promotedD);
  const newD = oldD.filter(c => !promotedD.some(x => x.id === c.id)).concat(relegatedC);

  promotedB.forEach(c => adjustStrength(c, 3));
  relegatedA.forEach(c => adjustStrength(c, -2));
  promotedC.forEach(c => adjustStrength(c, 3));
  relegatedB.forEach(c => adjustStrength(c, -2));
  promotedD.forEach(c => adjustStrength(c, 3));
  relegatedC.forEach(c => adjustStrength(c, -2));
  stA[0] && adjustStrength(stA[0], 2);
  stB[0] && adjustStrength(stB[0], 2);
  stC[0] && adjustStrength(stC[0], 2);

  if (newA.some(c => c.id === PLAYER_ID)) S.playerDivision = 'A';
  else if (newB.some(c => c.id === PLAYER_ID)) S.playerDivision = 'B';
  else if (newC.some(c => c.id === PLAYER_ID)) S.playerDivision = 'C';
  else S.playerDivision = 'D';

  S.squad.forEach((p, i) => {
    p.age++;
    p.goals = 0;
    if (p.age >= 36) {
      Object.assign(p, makeYouth(i));
    } else if (p.overall < 82 && Math.random() < 0.45) {
      p.overall++;
    }
    if (S.pendingSeason.playerPromoted) p.overall = clamp(p.overall + 2, 55, 90);
    if (S.pendingSeason.playerRelegated) p.overall = clamp(p.overall - 1, 55, 90);
  });

  S.season++;
  S.divisions = {
    A: buildLeagueDiv('A', newA),
    B: buildLeagueDiv('B', newB),
    C: buildLeagueDiv('C', newC),
    D: buildD(newD)
  };
  S.selectedDivision = S.playerDivision;
  S.selectedGroup = null;
  S.seasonEnded = false;
  S.pendingSeason = null;
  S.match = null;
  S.lastResults = [];
  S.screen = 'home';
  save();
  closeModal();
  renderAll();
  toast(`Temporada ${S.season} iniciada na ${DIV_SHORT[S.playerDivision]}`);
}
