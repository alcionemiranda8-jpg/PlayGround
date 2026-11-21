/* Interface e navegação */
const $ = id => document.getElementById(id);

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function textColor(hex) {
  const h = (hex || '#2f9e5f').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0b1b13' : '#ffffff';
}

function crest(club, size) {
  if (!club) return '<div class="crest sm" style="background:#24382c;color:#9fb2a4">?</div>';
  const cls = size === 'sm' ? ' sm' : size === 'xs' ? ' xs' : '';
  return `<div class="crest${cls}" style="background:${club.color};color:${textColor(club.color)}">${esc(club.short)}</div>`;
}

function formDots(row) {
  const f = (row && row.form ? row.form : []).slice(-5);
  if (!f.length) return '<span class="dot n">–</span>';
  return f.map(x => `<span class="dot ${x === 'V' ? 'w' : x === 'E' ? 'd' : 'l'}">${x}</span>`).join('');
}

function openModal(html) {
  $('modal').innerHTML = html;
  $('modalBack').classList.add('show');
}

function closeModal() {
  $('modalBack').classList.remove('show');
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

const NAV_ITEMS = [
  { id: 'home', label: 'Central', icon: '◉' },
  { id: 'league', label: 'Competição', icon: '▦' },
  { id: 'squad', label: 'Elenco', icon: '♟' },
  { id: 'match', label: 'Partida', icon: '⚽' }
];

function showScreen(id) {
  if (!NAV_ITEMS.some(n => n.id === id)) return;
  S.screen = id;
  if (id === 'league') {
    if (!S.selectedDivision) S.selectedDivision = S.playerDivision;
    if (S.selectedDivision === 'D' && !S.selectedGroup) {
      const g = getPlayerGroup();
      S.selectedGroup = g ? g.id : 'A';
    }
  }
  renderAll();
  save();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  if (!S) return;
  renderSidebar();
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const map = { home: 'screen-home', league: 'screen-league', squad: 'screen-squad', match: 'screen-match' };
  const el = $(map[S.screen] || 'screen-home');
  if (el) el.classList.add('active');
  const meta = {
    home: ['Central', `Temporada ${S.season} · ${DIV_SHORT[S.playerDivision]}`],
    league: ['Competição', DIV_NAME[S.selectedDivision || S.playerDivision]],
    squad: ['Elenco', `${S.squad.length} jogadores · Média ${Math.round(S.squad.reduce((a, p) => a + p.overall, 0) / S.squad.length)}`],
    match: ['Partida', fixtureLabel(getPlayerFixture())]
  }[S.screen] || ['Central', ''];
  $('pageTitle').textContent = meta[0];
  $('pageSub').textContent = meta[1];
  if (S.screen === 'home') renderHome();
  else if (S.screen === 'league') renderLeague();
  else if (S.screen === 'squad') renderSquad();
  else if (S.screen === 'match') renderMatch();
}

function renderSidebar() {
  $('seasonLabel').textContent = `Temporada ${S.season}`;
  $('divBadge').textContent = `Série ${S.playerDivision}`;
  $('nav').innerHTML = NAV_ITEMS.map(n =>
    `<button class="nav-btn ${S.screen === n.id ? 'active' : ''}" onclick="showScreen('${n.id}')">
      <span class="ic">${n.icon}</span><span>${n.label}</span>
    </button>`
  ).join('');
  const club = playerClub();
  const st = playerStatus();
  if (club) {
    $('clubCard').innerHTML = `
      <div class="club-row">${crest(club, 'sm')}
        <div><strong>${esc(club.name)}</strong><small>${DIV_SHORT[S.playerDivision]} · ${st.j ? st.pos + 'º lugar' : 'Estreia'}</small></div>
      </div>
      <div class="club-meta"><span><b>${st.pts}</b> pts</span><span><b>${st.j}</b> ${st.j === 1 ? 'jogo' : 'jogos'}</span></div>`;
  }
}

function fixtureTeams(fx) {
  if (!fx) return { home: playerClub(), away: null };
  return { home: getClub(fx.home), away: getClub(fx.away) };
}

function renderHome() {
  const club = playerClub();
  const st = playerStatus();
  const fx = getPlayerFixture();
  const div = S.playerDivision;
  const homeClub = fx ? getClub(fx.home) : club;
  const awayClub = fx ? getClub(fx.away) : null;
  const divObj = div === 'D' ? null : S.divisions[div];
  const group = div === 'D' ? getPlayerGroup() : null;
  const progressTotal = div === 'D' ? (group ? group.schedule.length : 0) : (divObj ? divObj.schedule.length : 0);
  const progressDone = div === 'D' ? (group ? group.round : 0) : (divObj ? divObj.round : 0);
  const pct = progressTotal ? Math.round(progressDone / progressTotal * 100) : 0;
  const objective = div === 'A'
    ? 'Terminar no G4 e brigar pelo título brasileiro.'
    : div === 'D'
      ? 'Avançar de grupo e chegar às semifinais para conquistar o acesso à Série C.'
      : `Terminar no G4 e conquistar o acesso à Série ${div === 'B' ? 'A' : 'B'}.`;

  const rows = st.rows || [];
  let mini = rows.slice(0, 6);
  if (st.pos > 6) mini = mini.concat([null, rows[st.pos - 1]]);

  const nexts = upcomingPlayerFixtures(3);
  const recent = S.lastResults.slice(0, 3);

  const hero = fx ? `
    <div class="card hero">
      <div class="hero-top"><span>Próximo jogo · <b>${esc(fixtureLabel(fx))}</b></span><span>${fx.home === PLAYER_ID ? 'Em casa' : 'Fora de casa'}</span></div>
      <div class="teams">
        <div class="team">${crest(homeClub)}<b>${esc(homeClub.name)}</b><small>FOR ${homeClub.strength} · ${fx.home === PLAYER_ID ? 'Você' : 'Adversário'}</small></div>
        <div class="vs">VS</div>
        <div class="team">${crest(awayClub)}<b>${esc(awayClub.name)}</b><small>FOR ${awayClub.strength} · ${fx.away === PLAYER_ID ? 'Você' : 'Adversário'}</small></div>
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="goMatch()">Jogar partida</button>
        <button class="btn" onclick="simulatePlayerMatch()">Simular</button>
      </div>
    </div>` : `
    <div class="card hero">
      <div class="hero-top"><span>Temporada ${S.season}</span><span>${S.seasonEnded ? 'Encerrada' : 'Em andamento'}</span></div>
      <div class="teams">
        <div class="team">${crest(club)}<b>${esc(club.name)}</b><small>${DIV_SHORT[div]} · ${st.pos}º</small></div>
        <div class="vs">—</div>
        <div class="team">${crest(null)}<b>Sem jogo</b><small>${S.seasonEnded ? 'Veja o resumo' : 'Aguardando rodada'}</small></div>
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="${S.seasonEnded ? 'openSeasonSummary()' : "showScreen('league')"}">${S.seasonEnded ? 'Ver resumo da temporada' : 'Ver competição'}</button>
      </div>
    </div>`;

  $('screen-home').innerHTML = `
    <div class="grid home-grid">
      <div class="stack">
        ${hero}
        <div class="stat-strip">
          <div class="stat"><span>Posição</span><b>${st.pos}º</b><small>de ${st.total} clubes</small></div>
          <div class="stat"><span>Pontos</span><b>${st.pts}</b><small>${st.j} ${st.j === 1 ? 'jogo disputado' : 'jogos disputados'}</small></div>
          <div class="stat"><span>Saldo de gols</span><b>${(rows[st.pos - 1] && rows[st.pos - 1].gd > 0 ? '+' : '') + (rows[st.pos - 1] ? rows[st.pos - 1].gd : 0)}</b><small>${rows[st.pos - 1] ? rows[st.pos - 1].gf + ' marcados · ' + rows[st.pos - 1].gs + ' sofridos' : ''}</small></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Últimos resultados</h2><button class="link" onclick="showScreen('league')">Ver competição</button></div>
          ${recent.length ? `<div class="fixtures">${recent.map(r => `
            <div class="fixture">
              <span class="fx-home"><span class="fx-team"><span class="team-name">${esc(r.home ? 'Verde FC' : r.opponent)}</span></span></span>
              <span class="fx-mid"><b>${r.home ? r.gf + ' × ' + r.ga : r.ga + ' × ' + r.gf}</b></span>
              <span class="fx-away"><span class="fx-team"><span class="team-name">${esc(r.home ? r.opponent : 'Verde FC')}</span></span></span>
            </div>`).join('')}</div>` : '<div class="empty"><span class="big">◌</span>Nenhuma partida disputada ainda.</div>'}
        </div>
      </div>
      <div class="stack">
        <div class="card obj-card">
          <h2>Objetivo da temporada</h2>
          <p>${objective}</p>
          <div class="progress"><i style="width:${pct}%"></i></div>
          <div class="progress-meta"><span>${div === 'D' && group ? 'Grupo ' + group.id : DIV_SHORT[div]}</span><span>${progressDone} de ${progressTotal} rodadas</span></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Classificação</h2><button class="link" onclick="showScreen('league')">Ver tudo</button></div>
          <div class="table-wrap mini-table">
            <table class="table">
              <thead><tr><th>#</th><th>Clube</th><th class="num">P</th><th class="num">J</th><th>Últimos</th></tr></thead>
              <tbody>${mini.map((r) => {
                if (!r) return '<tr class="sep"><td colspan="5">···</td></tr>';
                const pos = rows.indexOf(r) + 1;
                return `<tr class="${r.club.id === PLAYER_ID ? 'me' : ''}">
                  <td class="num">${pos}</td>
                  <td><div class="club-cell">${crest(r.club, 'xs')}<b>${esc(r.club.short)}</b></div></td>
                  <td class="num"><b>${r.p}</b></td><td class="num">${r.j}</td>
                  <td><div class="form">${formDots(r)}</div></td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Calendário</h2><span class="mini">${div === 'D' ? 'Série D' : DIV_SHORT[div]}</span></div>
          ${nexts.length ? `<div class="fixtures">${nexts.map(f => {
            const h = getClub(f.home), a = getClub(f.away);
            const opp = f.home === PLAYER_ID ? a : h;
            return `<div class="fixture">
              <span class="fx-home"><span class="fx-team"><span class="team-name ${f.home === PLAYER_ID ? '' : 'dim'}">${esc(h.short)}</span></span></span>
              <span class="fx-mid"><b>VS</b></span>
              <span class="fx-away"><span class="fx-team"><span class="team-name ${f.away === PLAYER_ID ? '' : 'dim'}">${esc(a.short)}</span></span></span>
            </div>`;
          }).join('')}</div>` : '<div class="empty">Sem jogos futuros.</div>'}
        </div>
      </div>
    </div>`;
}

function zoneClass(div, i, len) {
  if (div === 'A') {
    if (i < 4) return 'zone-blue';
    if (i < 8) return 'zone-gold';
    if (i >= len - 4) return 'zone-red';
    return '';
  }
  if (div === 'B' || div === 'C') {
    if (i < 4) return 'zone-green';
    if (i >= len - 4) return 'zone-red';
  }
  if (div === 'D') {
    if (i < 2) return 'zone-green';
  }
  return '';
}

function tableHTML(rows, div, compact) {
  return `<table class="table">
    <thead><tr><th>#</th><th>Clube</th><th class="num">P</th><th class="num">J</th><th class="num hide-sm">V</th><th class="num hide-sm">E</th><th class="num hide-sm">D</th><th class="num hide-sm">GP</th><th class="num hide-sm">GC</th><th class="num">SG</th><th>Últimos</th></tr></thead>
    <tbody>${rows.map((r, i) => `
      <tr class="${r.club.id === PLAYER_ID ? 'me' : ''} ${div ? zoneClass(div, i, rows.length) : ''}">
        <td class="num">${i + 1}</td>
        <td><div class="club-cell">${crest(r.club, 'xs')}<div><b>${esc(r.club.name)}</b><small>${esc(r.club.short)}</small></div></div></td>
        <td class="num"><b>${r.p}</b></td><td class="num">${r.j}</td><td class="num hide-sm">${r.v}</td><td class="num hide-sm">${r.e}</td><td class="num hide-sm">${r.d}</td>
        <td class="num hide-sm">${r.gf}</td><td class="num hide-sm">${r.gs}</td><td class="num">${r.gd > 0 ? '+' : ''}${r.gd}</td>
        <td><div class="form">${formDots(r)}</div></td>
      </tr>`).join('')}</tbody>
  </table>`;
}

function fixturesHTML(fixtures, label) {
  if (!fixtures || !fixtures.length) return '<div class="empty">Nenhuma partida nesta rodada.</div>';
  return `<div class="fixtures">${fixtures.map(f => {
    const h = getClub(f.home), a = getClub(f.away);
    if (!h || !a) return '';
    const score = f.result ? `<b>${f.result.hg} × ${f.result.ag}</b>` : '<b>VS</b>';
    const isMe = f.home === PLAYER_ID || f.away === PLAYER_ID;
    return `<div class="fixture ${isMe ? 'me' : ''}">
      <span class="fx-home"><span class="fx-team"><span class="team-name">${esc(h.short)}</span>${crest(h, 'xs')}</span></span>
      <span class="fx-mid">${score}</span>
      <span class="fx-away"><span class="fx-team">${crest(a, 'xs')}<span class="team-name">${esc(a.short)}</span></span></span>
    </div>`;
  }).join('')}</div>`;
}

function bracketHTML(D) {
  if (!D.koRounds.length) return '';
  return `<div class="bracket">${D.koRounds.map(round => `
    <div class="ko-round"><h3>${round.name}</h3>
      ${round.ties.map(t => {
        const h = getClub(t.home), a = getClub(t.away);
        if (!h || !a) return '';
        const sc = t.score ? `${t.score[0]} × ${t.score[1]}${t.pens ? ` <small>(${t.pens[0]}-${t.pens[1]})</small>` : ''}` : '—';
        const me = t.home === PLAYER_ID || t.away === PLAYER_ID;
        return `<div class="ko-tie ${me ? 'me' : ''}">
          <div class="t">${crest(h, 'xs')}<span>${esc(h.short)}</span></div>
          <div class="sc"><b>${sc}</b></div>
          <div class="t away"><span>${esc(a.short)}</span>${crest(a, 'xs')}</div>
        </div>`;
      }).join('')}
    </div>`).join('')}</div>`;
}

function renderLeague() {
  const sel = S.selectedDivision || S.playerDivision;
  if (sel === 'D' && !S.selectedGroup) {
    const g = getPlayerGroup();
    S.selectedGroup = g ? g.id : 'A';
  }
  const tabs = DIV_ORDER.map(d => {
    const active = d === sel;
    return `<button class="tab ${active ? 'active' : ''}" onclick="selectDivision('${d}')">${DIV_SHORT[d]}${d === S.playerDivision ? ' •' : ''}</button>`;
  }).join('');

  let content = '';
  let fixtures = [];
  let fixturesLabel = '';
  if (sel === 'D') {
    const D = S.divisions.D;
    const groupId = S.selectedGroup || 'A';
    const group = D.groups.find(g => g.id === groupId) || D.groups[0];
    const rows = standings(group.clubs, group.table);
    const groupTabs = D.groups.map(g =>
      `<button class="tab ${g.id === groupId ? 'active' : ''}" onclick="selectGroup('${g.id}')">Grupo ${g.id}</button>`
    ).join('');
    fixtures = group.schedule[Math.min(group.round, group.schedule.length - 1)] || [];
    fixturesLabel = `Grupo ${group.id} · Rodada ${Math.min(group.round + 1, group.schedule.length)}`;
    content = `
      <div class="card">
        <div class="card-head"><h2>Grupo ${group.id}</h2><span class="mini">Rodada ${Math.min(group.round + 1, group.schedule.length)} de ${group.schedule.length}</span></div>
        <div class="tabs mt8">${groupTabs}</div>
        <div class="table-wrap mt12">${tableHTML(rows, 'D', false)}</div>
        <div class="legend"><span><i style="background:var(--green)"></i>Classificados ao mata-mata</span><span><i style="background:var(--lime)"></i>Seu clube</span></div>
      </div>
      ${D.koRounds.length ? `<div class="card"><div class="card-head"><h2>Mata-mata</h2><span class="mini">Jogo único · 4 semifinalistas sobem</span></div>${bracketHTML(D)}</div>` : ''}`;
  } else {
    const d = S.divisions[sel];
    const rows = standings(d.clubs, d.table);
    fixtures = d.schedule[Math.min(d.round, d.schedule.length - 1)] || [];
    fixturesLabel = `Rodada ${Math.min(d.round + 1, d.schedule.length)} de ${d.schedule.length}`;
    content = `
      <div class="card">
        <div class="card-head"><h2>${DIV_NAME[sel]}</h2><span class="mini">Rodada ${Math.min(d.round + 1, d.schedule.length)} de ${d.schedule.length}</span></div>
        <div class="table-wrap">${tableHTML(rows, sel, false)}</div>
        <div class="legend">
          ${sel === 'A' ? '<span><i style="background:var(--blue)"></i>Libertadores</span><span><i style="background:var(--gold)"></i>Sul-Americana</span>' : '<span><i style="background:var(--green)"></i>Acesso</span>'}
          <span><i style="background:var(--red)"></i>Rebaixamento</span>
          <span><i style="background:var(--lime)"></i>Seu clube</span>
        </div>
      </div>`;
  }

  const rules = {
    A: '20 clubes · 38 rodadas em turno e returno · 3 pontos por vitória · G4 Libertadores · Z4 rebaixamento.',
    B: '20 clubes · 38 rodadas em turno e returno · 3 pontos por vitória · 4 primeiros sobem à Série A · 4 últimos caem à Série C.',
    C: '20 clubes · 38 rodadas em turno e returno · 3 pontos por vitória · 4 primeiros sobem à Série B · 4 últimos caem à Série D.',
    D: '64 clubes · 8 grupos de 8 · 14 rodadas · os 2 melhores de cada grupo avançam · mata-mata em jogo único · os 4 semifinalistas sobem à Série C.'
  };

  $('screen-league').innerHTML = `
    <div class="tabs" style="margin-bottom:14px">${tabs}</div>
    ${sel !== S.playerDivision ? `<div class="notice" style="margin-bottom:14px">Você está disputando a ${DIV_SHORT[S.playerDivision]}. Esta é a visão da ${DIV_SHORT[sel]}.</div>` : ''}
    <div class="stack">
      ${content}
      <div class="league-bottom">
        <div class="card"><div class="card-head"><h2>Rodada</h2><span class="mini">${fixturesLabel}</span></div>${fixturesHTML(fixtures)}</div>
        <div class="stack">
          <div class="card obj-card">
            <h2>Regulamento</h2>
            <p>${rules[sel]}</p>
            <div class="progress-meta mt12"><span>${DIV_NAME[sel]}</span><span>Temporada ${S.season}</span></div>
          </div>
          <div class="card">
            <div class="card-head"><h2>Resumo</h2></div>
            <div class="summary-grid">
              <div class="summary-item"><span>Clubes</span><b>${sel === 'D' ? 64 : 20}</b></div>
              <div class="summary-item"><span>Formato</span><b>${sel === 'D' ? 'Grupos + mata-mata' : 'Pontos corridos'}</b></div>
              <div class="summary-item"><span>Acesso</span><b>${sel === 'A' ? '—' : sel === 'D' ? '4 semifinalistas' : 'G4'}</b></div>
              <div class="summary-item"><span>Queda</span><b>${sel === 'D' ? '—' : 'Z4'}</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function selectDivision(d) {
  S.selectedDivision = d;
  if (d === 'D') {
    const g = getPlayerGroup();
    S.selectedGroup = g ? g.id : 'A';
  }
  renderLeague();
  save();
}

function selectGroup(id) {
  S.selectedGroup = id;
  renderLeague();
  save();
}

function renderSquad() {
  const avg = Math.round(S.squad.reduce((a, p) => a + p.overall, 0) / S.squad.length);
  const atk = Math.round(S.squad.filter(p => ['ATA', 'PON', 'MEI'].includes(p.pos)).reduce((a, p) => a + p.overall, 0) / S.squad.filter(p => ['ATA', 'PON', 'MEI'].includes(p.pos)).length);
  const mid = Math.round(S.squad.filter(p => ['VOL', 'MEI'].includes(p.pos)).reduce((a, p) => a + p.overall, 0) / S.squad.filter(p => ['VOL', 'MEI'].includes(p.pos)).length);
  const def = Math.round(S.squad.filter(p => ['GOL', 'ZAG', 'LAT'].includes(p.pos)).reduce((a, p) => a + p.overall, 0) / S.squad.filter(p => ['GOL', 'ZAG', 'LAT'].includes(p.pos)).length);
  const sorted = S.squad.slice().sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || b.overall - a.overall);
  const topScorer = S.squad.filter(p => p.pos !== 'GOL').slice().sort((a, b) => (b.goals || 0) - (a.goals || 0) || b.overall - a.overall)[0];
  const tactics = [['atacando', 'Ofensiva'], ['equilibrado', 'Equilibrada'], ['defendendo', 'Defensiva']];

  $('screen-squad').innerHTML = `
    <div class="squad-summary">
      <div class="stat"><span>Média geral</span><b>${avg}</b><small>${S.squad.length} jogadores</small></div>
      <div class="stat"><span>Ataque</span><b>${atk}</b><small>Força ofensiva</small></div>
      <div class="stat"><span>Meio-campo</span><b>${mid}</b><small>Criação</small></div>
      <div class="stat"><span>Defesa</span><b>${def}</b><small>Solidez</small></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><h2>Postura padrão</h2><span class="mini">Usada ao iniciar cada partida</span></div>
      <div class="tactics">${tactics.map(([id, label]) => `<button class="tactic ${S.tactic === id ? 'active' : ''}" onclick="setDefaultTactic('${id}')">${label}</button>`).join('')}</div>
      <div class="flex between mt12"><span class="tiny muted">Artilheiro do elenco</span><span class="small"><b class="lime">${esc(topScorer.name)}</b> · ${topScorer.goals || 0} gols</span></div>
    </div>
    <div class="squad-grid">
      ${sorted.map(p => `<div class="player">
        <div class="player-top"><span class="pos ${p.pos}">${p.pos}</span><span class="rating">${p.overall}</span></div>
        <h3>${esc(p.name)}</h3>
        <div class="meta"><span>#${p.number} · ${p.age} anos</span><span>${p.goals || 0} gols</span></div>
        <div class="bar"><i style="width:${p.overall}%"></i></div>
      </div>`).join('')}
    </div>`;
}

function setDefaultTactic(t) {
  S.tactic = t;
  save();
  renderSquad();
  toast(t === 'atacando' ? 'Postura ofensiva definida' : t === 'defendendo' ? 'Postura defensiva definida' : 'Postura equilibrada definida');
}

function pitchHTML(m) {
  const home = [[6, 50], [17, 13], [17, 38], [17, 62], [17, 87], [30, 25], [30, 50], [30, 75], [43, 17], [43, 50], [43, 83]];
  const away = home.map(([x, y]) => [100 - x, y]);
  const dots = [];
  home.forEach(([x, y], i) => {
    dots.push(`<div class="pdot ${m.playerSide === 'home' ? 'us' : 'them'}" style="left:${x}%;top:${y}%">${i + 1}</div>`);
  });
  away.forEach(([x, y], i) => {
    dots.push(`<div class="pdot ${m.playerSide === 'away' ? 'us' : 'them'}" style="left:${x}%;top:${y}%">${i + 1}</div>`);
  });
  return `<div class="pitch">
    <div class="box left"></div><div class="box right"></div>
    <div class="box small left"></div><div class="box small right"></div>
    <div class="goal left"></div><div class="goal right"></div>
    ${dots.join('')}
    <div class="ball" style="left:${m.ball.x}%;top:${m.ball.y}%"></div>
  </div>`;
}

function statRow(label, h, a, unit, playerSide) {
  const total = Math.max(1, h + a);
  const hClass = playerSide === 'home' ? 'h' : 'a';
  const aClass = playerSide === 'away' ? 'h' : 'a';
  return `<div class="stat-row">
    <b>${h}${unit || ''}</b>
    <div><div class="stat-bar"><i class="${hClass}" style="width:${h / total * 100}%"></i><i class="${aClass}" style="width:${a / total * 100}%"></i></div><div class="tiny muted" style="text-align:center;margin-top:3px">${label}</div></div>
    <b>${a}${unit || ''}</b>
  </div>`;
}

function tacticsHTML(current) {
  return `<div class="tactics">
    <button class="tactic ${current === 'atacando' ? 'active' : ''}" onclick="setTactic('atacando')">Ofensiva</button>
    <button class="tactic ${current === 'equilibrado' ? 'active' : ''}" onclick="setTactic('equilibrado')">Equilibrada</button>
    <button class="tactic ${current === 'defendendo' ? 'active' : ''}" onclick="setTactic('defendendo')">Defensiva</button>
  </div>`;
}

function matchPreHTML(fx) {
  if (!fx) {
    return `<div class="card"><div class="empty"><span class="big">⚽</span>Nenhuma partida disponível no momento.<br>${S.seasonEnded ? 'A temporada terminou.' : 'Aguardando a próxima rodada.'}</div>
      <div class="modal-actions"><button class="btn btn-primary" onclick="${S.seasonEnded ? 'openSeasonSummary()' : "showScreen('home')"}">${S.seasonEnded ? 'Ver resumo da temporada' : 'Voltar à Central'}</button></div></div>`;
  }
  const h = getClub(fx.home), a = getClub(fx.away);
  return `<div class="grid match-grid">
    <div class="card hero">
      <div class="hero-top"><span>${esc(fixtureLabel(fx))}</span><span>${fx.home === PLAYER_ID ? 'Em casa' : 'Fora de casa'}</span></div>
      <div class="teams">
        <div class="team">${crest(h)}<b>${esc(h.name)}</b><small>FOR ${h.strength} · ${fx.home === PLAYER_ID ? 'Você' : 'Adversário'}</small></div>
        <div class="vs">VS</div>
        <div class="team">${crest(a)}<b>${esc(a.name)}</b><small>FOR ${a.strength} · ${fx.away === PLAYER_ID ? 'Você' : 'Adversário'}</small></div>
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="startMatch()">Iniciar partida</button>
        <button class="btn" onclick="simulatePlayerMatch()">Simular partida</button>
      </div>
    </div>
    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>Postura</h2><span class="mini">Afeta ataque e defesa</span></div>
        ${tacticsHTML(S.tactic)}
      </div>
      <div class="card">
        <div class="card-head"><h2>Forma recente</h2></div>
        <div class="flex between mt8"><span class="small">${esc(h.short)}</span><div class="form">${formDots(rowFor(h.id))}</div></div>
        <div class="flex between mt8"><span class="small">${esc(a.short)}</span><div class="form">${formDots(rowFor(a.id))}</div></div>
      </div>
      <div class="card">
        <div class="card-head"><h2>Informações</h2></div>
        <div class="scorers">
          <div><span>Competição</span><b>${esc(fixtureLabel(fx).split(' · ')[0])}</b></div>
          <div><span>Estádio</span><b>${esc(h.name)}</b></div>
          <div><span>Mando</span><b>${fx.home === PLAYER_ID ? 'Verde FC' : h.short}</b></div>
        </div>
      </div>
    </div>
  </div>`;
}

function matchLiveHTML(m) {
  const playerHome = m.playerSide === 'home';
  const gf = playerHome ? m.score[0] : m.score[1];
  const ga = playerHome ? m.score[1] : m.score[0];
  return `<div class="grid match-grid">
    <div class="stack">
      <div class="card scoreboard">
        <div class="sb-team">${crest(m.home, 'sm')}<div><b>${esc(m.home.name)}</b><small>${playerHome ? 'Você' : 'Adversário'}</small></div></div>
        <div class="sb-score"><div class="score">${m.score[0]} — ${m.score[1]}</div><div class="minute">${m.minute}'</div><div class="comp">${esc(fixtureLabel(m))}</div></div>
        <div class="sb-team away"><div><b>${esc(m.away.name)}</b><small>${!playerHome ? 'Você' : 'Adversário'}</small></div>${crest(m.away, 'sm')}</div>
      </div>
      ${pitchHTML(m)}
    </div>
    <div class="match-side">
      <div class="card">
        <div class="card-head"><h2>Estatísticas</h2><span class="mini">${m.playerSide === 'home' ? 'Verde à esquerda' : 'Verde à direita'}</span></div>
        <div class="stats-list">
          ${statRow('Posse de bola', m.stats.poss[0], m.stats.poss[1], '%', m.playerSide)}
          ${statRow('Finalizações', m.stats.shots[0], m.stats.shots[1], '', m.playerSide)}
          ${statRow('No gol', m.stats.onTarget[0], m.stats.onTarget[1], '', m.playerSide)}
          ${statRow('Escanteios', m.stats.corners[0], m.stats.corners[1], '', m.playerSide)}
        </div>
        <div class="mt12">${tacticsHTML(m.tactic)}</div>
        <div class="controls">
          <button class="btn btn-primary" onclick="advanceLive(5)" ${m.minute >= 90 ? 'disabled' : ''}>Avançar 5 min</button>
          <button class="btn" onclick="advanceLive(90, true)" ${m.minute >= 90 ? 'disabled' : ''}>Simular restante</button>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h2>Narração</h2><span class="mini">${playerHome ? m.home.short : m.away.short} ${gf} × ${ga}</span></div>
        <div class="commentary">
          ${m.events.slice(0, 9).map(e => `<div class="event ${e.type === 'goal' ? 'ev-goal' : ''}"><span class="min">${e.min}'</span><span>${esc(e.text)}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function matchPostHTML(m) {
  const playerHome = m.playerSide === 'home';
  const gf = playerHome ? m.score[0] : m.score[1];
  const ga = playerHome ? m.score[1] : m.score[0];
  let res = gf > ga ? 'win' : gf < ga ? 'loss' : 'draw';
  let resLabel = res === 'win' ? 'Vitória' : res === 'loss' ? 'Derrota' : 'Empate';
  if (m.knockout && m.winner) {
    if (m.winner === PLAYER_ID) { res = 'win'; resLabel = 'Classificado'; }
    else { res = 'loss'; resLabel = 'Eliminado'; }
  }
  return `<div class="grid match-grid">
    <div class="card">
      <div class="scoreboard">
        <div class="sb-team">${crest(m.home, 'sm')}<div><b>${esc(m.home.name)}</b><small>${playerHome ? 'Você' : 'Adversário'}</small></div></div>
        <div class="sb-score"><div class="score">${m.score[0]} — ${m.score[1]}</div><div class="minute">Fim de jogo</div></div>
        <div class="sb-team away"><div><b>${esc(m.away.name)}</b><small>${!playerHome ? 'Você' : 'Adversário'}</small></div>${crest(m.away, 'sm')}</div>
      </div>
      <div class="result-big"><div class="score">${gf} × ${ga}</div><span class="tag ${res}">${resLabel}${m.pens ? ` · pênaltis ${m.pens[0]} × ${m.pens[1]}` : ''}</span></div>
      <div class="scorers">
        ${m.scorers.length ? m.scorers.map(s => `<div><span>${esc(s.name)} <small class="muted">${esc(s.club)}</small></span><b>${s.min}'</b></div>`).join('') : '<div><span>Sem gols na partida.</span><b>0 × 0</b></div>'}
      </div>
      <div class="controls">
        <button class="btn btn-primary" onclick="continueAfterMatch()">Continuar</button>
        ${S.seasonEnded ? '<button class="btn" onclick="openSeasonSummary()">Resumo da temporada</button>' : '<button class="btn" onclick="showScreen(\'home\')">Ir para a Central</button>'}
      </div>
    </div>
    <div class="match-side">
      <div class="card">
        <div class="card-head"><h2>Estatísticas</h2></div>
        <div class="stats-list">
          ${statRow('Posse de bola', m.stats.poss[0], m.stats.poss[1], '%', m.playerSide)}
          ${statRow('Finalizações', m.stats.shots[0], m.stats.shots[1], '', m.playerSide)}
          ${statRow('No gol', m.stats.onTarget[0], m.stats.onTarget[1], '', m.playerSide)}
          ${statRow('Escanteios', m.stats.corners[0], m.stats.corners[1], '', m.playerSide)}
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h2>Narração</h2></div>
        <div class="commentary">
          ${m.events.slice(0, 8).map(e => `<div class="event ${e.type === 'goal' ? 'ev-goal' : ''}"><span class="min">${e.min}'</span><span>${esc(e.text)}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function renderMatch() {
  const m = S.match;
  if (m && m.finished) { $('screen-match').innerHTML = matchPostHTML(m); return; }
  if (m && !m.finished) { $('screen-match').innerHTML = matchLiveHTML(m); return; }
  $('screen-match').innerHTML = matchPreHTML(getPlayerFixture());
}

function continueAfterMatch() {
  const wasSeasonEnd = S.seasonEnded;
  S.match = null;
  S.screen = 'home';
  renderAll();
  save();
  if (wasSeasonEnd) openSeasonSummary();
}

function openSeasonSummary() {
  const p = S.pendingSeason;
  if (!p) { toast('Nenhuma temporada encerrada.'); return; }
  const good = p.playerPromoted || (p.playerDivision === 'A' && p.playerPosition === '1º lugar');
  openModal(`
    <h2>Temporada ${p.season} encerrada</h2>
    <p class="sub">Confira como terminou a temporada e quem subiu e desceu entre as quatro séries.</p>
    <div class="outcome ${good ? '' : 'bad'}">
      <span>Seu resultado</span>
      <b>${esc(p.playerOutcome)}</b>
      <div class="tiny muted mt8">${DIV_NAME[p.playerDivision]} · ${esc(p.playerPosition)}</div>
    </div>
    <div class="summary-grid">
      <div class="summary-item"><span>Campeão Série A</span><b>${esc(p.championA)}</b></div>
      <div class="summary-item"><span>Campeão Série B</span><b>${esc(p.championB)}</b></div>
      <div class="summary-item"><span>Campeão Série C</span><b>${esc(p.championC)}</b></div>
      <div class="summary-item"><span>Campeão Série D</span><b>${esc(p.championD)}</b></div>
    </div>
    <div class="summary-grid">
      <div class="summary-item"><span>Sobem para a Série A</span><b>${p.promotedA.map(esc).join(', ')}</b></div>
      <div class="summary-item"><span>Caem para a Série B</span><b>${p.relegatedA.map(esc).join(', ')}</b></div>
      <div class="summary-item"><span>Sobem para a Série B</span><b>${p.promotedB.map(esc).join(', ')}</b></div>
      <div class="summary-item"><span>Caem para a Série C</span><b>${p.relegatedB.map(esc).join(', ')}</b></div>
      <div class="summary-item"><span>Sobem para a Série C</span><b>${p.promotedC.map(esc).join(', ')}</b></div>
      <div class="summary-item"><span>Caem para a Série D</span><b>${p.relegatedC.map(esc).join(', ')}</b></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="startNextSeason()">Iniciar temporada ${p.season + 1}</button>
      <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
    </div>`);
}

function newCareer() {
  openModal(`
    <h2>Nova carreira</h2>
    <p class="sub">Isso apaga o progresso salvo e começa uma nova jornada no Brasileirão Série D com o Verde FC.</p>
    <div class="modal-actions">
      <button class="btn btn-danger" onclick="resetCareer()">Começar do zero</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    </div>`);
}

function resetCareer() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
  S = createInitialState();
  closeModal();
  renderAll();
  save();
  toast('Nova carreira iniciada na Série D');
}

function init() {
  S = loadState() || createInitialState();
  if (S.playerDivision === 'D' && !S.selectedGroup) {
    const g = getPlayerGroup();
    S.selectedGroup = g ? g.id : 'A';
  }
  renderAll();
  if (S.seasonEnded) setTimeout(openSeasonSummary, 350);
}

init();
