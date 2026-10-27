// app.js
(function () {
  const DS = DATASET, M = DS.meta, MATCHES = DS.matches;
  const REAL_IDS = [M.playerA, M.playerB];

  // 预处理：补算 gpm/xpm、KDA、阵营标签
  MATCHES.forEach(m => {
    const durMin = m.durationSec / 60;
    m.players.forEach(p => {
      if (p.gpm == null) p.gpm = Math.round(p.netWorth / durMin);
      p.kda = (p.kills + p.assists) / Math.max(1, p.deaths);
      p.teamLabel = p.team === 'radiant' ? '天辉' : '夜魇';
    });
  });

  const sum = (arr, key) => arr.reduce((s, x) => s + x[key], 0);
  const avg = (arr, key) => arr.length ? sum(arr, key) / arr.length : 0;

  
  function heroSubText(n) {
    if (n === 0) return '还没开张';
    if (n <= 3) return '英雄池比针眼还小，专精流玩家';
    if (n <= 8) return '英雄池初具规模，偶尔换换口味';
    return '英雄池深不见底，建议申报“全能选手”';
  }

  // 英雄属性索引：name_loc / name_english_loc -> primary_attr
  const heroAttrMap = {};
  const HERO_ATTR_LABEL = { 0: '力量', 1: '敏捷', 2: '智力', 3: '全才' };
  const HERO_ATTR_COUNT = { 0: 0, 1: 0, 2: 0, 3: 0 };
  HEROES.forEach(h => {
    if (h.name_loc) heroAttrMap[h.name_loc] = h.primary_attr;
    if (h.name_english_loc) heroAttrMap[h.name_english_loc] = h.primary_attr;
    if (HERO_ATTR_COUNT[h.primary_attr] != null) HERO_ATTR_COUNT[h.primary_attr]++;
  });
  const getAttr = (heroName) => heroAttrMap[heroName];



  // ========== ① 标题栏 ==========
  // —— 连胜 / 连败统计 ——
  const runs = (() => {
    const rs = []; let cur = null;
    [...MATCHES].reverse().forEach(m => {           // 按时间正序扫描
      if (!cur || cur.result !== m.result) {
        cur = { result: m.result, count: 1, start: m.date, end: m.date };
        rs.push(cur);
      } else { cur.count++; cur.end = m.date; }
    });
    return rs;
  })();
  const bestWinRun = runs.filter(r => r.result === 'win').sort((a, b) => b.count - a.count)[0];
  const bestLoseRun = runs.filter(r => r.result === 'lose').sort((a, b) => b.count - a.count)[0];
  // 当前进行中的连胜/连败（从最新一场起算）
  let curStreak = 0;
  for (const m of MATCHES) {
    if (m.result === MATCHES[0].result) curStreak++; else break;
  }
  const curStreakResult = MATCHES[0].result;

  const totalKillsR = MATCHES.reduce((s, m) => s + sum(m.players.filter(p => p.team === 'radiant'), 'kills'), 0);
  const totalKillsD = MATCHES.reduce((s, m) => s + sum(m.players.filter(p => p.team === 'dire'), 'kills'), 0);
  const totalDurSec = sum(MATCHES, 'durationSec');
  const totalDurText = `${Math.floor(totalDurSec / 3600)} 小时 ${Math.floor((totalDurSec % 3600) / 60)} 分`;
  const streakPill = curStreakResult === 'win'
    ? `<div class="status-pill win"><span class="dot"></span>${curStreak}场！绝赞连胜中！</div>`
    : `<div class="status-pill lose"><span class="dot"></span>${curStreak}场…连败低谷中，触底反弹在即</div>`;
  document.getElementById('header').innerHTML = `
    <h1>${M.title}</h1>
    <div class="meta">
      <span>总场次 <strong>${MATCHES.length}</strong></span>
      <span>时间跨度 <strong>${MATCHES[0].date} ~ ${MATCHES[MATCHES.length-1].date}</strong></span>
      <span>总击杀 我方 <strong style="color:var(--radiant)">${totalKillsR}</strong> / 敌方 <strong style="color:var(--dire)">${totalKillsD}</strong></span>
      <span>总时长 <strong>${totalDurText}</strong></span>
    </div>
    ${streakPill}`;

  // ========== ② 大数字 ==========
  const wins = MATCHES.filter(m => m.result === 'win').length;
  const totalDur = sum(MATCHES, 'durationSec');

  // 哪天比赛场次最多
  const dateCount = {};
  MATCHES.forEach(m => { dateCount[m.date] = (dateCount[m.date] || 0) + 1; });
  const maxDateEntry = Object.entries(dateCount).sort((a, b) => b[1] - a[1])[0];
  const maxDate = maxDateEntry[0], maxDateCount = maxDateEntry[1];
  const busyDateText = maxDateCount >= 2
    ? `${maxDate}（${maxDateCount} 场）`
    : `${maxDate}（仅 1 场）`;
  const busyDateSub = maxDateCount >= 2
    ? '这天你们是真上头了，Dota 之魂熊熊燃烧'
    : '目前还没出现“一天多局”的肝帝行为，继续保持';

  // AB 使用英雄去重 / 124
  const usedHeroes = new Set();
  MATCHES.forEach(m => m.players.filter(p => REAL_IDS.includes(p.id)).forEach(p => usedHeroes.add(p.hero)));
  const heroPct = (usedHeroes.size / 124 * 100).toFixed(1);
  const heroSub = usedHeroes.size === 0 ? '还没开张'
    : usedHeroes.size <= 3 ? '英雄池比针眼还小，专精流玩家'
    : usedHeroes.size <= 8 ? '英雄池初具规模，偶尔换换口味'
    : '英雄池深不见底，建议申报“全能选手”';

  const bigDefs = [
    { label: '整体胜率', value: `${(wins / MATCHES.length * 100).toFixed(1)}%`,
      sub: `${wins} 胜 / ${MATCHES.length - wins} 负` },
    { label: '最长连胜', value: `${bestWinRun.count} 连胜`,
      sub: `${bestWinRun.start} ~ ${bestWinRun.end} · ${bestWinRun.count >= 5 ? '手感与心态俱佳的黄金期' : '小步快跑的顺风期'}` },
    { label: '最长连败', value: `${bestLoseRun.count} 连败`,
      sub: `${bestLoseRun.start} ~ ${bestLoseRun.end} · ${bestLoseRun.count >= 5 ? '至暗时刻，好在都熬过来了' : '小低谷，无伤大雅'}` },
    { label: '场均时长', value: `${Math.round(totalDur / MATCHES.length / 60)} 分`, sub: '按秒折算' },
    { label: '场均总击杀', value: Math.round((totalKillsR + totalKillsD) / MATCHES.length), sub: '双方合计' },
    { label: '最肝的一天', value: `${maxDateCount} 场`, sub: `${busyDateText} · ${busyDateSub}` },
  ];
  document.getElementById('summary').innerHTML = bigDefs.map(d => `
    <div class="stat-card">
      <div class="label">${d.label}</div>
      <div class="value">${d.value}</div>
      <div class="sub">${d.sub}</div>
    </div>`).join('');

  // —— 大数字 · 第二行 ——
  const radiantKillsOf = m => sum(m.players.filter(p => p.team === 'radiant'), 'kills');

  // 1) 我方击杀最多的一局 + 英雄组合
  const bestKillMatch = [...MATCHES].sort((a, b) => radiantKillsOf(b) - radiantKillsOf(a))[0];
  const bestKills = radiantKillsOf(bestKillMatch);
  const heroPairOf = m => m.players
    .filter(p => REAL_IDS.includes(p.id))
    .map(p => `${p.hero}`)
    .join(' + ');
  const bestKillSub = bestKillMatch.result === 'win'
    ? '杀疯了，这局对面机器人怕是集体掉线'
    : '杀得多但没赢，属于“赢了数据输了比赛”的典型';

  // 2) 最短一局
  const shortest = [...MATCHES].sort((a, b) => a.durationSec - b.durationSec)[0];
  const shortestSub = shortest.result === 'win'
    ? '速通成功，机器人还没热身就结束了'
    : '被速通了，这局建议从记忆里删除';

  // 3) 最长一局
  const longest = [...MATCHES].sort((a, b) => b.durationSec - a.durationSec)[0];
  const longestSub = longest.result === 'win'
    ? '膀胱局险胜，赢了但人也快没了'
    : '又长又输，纯纯的折磨局';

  // 4) 最激烈的一局（双方总击杀 / 对局时长，取最大）
  const totalKillsOf = m => sum(m.players, 'kills');
  const mostIntense = [...MATCHES]
    .sort((a, b) => totalKillsOf(b) / b.durationSec - totalKillsOf(a) / a.durationSec)[0];
  const intenseKills = totalKillsOf(mostIntense);
  const intenseRate = (intenseKills / mostIntense.durationSec * 60).toFixed(2);
  const intenseSub = mostIntense.result === 'win'
    ? '节奏飞快全程高能，观赏性拉满'
    : '打得火热但惜败，虽败犹荣';

  const extraDefs = [
    { label: '我方击杀最多的一局', value: `${bestKills} 杀`,
      sub: `${bestKillMatch.id} · ${heroPairOf(bestKillMatch)} · ${bestKillSub}` },
    { label: '最短的一局', value: `${Math.round(shortest.durationSec / 60)} 分`,
      sub: `${shortest.id} · ${heroPairOf(shortest)} · ${shortest.result === 'win' ? '胜' : '负'} · ${shortestSub}` },
    { label: '最长的一局', value: `${Math.round(longest.durationSec / 60)} 分`,
      sub: `${longest.id} · ${heroPairOf(longest)} · ${longest.result === 'win' ? '胜' : '负'} · ${longestSub}` },
    { label: '最激烈的一局', value: `平均 ${intenseRate} 杀/分`,
      sub: `${mostIntense.id} · ${heroPairOf(mostIntense)} · ${mostIntense.result === 'win' ? '胜' : '负'} · 总计 ${intenseKills} 杀 · ${intenseSub}` },
  ];
    // —— 覆盖率（总 + 四属性） ——
  // 收集 AB 使用过的英雄（按出现过的名字去重），并记录每局的胜负
  const usedHeroSet = new Set();
  const heroRecords = []; // { hero, win }
  MATCHES.forEach(m => {
    m.players.filter(p => REAL_IDS.includes(p.id)).forEach(p => {
      const attr = getAttr(p.hero);
      const key = attr != null ? `attr:${attr}:${p.hero}` : `raw:${p.hero}`;
      usedHeroSet.add(key);
      heroRecords.push({ hero: p.hero, attr, win: m.result === 'win' });
    });
  });

  const totalUsed = usedHeroSet.size;
  const totalHeroCount = HEROES.length;
  const totalPct = totalHeroCount ? (totalUsed / totalHeroCount * 100).toFixed(1) : '0.0';

  // 每个属性对应的“对局集合”（按 match.id 去重）
  const attrMatchMap = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };
  const attrMatchWin = { 0: 0, 1: 0, 2: 0, 3: 0 };

  MATCHES.forEach(m => {
    const attrsInMatch = new Set(); // 本局出现过的属性（A、B 各自英雄的属性）
    m.players.filter(p => REAL_IDS.includes(p.id)).forEach(p => {
      const attr = getAttr(p.hero);
      if (attr != null && HERO_ATTR_COUNT[attr] != null) attrsInMatch.add(attr);
    });
    attrsInMatch.forEach(attr => {
      attrMatchMap[attr].add(m.id);
      if (m.result === 'win') attrMatchWin[attr]++;
    });
  });

  const attrStats = [0, 1, 2, 3].map(attr => {
    const total = HERO_ATTR_COUNT[attr] || 0;
    const used = new Set(
      [...usedHeroSet].filter(k => k.startsWith(`attr:${attr}:`)).map(k => k.split(':').slice(2).join(':'))
    ).size;
    const games = attrMatchMap[attr].size;       // 含该属性英雄的对局数（去重）
    const wins = attrMatchWin[attr];             // 这些对局里赢了多少
    const winRate = games ? (wins / games * 100).toFixed(1) : '—';
    return {
      attr, label: HERO_ATTR_LABEL[attr], total, used, games, wins,
      pct: total ? (used / total * 100).toFixed(1) : '0.0',
      winRate,
    };
  });

  const coverageDefs = [
    { label: '总覆盖率', value: `${totalPct}%`,
      sub: `已用 ${totalUsed} / ${totalHeroCount} 个英雄 · ${heroSubText(totalUsed)}` },
    ...attrStats.map(s => ({
      label: `${s.label}型英雄覆盖率`,
      value: `${s.pct}%`,
      sub: `已用 ${s.used} / ${s.total} 个 · 涉及 ${s.games} 局 · 胜率 ${s.winRate === '—' ? '—' : s.winRate + '%'}`,
    })),
  ];

  // —— 覆盖率饼图（Chart.js 环形图） ——
  const ATTR_COLORS = { 0: '#f87171', 1: '#4ade80', 2: '#60a5fa', 3: '#a78bfa' };
  const coverageData = [
    {
      key: 'total', label: '总覆盖率', pct: +totalPct, used: totalUsed, total: totalHeroCount,
      color: '#60a5fa',
      sub: `涉及 ${MATCHES.length} 局 · 整体胜率 ${(wins / MATCHES.length * 100).toFixed(1)}%`,
    },
    ...attrStats.map(s => ({
      key: `attr${s.attr}`, label: `${s.label}型英雄`, pct: +s.pct, used: s.used, total: s.total,
      color: ATTR_COLORS[s.attr],
      sub: `涉及 ${s.games} 局 · 胜率 ${s.winRate === '—' ? '—' : s.winRate + '%'}`,
    })),
  ];

  document.getElementById('coverage').innerHTML = coverageData.map(c => `
    <div class="coverage-card">
      <div class="cc-label">${c.label}</div>
      <div class="cc-chart">
        <canvas id="cov-${c.key}"></canvas>
        <div class="cc-center">
          <div class="cc-pct" style="color:${c.color}">${c.pct}%</div>
          <div class="cc-frac">${c.used} / ${c.total}</div>
        </div>
      </div>
      <div class="cc-sub">${c.sub}</div>
    </div>`).join('');

  if (window.Chart) {
    coverageData.forEach(c => {
      const canvas = document.getElementById(`cov-${c.key}`);
      if (!canvas) return;
      new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['已覆盖', '未覆盖'],
          datasets: [{
            data: [c.pct, Math.max(0, 100 - c.pct)],
            backgroundColor: [c.color, '#2c3844'],
            borderWidth: 0,
            hoverOffset: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ctx.label === '已覆盖'
                  ? `已覆盖 ${c.used} 个（${c.pct}%）`
                  : `未覆盖 ${c.total - c.used} 个`,
              },
            },
          },
        },
      });
    });
  }

  document.getElementById('summaryExtra').innerHTML = extraDefs.map(d => `
    <div class="stat-card">
      <div class="label">${d.label}</div>
      <div class="value">${d.value}</div>
      <div class="sub">${d.sub}</div>
    </div>`).join('');

  // ========== ③ 玩家跨局汇总（A/B 卡片） ==========
  const aggMap = {};
  MATCHES.forEach(m => {
    // 先算本局 A、B 的等级与财产，用于力挽狂澜 / 菜要多练判定
    const pA = m.players.find(p => p.id === M.playerA);
    const pB = m.players.find(p => p.id === M.playerB);
    const gapLevel = (pA && pB) ? Math.abs(pA.level - pB.level) : 0;
    const gapNW = (pA && pB) ? Math.abs(pA.netWorth - pB.netWorth) : 0;
    const qualifies = gapLevel >= 2 || gapNW >= 500;   // 任一满足即算“差距明显”
    const higher = (pA && pB)
      ? (pA.level > pB.level || (pA.level === pB.level && pA.netWorth > pB.netWorth) ? pA
        : pA.level < pB.level || (pA.level === pB.level && pA.netWorth < pB.netWorth) ? pB : null)
      : null;
    const lower = (pA && pB)
      ? (pA.level < pB.level || (pA.level === pB.level && pA.netWorth < pB.netWorth) ? pA
        : pA.level > pB.level || (pA.level === pB.level && pA.netWorth > pB.netWorth) ? pB : null)
      : null;

    m.players.forEach(p => {
      // 初始化该玩家的聚合对象（heroes / carryHeroes / noobHeroes 都在这里定义）
      if (!aggMap[p.id]) {
        aggMap[p.id] = {
          id: p.id, isBot: p.isBot, team: p.team,
          games: 0, wins: 0,
          kills: 0, deaths: 0, assists: 0,
          netWorth: 0, lastHits: 0, denies: 0,
          gpm: 0, xpm: 0, xpmN: 0,
          heroes: {},          // 英雄使用次数
          carryCount: 0, carryHeroes: {},   // 力挽狂澜
          noobCount: 0, noobHeroes: {},     // 菜要多练
        };
      }
      const a = aggMap[p.id];

      // 基础累加
      a.games++; if (m.result === 'win') a.wins++;
      a.kills += p.kills; a.deaths += p.deaths; a.assists += p.assists;
      a.netWorth += p.netWorth; a.lastHits += p.lastHits; a.denies += p.denies;
      a.gpm += p.gpm; if (p.xpm != null) { a.xpm += p.xpm; a.xpmN++; }

      // 英雄使用次数（p.hero 是玩家数据里的英雄名）
      a.heroes[p.hero] = (a.heroes[p.hero] || 0) + 1;

      // 力挽狂澜 / 菜要多练
      if (qualifies) {
        if (m.result === 'win' && higher && p.id === higher.id) {
          a.carryCount++;
          a.carryHeroes[p.hero] = (a.carryHeroes[p.hero] || 0) + 1;
        }
        if (m.result === 'lose' && lower && p.id === lower.id) {
          a.noobCount++;
          a.noobHeroes[p.hero] = (a.noobHeroes[p.hero] || 0) + 1;
        }
      }
    });
  });

  const aggList = Object.values(aggMap).map(a => ({
    ...a,
    avgK: a.kills / a.games, avgD: a.deaths / a.games, avgA: a.assists / a.games,
    avgGPM: a.gpm / a.games, avgNW: a.netWorth / a.games,
    avgLH: a.lastHits / a.games, avgDN: a.denies / a.games,
    kdaRatio: (a.kills + a.assists) / Math.max(1, a.deaths),
  }));

  function fmtHeroCounts(obj) {
    return Object.entries(obj)
      .sort((x, y) => y[1] - x[1])
      .map(([hero, n]) => `${hero}`)
      .join('，');
  }

  function playerCard(a) {
    return `
      <div class="player-card">
        <div class="pc-head">
          <div class="pc-name">👤 ${a.id}</div>
          <div class="pc-tag">共 ${a.games} 场 · 胜率 ${(a.wins / a.games * 100).toFixed(1)}%</div>
        </div>
        <div class="pc-metric">
          <div class="pc-label">场均 KDA</div>
          <div class="pc-main"><span class="k">${a.avgK.toFixed(1)}</span> / <span class="d">${a.avgD.toFixed(1)}</span> / <span class="a">${a.avgA.toFixed(1)}</span></div>
          <div class="pc-sub">总 KDA：${a.kills} / ${a.deaths} / ${a.assists}</div>
        </div>
        <div class="pc-metric">
          <div class="pc-label">KDA 比</div>
          <div class="pc-main">${a.kdaRatio.toFixed(2)}</div>
          <div class="pc-sub">(总击杀 + 总助攻) / 总死亡</div>
        </div>
        <div class="pc-metric">
          <div class="pc-label">场均 GPM</div>
          <div class="pc-main">${a.avgGPM.toFixed(0)}</div>
          <div class="pc-sub">总计 ${a.gpm} GPM（逐局累加）</div>
        </div>
        <div class="pc-metric">
          <div class="pc-label">场均财产 / 总财产</div>
          <div class="pc-main">${Math.round(a.avgNW).toLocaleString()}</div>
          <div class="pc-sub">总计 ${a.netWorth.toLocaleString()}</div>
        </div>
        <div class="pc-metric">
          <div class="pc-label">场均正反补 / 总正反补</div>
          <div class="pc-main">${a.avgLH.toFixed(0)} / ${a.avgDN.toFixed(1)}</div>
          <div class="pc-sub">总计 ${a.lastHits} / ${a.denies}</div>
        </div>
      </div>`;
  }
  document.getElementById('playerCards').innerHTML = REAL_IDS
    .map(id => aggList.find(x => x.id === id))
    .filter(Boolean)
    .map(playerCard).join('');


  // ========== AI 强度榜 ==========
  const botHeroAgg = {};
  MATCHES.forEach(m => {
    m.players.filter(p => p.isBot).forEach(p => {
      if (!botHeroAgg[p.hero]) {
        botHeroAgg[p.hero] = { hero: p.hero, games: 0, wins: 0, gpm: 0, level: 0, kills: 0, deaths: 0, assists: 0, netWorth: 0 };
      }
      const h = botHeroAgg[p.hero];
      h.games++;
      if (m.result === 'lose') h.wins++;   // 机器人胜 = 我方负
      h.gpm += p.gpm; h.level += p.level;
      h.kills += p.kills; h.deaths += p.deaths; h.assists += p.assists; h.netWorth += p.netWorth;
    });
  });

  const aiRankList = Object.values(botHeroAgg).map(h => ({
    ...h,
    netWorth: h.netWorth / h.games,
    avgGPM: h.gpm / h.games,
    avgLevel: h.level / h.games,
    avgKDA: `${(h.kills / h.games).toFixed(1)}/${(h.deaths / h.games).toFixed(1)}/${(h.assists / h.games).toFixed(1)}`,
  })).sort((a, b) => b.netWorth - a.netWorth || b.games - a.games)
    .slice(0, 10);

  document.getElementById('aiRank').innerHTML = aiRankList.map(h => {
    const bg = herobgImgMap[h.hero] || '';
    return `
      <div class="ai-card" style="background-image:url('${bg}')">
        <div class="ai-games">${h.games} 场</div>
        <div class="ai-wr">${h.netWorth.toFixed(0)}</div>
        <div class="ai-name">${h.hero}</div>
        <div class="ai-stats">
          <div class="row"><span>场均 GPM</span><span>${h.avgGPM.toFixed(0)}</span></div>
          <div class="row"><span>平均等级</span><span>${h.avgLevel.toFixed(1)}</span></div>
          <div class="row"><span>场均 KDA</span><span>${h.avgKDA}</span></div>
        </div>
      </div>`;
  }).join('');
  // ========== ④ GPM 跨局趋势（Chart.js 折线图） ==========
  const seriesDefs = [
    { label: M.playerA, color: '#4ade80',
      get: m => { const p = m.players.find(x => x.id === M.playerA); return p ? p.gpm : null; } },
    { label: M.playerB, color: '#60a5fa',
      get: m => { const p = m.players.find(x => x.id === M.playerB); return p ? p.gpm : null; } },
    { label: '敌方平均', color: '#f87171',
      get: m => { const bots = m.players.filter(x => x.team === 'dire'); return bots.length ? avg(bots, 'gpm') : null; } },
  ];

  const gpmCtx = document.getElementById('gpmTrend');
  if (gpmCtx && window.Chart) {
    new Chart(gpmCtx, {
      type: 'line',
      data: {
        labels: MATCHES.map(m => m.id),
        datasets: seriesDefs.map(s => ({
          label: s.label,
          data: MATCHES.map(m => s.get(m)),
          borderColor: s.color,
          backgroundColor: s.color + '22',
          pointBackgroundColor: s.color,
          pointBorderColor: '#0f1419',
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 2,
          tension: 0.25,
          spanGaps: true,
          fill: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#8b98a5', usePointStyle: true, boxWidth: 8 },
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                const i = items[0].dataIndex;
                const m = MATCHES[i];
                return `${m.id} · ${m.date} · ${m.result === 'win' ? '胜' : '负'}`;
              },
              label: (c) => `${c.dataset.label}：${c.parsed.y == null ? '—' : Math.round(c.parsed.y)} GPM`,
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: '对局', color: '#8b98a5' },
            ticks: { color: '#8b98a5' },
            grid: { color: '#2c3844' },
          },
          y: {
            title: { display: true, text: 'GPM', color: '#8b98a5' },
            ticks: { color: '#8b98a5' },
            grid: { color: '#2c3844' },
            beginAtZero: false,
          },
        },
      },
    });
  }

  // ========== ⑤ 逐局明细：自定义高性能表格 ==========
  // 1. 拍平数据（每局一行）
  const flatRows = MATCHES.map(m => {
    const radiant = m.players.filter(p => p.team === 'radiant');
    const dire = m.players.filter(p => p.team === 'dire');
    const scoreR = sum(radiant, 'kills');
    const scoreD = sum(dire, 'kills');
    const pA = m.players.find(p => p.id === M.playerA);
    const pB = m.players.find(p => p.id === M.playerB);
    const row = {
      id: m.id,
      date: m.date,
      score: `${scoreR}:${scoreD}`,
      duration: `${Math.floor(m.durationSec / 60)}分`,
      result: m.result === 'win' ? '胜' : '负',
      heroA: pA?.hero || '—',
      heroB: pB?.hero || '—',
    };
    const addPlayer = (prefix, p) => {
      row[`${prefix}_hero`] = p?.hero || '—';
      row[`${prefix}_level`] = p?.level ?? 0;
      row[`${prefix}_kda`] = p ? `${p.kills}/${p.deaths}/${p.assists}` : '—';
      row[`${prefix}_networth`] = p?.netWorth ?? 0;
      row[`${prefix}_cs`] = p ? `${p.lastHits}/${p.denies}` : '—';
      row[`${prefix}_gpm`] = p?.gpm ?? 0;
      row[`${prefix}_xpm`] = p?.xpm ?? 0;
    };
    addPlayer('a', pA);
    addPlayer('b', pB);
    ['Bot1', 'Bot2', 'Bot3', 'Bot4', 'Bot5'].forEach(bot => {
      addPlayer(bot.toLowerCase(), m.players.find(x => x.id === bot));
    });
    return row;
  });

  // 2. 列定义（frozen 标记固定列）
  const baseCols = [
    { key: 'id', title: 'ID', frozen: true },
    { key: 'date', title: '日期', frozen: true },
    { key: 'score', title: '比分', frozen: true },
    { key: 'duration', title: '时长', frozen: true },
    { key: 'result', title: '结果', frozen: true },
    { key: 'heroA', title: 'A英雄', frozen: true },
    { key: 'heroB', title: 'B英雄', frozen: true },
  ];
  const playerPrefixes = ['a', 'b', 'bot1', 'bot2', 'bot3', 'bot4', 'bot5'];
  const playerLabels = ['A', 'B', 'Bot1', 'Bot2', 'Bot3', 'Bot4', 'Bot5'];
  const statKeys = [
    { k: 'hero', t: '英雄', numeric: false },
    { k: 'level', t: '等级', numeric: true },
    { k: 'kda', t: 'KDA', numeric: false },
    { k: 'networth', t: '财产', numeric: true },
    { k: 'cs', t: '正反补', numeric: false },
    { k: 'gpm', t: 'GPM', numeric: true },
    { k: 'xpm', t: 'XPM', numeric: true },
  ];
  const statCols = [];
  playerPrefixes.forEach((prefix, i) => {
    statKeys.forEach(s => {
      statCols.push({
        key: `${prefix}_${s.k}`,
        title: `${playerLabels[i]}-${s.t}`,
        frozen: false,
        numeric: s.numeric,
      });
    });
  });
  let columns = [...baseCols, ...statCols];
  const FROZEN_COUNT = baseCols.length;

  // 3. 状态
  let sortKey = 'id';
  let sortAsc = false;
  const table = document.getElementById('matchTable');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  const scrollWrap = document.getElementById('matchTableScroll');

  // 4. 计算固定列 left 偏移
  function applyFrozenOffsets() {
    const headThs = thead.querySelectorAll('th');
    const widths = [];
    let left = 0;
    for (let i = 0; i < FROZEN_COUNT; i++) {
      const w = headThs[i]?.offsetWidth || 0;
      widths.push({ left, w });
      left += w;
    }
    headThs.forEach((th, i) => {
      if (i >= FROZEN_COUNT) return;
      th.style.left = widths[i].left + 'px';
      th.classList.add('frozen');
      if (i === FROZEN_COUNT - 1) th.classList.add('frozen-last');
    });
    tbody.querySelectorAll('tr').forEach(tr => {
      const tds = tr.querySelectorAll('td');
      for (let i = 0; i < FROZEN_COUNT; i++) {
        const td = tds[i];
        if (!td) continue;
        td.style.left = widths[i].left + 'px';
        td.classList.add('frozen');
        if (i === FROZEN_COUNT - 1) td.classList.add('frozen-last');
      }
    });
  }

  // 5. 渲染表头
  function renderHead() {
    thead.innerHTML = `<tr>${columns.map((c, i) => {
      const ind = c.key === sortKey ? (sortAsc ? '▲' : '▼') : '';
      return `<th data-key="${c.key}" data-index="${i}" draggable="true">
        ${c.title}<span class="sort-ind">${ind}</span>
      </th>`;
    }).join('')}</tr>`;
    bindHeadEvents();
    requestAnimationFrame(applyFrozenOffsets);
  }

  // 6. 渲染表体（分批，避免大表卡顿）
  function renderBody() {
    const sorted = [...flatRows].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortAsc ? va - vb : vb - va;
      }
      return sortAsc
        ? String(va).localeCompare(String(vb), 'zh')
        : String(vb).localeCompare(String(va), 'zh');
    });

    tbody.innerHTML = '';
    const CHUNK = 50;
    let idx = 0;
    function renderChunk() {
      const frag = document.createDocumentFragment();
      const end = Math.min(idx + CHUNK, sorted.length);
      for (; idx < end; idx++) {
        const row = sorted[idx];
        const tr = document.createElement('tr');
        if (row.result === '胜') tr.classList.add('win-row');
        columns.forEach(c => {
          const td = document.createElement('td');
          let v = row[c.key];
          if (c.key === 'result') {
            td.innerHTML = `<span style="color:${v === '胜' ? 'var(--win)' : 'var(--lose)'}">${v}</span>`;
          } else if (c.key === 'score') {
            const [r, d] = String(v).split(':');
            td.innerHTML = `<span style="color:var(--radiant)">${r}</span> : <span style="color:var(--dire)">${d}</span>`;
          } else {
            td.textContent = v;
          }
          tr.appendChild(td);
        });
        frag.appendChild(tr);
      }
      tbody.appendChild(frag);
      applyFrozenOffsets();
      if (idx < sorted.length) requestAnimationFrame(renderChunk);
    }
    renderChunk();
    enhanceHeroIcons();
  }

  // 7. 表头事件：排序 + 拖动
  let dragKey = null;
  function bindHeadEvents() {
    thead.querySelectorAll('th').forEach(th => {
      // 排序
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (sortKey === key) sortAsc = !sortAsc;
        else { sortKey = key; sortAsc = false; }
        renderHead();
        renderBody();
      });
      // 拖动（仅非固定列）
      th.addEventListener('dragstart', (e) => {
        const idx = +th.dataset.index;
        if (idx < FROZEN_COUNT) { e.preventDefault(); return; }
        dragKey = th.dataset.key;
        th.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      th.addEventListener('dragend', () => {
        th.classList.remove('dragging');
        thead.querySelectorAll('th').forEach(x => x.classList.remove('drag-over'));
        dragKey = null;
      });
      th.addEventListener('dragover', (e) => {
        const idx = +th.dataset.index;
        if (idx < FROZEN_COUNT || !dragKey) return;
        e.preventDefault();
        th.classList.add('drag-over');
      });
      th.addEventListener('dragleave', () => th.classList.remove('drag-over'));
      th.addEventListener('drop', (e) => {
        e.preventDefault();
        th.classList.remove('drag-over');
        const targetKey = th.dataset.key;
        const targetIdx = +th.dataset.index;
        if (!dragKey || targetIdx < FROZEN_COUNT || dragKey === targetKey) return;
        const fromIdx = columns.findIndex(c => c.key === dragKey);
        const toIdx = columns.findIndex(c => c.key === targetKey);
        if (fromIdx < FROZEN_COUNT || toIdx < FROZEN_COUNT) return;
        const [moved] = columns.splice(fromIdx, 1);
        columns.splice(toIdx, 0, moved);
        renderHead();
        renderBody();
      });
    });
  }

  // 8. 启动
  renderHead();
  renderBody();
  window.addEventListener('resize', () => requestAnimationFrame(applyFrozenOffsets));

  

  // ========== ⑥ 英雄池（A / B 各自） ==========

  // —— 对局评价标签引擎 ——
  // 胜局：势如破竹 → 力挽狂澜 → 躺赢；负局：一泻千里 → 功亏一篑（按优先级命中即停）
  function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((x, y) => x - y);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  const teamKills = (m, team) => sum(m.players.filter(p => p.team === team), 'kills');
  const enemyAvgLevel = m => avg(m.players.filter(p => p.team === 'dire'), 'level');
  const winDurMedian = median(MATCHES.filter(m => m.result === 'win').map(m => m.durationSec));
  const loseDurMedian = median(MATCHES.filter(m => m.result === 'lose').map(m => m.durationSec));
  const enemyLvlMedian = median(MATCHES.map(m => enemyAvgLevel(m)));
  const kdaOf = p => (p.kills + p.assists) / Math.max(1, p.deaths);

  function labelMatch(m) {
    const pa = m.players.find(p => p.id === M.playerA);
    const pb = m.players.find(p => p.id === M.playerB);
    if (!pa || !pb) return null;
    const labels = {};
    const killRatio = teamKills(m, 'radiant') / Math.max(1, teamKills(m, 'dire'));
    if (m.result === 'win') {
      // 势如破竹（两人各一次）
      if (m.durationSec <= winDurMedian && killRatio >= 1.5) {
        labels[pa.id] = labels[pb.id] = '势如破竹';
        return labels;
      }
      // 力挽狂澜（仅一人满足才记；两人都满足则都不记）
      const carryOk = (p, mate) => enemyAvgLevel(m) > enemyLvlMedian &&
        (p.level >= mate.level + 2 || p.netWorth >= mate.netWorth + 1500) &&
        kdaOf(p) >= 3;
      const ca = carryOk(pa, pb), cb = carryOk(pb, pa);
      if (ca && !cb) { labels[pa.id] = '力挽狂澜'; return labels; }
      if (cb && !ca) { labels[pb.id] = '力挽狂澜'; return labels; }
      // 躺赢（财产比较天然互斥，最多一人）
      const lazyOk = (p, mate) => kdaOf(p) <= 1.5 && p.netWorth <= mate.netWorth - 1000;
      if (lazyOk(pa, pb)) labels[pa.id] = '躺赢';
      if (lazyOk(pb, pa)) labels[pb.id] = '躺赢';
    } else {
      // 一泻千里（两人各一次）
      if (killRatio <= 0.5 || m.durationSec <= 25 * 60) {
        labels[pa.id] = labels[pb.id] = '一泻千里';
        return labels;
      }
      // 功亏一篑（两人各一次）
      if (killRatio >= 0.8 && m.durationSec >= loseDurMedian) {
        labels[pa.id] = labels[pb.id] = '功亏一篑';
      }
    }
    return labels;
  }

  const matchLabels = {};
  MATCHES.forEach(m => {
    const lb = labelMatch(m);
    if (lb) matchLabels[m.id] = lb;
  });
  const LABEL_ORDER = ['势如破竹', '力挽狂澜', '躺赢', '功亏一篑', '一泻千里'];
  const LABEL_CLASS = {
    '势如破竹': 'win', '力挽狂澜': 'win', '躺赢': 'lazy',
    '功亏一篑': 'lose', '一泻千里': 'lose',
  };
  const LABEL_CHAR = {
    '势如破竹': '势', '力挽狂澜': '挽', '躺赢': '躺',
    '功亏一篑': '亏', '一泻千里': '泻',
  };
  function fmtLabels(labels) {
    if (!labels) return '<span class="label-badge none">—</span>';
    const parts = LABEL_ORDER
      .filter(l => labels[l])
      .map(l => `<span class="label-mini-group" title="${l}${labels[l] > 1 ? ` ×${labels[l]}` : ''}"><span class="label-badge mini ${LABEL_CLASS[l]}">${LABEL_CHAR[l]}</span>${labels[l] > 1 ? `<span class="label-mini-cnt ${LABEL_CLASS[l]}">×${labels[l]}</span>` : ''}</span>`);
    return parts.length ? parts.join('') : '<span class="label-badge none">—</span>';
  }

  function heroPoolFor(id) {
    const map = {};
    MATCHES.forEach(m => {
      const p = m.players.find(x => x.id === id); if (!p) return;
      if (!map[p.hero]) map[p.hero] = { hero: p.hero, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, gpm: 0, lastHits: 0, labels: {} };
      const h = map[p.hero];
      h.games++; if (m.result === 'win') h.wins++;
      h.kills += p.kills; h.deaths += p.deaths; h.assists += p.assists;
      h.gpm += p.gpm; h.lastHits += p.lastHits;
      const lb = matchLabels[m.id] && matchLabels[m.id][id];
      if (lb) h.labels[lb] = (h.labels[lb] || 0) + 1;
    });
    return Object.values(map).map(h => ({
      ...h, winRate: h.games ? h.wins/h.games*100 : 0,
      avgKDA: `${(h.kills/h.games).toFixed(1)}/${(h.deaths/h.games).toFixed(1)}/${(h.assists/h.games).toFixed(1)}`,
      avgGPM: (h.gpm/h.games).toFixed(0), avgLH: (h.lastHits/h.games).toFixed(0),
    })).sort((a,b)=>b.games-a.games);
  }
  document.getElementById('heroPool').innerHTML = REAL_IDS.map(id => {
    const pool = heroPoolFor(id);
    return `
      <div class="chart-card">
        <h3 style="font-size:15px;margin-bottom:12px;color:var(--muted)">${id} 的英雄池</h3>
        <table style="font-size:13px">
          <thead><tr><th>英雄</th><th>场次</th><th>胜率</th><th>场均 K/D/A</th><th>场均 GPM</th><th>场均正补</th><th>评价</th></tr></thead>
          <tbody>${pool.map(h => `
            <tr><td>${h.hero}</td><td>${h.games}</td>
            <td style="color:${h.winRate>=50?'var(--win)':'var(--lose)'}">${h.winRate.toFixed(0)}%</td>
            <td>${h.avgKDA}</td><td>${h.avgGPM}</td><td>${h.avgLH}</td><td>${fmtLabels(h.labels)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }).join('');

  // ========== ⑦ 我方绝活榜（A / B 各按场均经济取前 3） ==========
  function masteryFor(id) {
    const map = {};
    MATCHES.forEach(m => {
      const p = m.players.find(x => x.id === id); if (!p) return;
      if (!map[p.hero]) map[p.hero] = { hero: p.hero, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, gpm: 0, netWorth: 0 };
      const h = map[p.hero];
      h.games++; if (m.result === 'win') h.wins++;
      h.kills += p.kills; h.deaths += p.deaths; h.assists += p.assists;
      h.gpm += p.gpm; h.netWorth += p.netWorth;
    });
    return Object.values(map).map(h => ({
      ...h,
      avgNetWorth: h.netWorth / h.games,
      avgGPM: h.gpm / h.games,
      winRate: h.games ? h.wins / h.games * 100 : 0,
      avgKDA: `${(h.kills / h.games).toFixed(1)}/${(h.deaths / h.games).toFixed(1)}/${(h.assists / h.games).toFixed(1)}`,
    })).sort((a, b) => b.avgNetWorth - a.avgNetWorth).slice(0, 3);
  }
  document.getElementById('masteryBoard').innerHTML = REAL_IDS.map(id => `
    <div class="mastery-col">
      <div class="mastery-col-title">${id} 的绝活英雄</div>
      <div class="mastery-cards">
        ${masteryFor(id).map(h => {
          const bg = herobgImgMap[h.hero] || '';
          return `
            <div class="ai-card mastery-card" style="background-image:url('${bg}')">
              <div class="ai-games">${h.games} 场</div>
              <div class="ai-wr">${Math.round(h.avgNetWorth)}</div>
              <div class="ai-name">${h.hero}</div>
              <div class="ai-stats">
                <div class="row"><span>场均经济</span><span>${Math.round(h.avgNetWorth)}</span></div>
                <div class="row"><span>场均 GPM</span><span>${h.avgGPM.toFixed(0)}</span></div>
                <div class="row"><span>胜率 / KDA</span><span>${h.winRate.toFixed(0)}% · ${h.avgKDA}</span></div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`).join('');


  // ========== ⑧ 洞察 ==========
  const insights = [];
  const aAgg = aggList.find(x => x.id === M.playerA);
  const bAgg = aggList.find(x => x.id === M.playerB);

  // GPM 稳定性
  function gpmSeries(id) {
    return MATCHES.map(m => { const p = m.players.find(x=>x.id===id); return p ? p.gpm : null; }).filter(v=>v!=null);
  }
  const aGPMs = gpmSeries(M.playerA);
  if (aGPMs.length >= 2) {
    const mean = aGPMs.reduce((s,v)=>s+v,0)/aGPMs.length;
    const sd = Math.sqrt(aGPMs.reduce((s,v)=>s+(v-mean)**2,0)/aGPMs.length);
    insights.push(`<strong>${M.playerA}</strong> 场均 GPM <strong>${mean.toFixed(0)}</strong>，标准差 <strong>${sd.toFixed(0)}</strong>，${sd/mean<0.15?'发育非常稳定':'发育波动较大，值得关注'}。`);
  }
  if (bAgg) {
    insights.push(`<strong>${M.playerB}</strong> 场均助攻 <strong>${bAgg.avgA.toFixed(1)}</strong>、场均 GPM <strong>${bAgg.avgGPM.toFixed(0)}</strong>，定位偏${bAgg.avgA > bAgg.avgK ? '辅助/游走' : '核心'}。`);
  }

  // 英雄池绝活
  REAL_IDS.forEach(id => {
    const pool = heroPoolFor(id);
    const best = [...pool].sort((a,b)=>b.winRate-a.winRate || b.games-a.games)[0];
    if (best && best.games >= 2) {
      insights.push(`<strong>${id}</strong> 使用 <strong>${best.hero}</strong> 出战 ${best.games} 场，胜率 <strong>${best.winRate.toFixed(0)}%</strong>${best.winRate===100?'，是目前最稳的绝活。':'。'}`);
    }
  });

  // 补刀效率
  if (aAgg && bAgg) {
    const better = aAgg.avgLH > bAgg.avgLH ? M.playerA : M.playerB;
    insights.push(`场均正补更高的是 <strong>${better}</strong>（${Math.max(aAgg.avgLH,bAgg.avgLH).toFixed(0)}），另一人为 ${Math.min(aAgg.avgLH,bAgg.avgLH).toFixed(0)}，补刀基本功存在差距。`);
  }

  // 机器人规律
  const botAgg = aggList.filter(a => a.isBot);
  const worstBot = [...botAgg].sort((a,b)=>b.avgD-a.avgD)[0];
  if (worstBot) {
    insights.push(`机器人中 <strong>${worstBot.id}</strong> 场均死亡最高（<strong>${worstBot.avgD.toFixed(1)}</strong>），是优先集火目标。`);
  }

  // 胜负局差异
  const winMatches = MATCHES.filter(m=>m.result==='win');
  const loseMatches = MATCHES.filter(m=>m.result==='lose');
  if (winMatches.length && loseMatches.length) {
    const winAvgDur = avg(winMatches,'durationSec'), loseAvgDur = avg(loseMatches,'durationSec');
    insights.push(`胜利局场均时长 <strong>${Math.round(winAvgDur/60)} 分</strong>，失败局 <strong>${Math.round(loseAvgDur/60)} 分</strong>，${winAvgDur < loseAvgDur ? '速战速决时胜率更高' : '拉锯战反而更容易赢'}。`);
  }

  // ========== 散点图：4 个指标 vs 胜负 ==========
  function buildScatterConfig(canvasId, points, xTitle) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    // 对 y 做微小抖动，避免同胜负点重叠
    const data = points.map((p, i) => ({
      x: p.x,
      y: p.y + ((i % 5) - 2) * 0.04,
      raw: p,
    }));

    new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [{
          label: '对局',
          data,
          pointRadius: 6,
          pointHoverRadius: 9,
          backgroundColor: points.map(p => p.y === 1 ? 'rgba(74,222,128,0.85)' : 'rgba(248,113,113,0.85)'),
          borderColor: '#0f1419',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => {
                const r = c.raw.raw;
                return [
                  `${r.id} · ${r.date}`,
                  `${xTitle} ${r.xLabel}`,
                  `${r.heroes} · 得分比 ${r.scoreText}`,
                  r.y === 1 ? '胜' : '负',
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: xTitle, color: '#8b98a5' },
            ticks: { color: '#8b98a5' },
            grid: { color: '#2c3844' },
          },
          y: {
            title: { display: true, text: '结果（0=负 / 1=胜）', color: '#8b98a5' },
            min: -0.3, max: 1.3,
            ticks: {
              color: '#8b98a5', stepSize: 1,
              callback: (v) => v === 1 ? '胜' : v === 0 ? '负' : '',
            },
            grid: { color: '#2c3844' },
          },
        },
      },
    });
  }

  // 每局双方指标
  const matchMetrics = MATCHES.map(m => {
    const radiant = m.players.filter(p => p.team === 'radiant');
    const dire = m.players.filter(p => p.team === 'dire');
    const scoreR = sum(radiant, 'kills');
    const scoreD = sum(dire, 'kills');
    const avgGPMR = avg(radiant, 'gpm');
    const avgGPMD = avg(dire, 'gpm');
    const avgLvR = avg(radiant, 'level');
    const avgLvD = avg(dire, 'level');
    const heroA = m.players.find(p => p.id === M.playerA)?.hero || '—';
    const heroB = m.players.find(p => p.id === M.playerB)?.hero || '—';
    return {
      id: m.id, date: m.date, win: m.result === 'win' ? 1 : 0,
      duration: +(m.durationSec / 60).toFixed(1),
      scoreRatio: scoreD ? +(scoreR / scoreD).toFixed(2) : scoreR,
      scoreText: `${scoreR}:${scoreD}`,          // 新增：得分比
      heroes: `${heroA} + ${heroB}`,             // 新增：AB 英雄
      avgGPM: +avgGPMR.toFixed(0),
      avgGPMDiff: +(avgGPMR - avgGPMD).toFixed(0),
      avgLevel: +avgLvR.toFixed(1),
      avgLevelDiff: +(avgLvR - avgLvD).toFixed(1),
    };
  });

  // 1) 时长 vs 胜负
  buildScatterConfig('scatterDuration',
    matchMetrics.map(d => ({ x: d.duration, y: d.win, id: d.id, date: d.date,
      xLabel: `${d.duration} 分`, scoreText: d.scoreText, heroes: d.heroes })),
    '对局时长（分钟）'
  );

  // 2) 队伍得分比 vs 胜负
  buildScatterConfig('scatterScoreRatio',
    matchMetrics.map(d => ({ x: d.scoreRatio, y: d.win, id: d.id, date: d.date,
      xLabel: `得分比 ${d.scoreRatio}`, scoreText: d.scoreText, heroes: d.heroes })),
    '队伍得分比（我方 / 敌方）'
  );

  // 3) 队伍平均 GPM vs 胜负
  buildScatterConfig('scatterGPM',
    matchMetrics.map(d => ({ x: d.avgGPM, y: d.win, id: d.id, date: d.date,
      xLabel: `${d.avgGPM} GPM`, scoreText: d.scoreText, heroes: d.heroes })),
    '我方平均 GPM'
  );

  // 4) 队伍平均等级 vs 胜负
  buildScatterConfig('scatterLevel',
    matchMetrics.map(d => ({ x: d.avgLevel, y: d.win, id: d.id, date: d.date,
      xLabel: `平均等级 ${d.avgLevel}`, scoreText: d.scoreText, heroes: d.heroes })),
    '我方平均等级'
  );

  document.getElementById('insights').innerHTML = insights.map(s => `<li>${s}</li>`).join('');


  function enhanceHeroIcons(root = document.body) {
    if (!heroNamesSorted.length) return;

    // 跳过这些标签内的文本
    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CANVAS', 'SVG', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'BUTTON']);
    // 已经是图标结构的不再处理
    const ICON_CLASS = 'hero-icon';

    // 构建正则：转义特殊字符，用 | 连接，长名优先
    const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${heroNamesSorted.map(escapeReg).join('|')})`, 'g');

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest(`.${ICON_CLASS}`)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
      const text = node.nodeValue;
      if (!pattern.test(text)) return;
      pattern.lastIndex = 0; // test 会移动 lastIndex，重置

      const frag = document.createDocumentFragment();
      let last = 0;
      let m;
      while ((m = pattern.exec(text)) !== null) {
        if (m.index > last) {
          frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        }
        const name = m[0];
        const img = heroImgMap[name];
        const wrap = document.createElement('span');
        wrap.className = ICON_CLASS;
        wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;vertical-align:middle;';
        const icon = document.createElement('img');
        icon.src = img;
        icon.alt = name;
        icon.loading = 'lazy';
        icon.style.cssText = 'height:20px;border-radius:1px;object-fit:cover;flex-shrink:0;';
        wrap.appendChild(icon);
        wrap.appendChild(document.createTextNode(name));
        frag.appendChild(wrap);
        last = m.index + name.length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  // 所有渲染完成后调用
  enhanceHeroIcons();

  // setInterval(() => enhanceHeroIcons(), 2000); // 每隔 2 秒增强一次，处理动态内容
})();