/* Motor da partida do jogador */
function tacticFactors(tactic, playerSide) {
  const atk = tactic === 'atacando' ? 1.28 : tactic === 'defendendo' ? 0.78 : 1;
  const def = tactic === 'atacando' ? 1.16 : tactic === 'defendendo' ? 0.74 : 1;
  return playerSide === 'home' ? { home: atk, away: def } : { home: def, away: atk };
}

function playerSquad() { return S.squad || []; }

function pickName(club) {
  if (club.id === PLAYER_ID) {
    const pool = playerSquad().filter(p => p.pos !== 'GOL');
    return pool.length ? pick(pool).name : 'Verde FC';
  }
  return pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES);
}

function pickScorer(club) {
  if (club.id === PLAYER_ID) {
    const weights = { ATA: 6, PON: 4, MEI: 2.4, VOL: 1.1, LAT: 0.65, ZAG: 0.45, GOL: 0.04 };
    const pool = playerSquad();
    const total = pool.reduce((s, p) => s + (weights[p.pos] || 0.5), 0);
    let r = Math.random() * total;
    for (const p of pool) {
      r -= weights[p.pos] || 0.5;
      if (r <= 0) {
        p.goals = (p.goals || 0) + 1;
        return p.name;
      }
    }
    const p = pick(pool);
    p.goals = (p.goals || 0) + 1;
    return p.name;
  }
  return pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES);
}

function matchEvent(text, type) {
  const m = S.match;
  if (!m) return;
  m.events.unshift({ min: m.minute, text, type: type || 'info' });
  if (m.events.length > 40) m.events.pop();
}

function scoreGoal(side) {
  const m = S.match;
  const idx = side === 'home' ? 0 : 1;
  const club = side === 'home' ? m.home : m.away;
  m.score[idx]++;
  m.stats.shots[idx]++;
  m.stats.onTarget[idx]++;
  const scorer = pickScorer(club);
  m.scorers.push({ club: club.name, name: scorer, min: m.minute });
  m.events.unshift({ min: m.minute, text: `⚽ GOL! ${scorer} marca para ${club.name}.`, type: 'goal' });
  m.ball = { x: side === 'home' ? 88 : 12, y: 42 + rand(16) };
  if (m.events.length > 40) m.events.pop();
}

function takeShot(side) {
  const m = S.match;
  const idx = side === 'home' ? 0 : 1;
  const club = side === 'home' ? m.home : m.away;
  m.stats.shots[idx]++;
  const name = pickName(club);
  if (Math.random() < 0.42) {
    m.stats.onTarget[idx]++;
    matchEvent(`${name} finaliza para o gol, mas a defesa afasta.`, 'shot');
  } else {
    matchEvent(`${name} arrisca de fora e a bola passa perto.`, 'shot');
  }
  m.ball = { x: side === 'home' ? 78 : 22, y: 25 + rand(50) };
}

function startMatch(fx) {
  if (!fx) fx = getPlayerFixture();
  if (!fx) { toast('Nenhuma partida disponível.'); return; }
  const home = getClub(fx.home);
  const away = getClub(fx.away);
  if (!home || !away) { toast('Partida inválida.'); return; }
  S.match = {
    stage: fx.stage, div: fx.div, roundIndex: fx.roundIndex,
    groupId: fx.groupId, koRound: fx.koRound, tieIndex: fx.tieIndex,
    home, away, score: [0, 0], minute: 0,
    events: [{ min: 0, text: `Bola rolando: ${home.name} x ${away.name}.`, type: 'info' }],
    stats: { poss: [50, 50], shots: [0, 0], onTarget: [0, 0], corners: [0, 0] },
    tactic: S.tactic, finished: false,
    knockout: fx.stage === 'ko', pens: null, winner: null,
    ball: { x: 50, y: 50 },
    playerSide: fx.home === PLAYER_ID ? 'home' : 'away',
    scorers: []
  };
  S.screen = 'match';
  save();
  renderAll();
}

function advanceLive(mins, silent) {
  const m = S.match;
  if (!m || m.finished) return;
  const chunks = Math.max(1, Math.ceil((mins || 5) / 5));
  for (let c = 0; c < chunks && !m.finished; c++) {
    m.minute = Math.min(90, m.minute + 5);
    const baseH = expectedGoals(m.home, m.away, 3);
    const baseA = expectedGoals(m.away, m.home, -3);
    const tf = tacticFactors(m.tactic, m.playerSide);
    const xgH = baseH * tf.home;
    const xgA = baseA * tf.away;

    let poss = 50 + (m.home.strength - m.away.strength) * 0.65;
    if (m.playerSide === 'home') {
      poss += m.tactic === 'defendendo' ? 3 : m.tactic === 'atacando' ? -3 : 0;
    } else {
      poss -= m.tactic === 'defendendo' ? 3 : m.tactic === 'atacando' ? -3 : 0;
    }
    poss = clamp(poss + rand(9) - 4, 32, 68);
    m.stats.poss = [Math.round(poss), 100 - Math.round(poss)];

    if (Math.random() < 0.26) takeShot('home');
    if (Math.random() < 0.26) takeShot('away');

    if (Math.random() < xgH * 5 / 90) scoreGoal('home');
    if (Math.random() < xgA * 5 / 90) scoreGoal('away');

    if (Math.random() < 0.055) {
      const side = Math.random() < 0.5 ? 'home' : 'away';
      const club = side === 'home' ? m.home : m.away;
      matchEvent(`Cartão amarelo para ${pickName(club)}.`, 'card');
    }
    if (Math.random() < 0.03) {
      const side = Math.random() < 0.5 ? 'home' : 'away';
      m.stats.corners[side === 'home' ? 0 : 1]++;
      m.ball = { x: side === 'home' ? 92 : 8, y: 30 + rand(40) };
      matchEvent(`Escanteio para o ${side === 'home' ? m.home.name : m.away.name}.`, 'corner');
    }
    if (m.minute >= 90) finishLiveMatch();
  }
  if (!silent) { renderMatch(); save(); }
}

function finishLiveMatch() {
  const m = S.match;
  if (!m || m.finished) return;
  m.finished = true;
  m.minute = 90;
  if (m.knockout && m.score[0] === m.score[1]) {
    m.pens = simulatePens(m.home, m.away);
    m.winner = m.pens[0] > m.pens[1] ? m.home.id : m.away.id;
    m.events.unshift({
      min: 90,
      text: `Disputa de pênaltis: ${m.pens[0]} x ${m.pens[1]}. ${getClub(m.winner).name} avança.`,
      type: 'goal'
    });
  } else {
    m.winner = m.score[0] > m.score[1] ? m.home.id : m.score[1] > m.score[0] ? m.away.id : null;
  }
  afterPlayerMatch(m);
  save();
  renderAll();
}

function simulatePlayerMatch() {
  const fx = getPlayerFixture();
  if (!fx) { toast('Nenhuma partida disponível.'); return; }
  const home = getClub(fx.home), away = getClub(fx.away);
  if (!home || !away) return;
  const r = simScore(home, away, fx.stage === 'ko');
  const playerHome = home.id === PLAYER_ID;
  const gf = playerHome ? r.hg : r.ag;
  const ga = playerHome ? r.ag : r.hg;
  const scorers = [];
  if (home.id === PLAYER_ID) {
    for (let i = 0; i < r.hg; i++) scorers.push({ club: home.name, name: pickScorer(home), min: 10 + rand(80) });
  }
  if (away.id === PLAYER_ID) {
    for (let i = 0; i < r.ag; i++) scorers.push({ club: away.name, name: pickScorer(away), min: 10 + rand(80) });
  }
  const m = {
    stage: fx.stage, div: fx.div, roundIndex: fx.roundIndex,
    groupId: fx.groupId, koRound: fx.koRound, tieIndex: fx.tieIndex,
    home, away, score: [r.hg, r.ag], minute: 90,
    events: [{ min: 90, text: 'Partida simulada pelo técnico.', type: 'info' }],
    stats: {
      poss: [50 + rand(11) - 5, 50 - rand(11) + 5],
      shots: [6 + rand(9), 6 + rand(9)],
      onTarget: [2 + rand(5), 2 + rand(5)],
      corners: [2 + rand(7), 2 + rand(7)]
    },
    tactic: S.tactic, finished: true,
    knockout: fx.stage === 'ko', pens: r.pens, winner: r.winner,
    ball: { x: 50, y: 50 },
    playerSide: playerHome ? 'home' : 'away',
    scorers, simulated: true
  };
  m.stats.poss = [m.stats.poss[0], 100 - m.stats.poss[0]];
  S.match = m;
  afterPlayerMatch(m);
  save();
  renderAll();
}

function afterPlayerMatch(m) {
  const playerHome = m.home.id === PLAYER_ID;
  const opp = playerHome ? m.away : m.home;
  const gf = playerHome ? m.score[0] : m.score[1];
  const ga = playerHome ? m.score[1] : m.score[0];
  let res = 'E';
  if (m.knockout && m.winner) res = m.winner === PLAYER_ID ? 'V' : 'D';
  else res = gf > ga ? 'V' : gf < ga ? 'D' : 'E';
  S.lastResults.unshift({
    season: S.season, comp: fixtureLabel(m), opponent: opp.name,
    gf, ga, home: playerHome, result: res, pens: m.pens
  });
  S.lastResults = S.lastResults.slice(0, 6);

  applyPlayerResult(m);
  advanceOtherDivisions();
  checkSeasonEnd();
  save();
}

function setTactic(t) {
  S.tactic = t;
  if (S.match && !S.match.finished) S.match.tactic = t;
  save();
  renderMatch();
  toast(t === 'atacando' ? 'Postura ofensiva' : t === 'defendendo' ? 'Postura defensiva' : 'Postura equilibrada');
}

function goMatch() {
  S.screen = 'match';
  renderAll();
  save();
}
