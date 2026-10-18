/* Cribbage wireframes: a small but real game (random deals, real scoring, first to 121) behind clickable wireframe screens. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- data */
  var SUIT = { S: '♠', H: '♥', D: '♦', C: '♣' };
  var LABEL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  var SUITS = ['S', 'H', 'D', 'C'];

  var LESSONS = [
    ['The goal and card values', 'Race to 121 points and learn what each card is worth.'],
    ['The crib', 'Why each player gives two cards away, and who owns them.'],
    ['The starter card', 'The cut card that every hand shares.'],
    ['Fifteens', 'Find sets of cards that add up to 15.'],
    ['Pairs', 'Two, three or four of a kind.'],
    ['Runs', 'Three or more cards in a row.'],
    ['Flushes and nobs', 'Same suit and the jack of the starter suit.'],
    ['Pegging', 'Playing cards to a running count up to 31.'],
    ['The show', 'Counting hands and the crib at the end of a round.'],
    ['Strategy basics', 'What to keep, what to throw, when to play low.']
  ];

  var S = {
    cur: 'home',
    settings: { sound: true, haptics: true, explain: true, hints: true, diff: 'Medium', speed: 'Normal' },
    sel: [],
    lessonSel: [],
    lessonDone: { 0: true, 1: true },
    timer: null
  };
  var G = null; // the current game, or null before the first one starts

  /* ---------------------------------------------------------------- cards */
  function deckIds() {
    var out = [];
    SUITS.forEach(function (s) {
      for (var r = 1; r <= 13; r++) { out.push((LABEL[r] || r) + s); }
    });
    return out;
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function parse(id) {
    var suit = id.slice(-1), lab = id.slice(0, -1);
    return { id: id, suit: suit, rank: { A: 1, J: 11, Q: 12, K: 13 }[lab] || parseInt(lab, 10) };
  }
  function val(id) { return Math.min(parse(id).rank, 10); }
  function sortHand(ids) {
    return ids.slice().sort(function (a, b) {
      var x = parse(a), y = parse(b);
      return x.rank - y.rank || SUITS.indexOf(x.suit) - SUITS.indexOf(y.suit);
    });
  }
  function card(id, cls, attrs) {
    var c = parse(id), red = c.suit === 'H' || c.suit === 'D' ? ' red' : '';
    return '<div class="c' + red + (cls ? ' ' + cls : '') + '" ' + (attrs || '') + '>' + (LABEL[c.rank] || c.rank) + '<small>' + SUIT[c.suit] + '</small></div>';
  }
  function back(n, cls) {
    var h = '';
    for (var i = 0; i < n; i++) { h += '<div class="c back">x</div>'; }
    return '<div class="cards ' + (cls || 'sm') + '">' + h + '</div>';
  }
  function other(w) { return w === 'player' ? 'ai' : 'player'; }
  function pone() { return other(G.dealer); }

  /* ---------------------------------------------------------------- hand scoring */
  function subsets(arr) {
    var out = [];
    for (var m = 1; m < (1 << arr.length); m++) {
      var s = [];
      for (var i = 0; i < arr.length; i++) { if (m & (1 << i)) { s.push(arr[i]); } }
      out.push(s);
    }
    return out;
  }
  function scoreHand(ids, starter, isCrib) {
    var all = ids.concat([starter]), items = [];
    subsets(all).forEach(function (s) {
      if (s.reduce(function (t, id) { return t + val(id); }, 0) === 15) { items.push({ label: 'Fifteen', pts: 2, ids: s }); }
    });
    var byRank = {};
    all.forEach(function (id) { var r = parse(id).rank; (byRank[r] = byRank[r] || []).push(id); });
    Object.keys(byRank).forEach(function (r) {
      var n = byRank[r].length;
      if (n >= 2) { items.push({ label: n === 2 ? 'Pair' : n === 3 ? 'Three of a kind' : 'Four of a kind', pts: n === 2 ? 2 : n === 3 ? 6 : 12, ids: byRank[r] }); }
    });
    var r = 1;
    while (r <= 13) {
      if (byRank[r]) {
        var end = r;
        while (byRank[end + 1]) { end++; }
        var len = end - r + 1;
        if (len >= 3) {
          var mult = 1, runIds = [];
          for (var k = r; k <= end; k++) { mult *= byRank[k].length; runIds = runIds.concat(byRank[k]); }
          items.push({ label: 'Run of ' + len + (mult > 1 ? ' (x' + mult + ')' : ''), pts: len * mult, ids: runIds });
        }
        r = end + 1;
      } else { r++; }
    }
    var suits = ids.map(function (id) { return parse(id).suit; });
    if (suits.every(function (x) { return x === suits[0]; })) {
      if (parse(starter).suit === suits[0]) { items.push({ label: 'Flush of 5', pts: 5, ids: all }); }
      else if (!isCrib) { items.push({ label: 'Flush of 4', pts: 4, ids: ids }); }
    }
    ids.forEach(function (id) {
      var c = parse(id);
      if (c.rank === 11 && c.suit === parse(starter).suit) { items.push({ label: 'His nobs', pts: 1, ids: [id, starter] }); }
    });
    return { items: items, total: items.reduce(function (t, i) { return t + i.pts; }, 0) };
  }

  /* ---------------------------------------------------------------- discard helpers (AI and hint) */
  function cribPotential(a, b) {
    var x = parse(a), y = parse(b), v = 0, gap = Math.abs(x.rank - y.rank);
    if (x.rank === y.rank) { v += 2.5; }
    if (val(a) + val(b) === 15) { v += 2; }
    if (x.rank === 5 || y.rank === 5) { v += 1.1; }
    v += gap === 1 ? 0.9 : gap === 2 ? 0.6 : gap === 3 ? 0.2 : 0;
    if (x.suit === y.suit) { v += 0.3; }
    return v;
  }
  /** The two cards to throw, judged by the average hand score over every possible starter. */
  function bestDiscard(hand, isDealer) {
    var pool = deckIds().filter(function (id) { return hand.indexOf(id) < 0; }), best = null;
    for (var i = 0; i < hand.length; i++) {
      for (var j = i + 1; j < hand.length; j++) {
        var keep = hand.filter(function (id, k) { return k !== i && k !== j; }), sum = 0;
        pool.forEach(function (s) { sum += scoreHand(keep, s, false).total; });
        var total = sum / pool.length + (isDealer ? 1 : -1) * cribPotential(hand[i], hand[j]) * 0.6;
        if (!best || total > best.total) { best = { total: total, ids: [hand[i], hand[j]] }; }
      }
    }
    return best.ids;
  }

  /* ---------------------------------------------------------------- game flow */
  function deal(g) {
    var d = shuffle(deckIds());
    g.hands = { player: sortHand(d.slice(0, 6)), ai: sortHand(d.slice(6, 12)) };
    g.deck = d.slice(12);
    g.crib = []; g.starter = null; g.phase = 'discard'; g.peg = null; g.countStep = 0; g.countItem = 0;
    S.sel = [];
    return g;
  }
  function newGame(dealer) {
    G = deal({
      dealer: dealer || (Math.random() < 0.5 ? 'player' : 'ai'), round: 1, winner: null,
      scores: { player: { f: 0, b: 0 }, ai: { f: 0, b: 0 } }
    });
  }
  function award(who, n) {
    if (!n || G.winner) { return; }
    var s = G.scores[who];
    s.b = s.f;
    s.f = Math.min(121, s.f + n);
    if (s.f >= 121) { G.winner = who; }
  }
  function confirmDiscard(ids) {
    var aiIds = bestDiscard(G.hands.ai, G.dealer === 'ai');
    G.crib = ids.concat(aiIds);
    G.hands.player = G.hands.player.filter(function (id) { return ids.indexOf(id) < 0; });
    G.hands.ai = G.hands.ai.filter(function (id) { return aiIds.indexOf(id) < 0; });
    G.phase = 'cut';
  }
  function doCut() {
    var i = Math.floor(Math.random() * G.deck.length);
    G.starter = G.deck.splice(i, 1)[0];
    var heels = parse(G.starter).rank === 11;
    if (heels) { award(G.dealer, 2); }
    G.phase = 'pegging';
    var lead = pone();
    G.peg = {
      count: 0, pile: [], player: G.hands.player.slice(), ai: G.hands.ai.slice(), turn: lead, sel: null, done: false, shake: null,
      toast: heels ? (G.dealer === 'ai' ? 'Opponent: ' : '') + 'His heels for 2' : '',
      coach: (heels ? 'The starter is a jack, so the dealer scores 2. ' : '') + (lead === 'player' ? 'You lead. Tap a card twice, or drag it up, to play it.' : 'Opponent leads...')
    };
  }
  function skipToPhase(id) {
    newGame(id === 'cut' ? 'ai' : null);
    if (id === 'discard') { return; }
    confirmDiscard(bestDiscard(G.hands.player, G.dealer === 'player'));
    if (id === 'cut') { return; }
    doCut();
    if (id === 'pegging') { return; }
    G.phase = 'counting';
  }
  function demoGameOver() {
    newGame();
    G.scores = { player: { f: 121, b: 116 }, ai: { f: 104, b: 98 } };
    G.winner = 'player'; G.phase = 'gameover';
  }

  /* ---------------------------------------------------------------- pegging */
  function legal(hand, count) { return hand.filter(function (id) { return count + val(id) <= 31; }); }
  function playScore(pile) {
    var out = [], count = pile.reduce(function (t, id) { return t + val(id); }, 0);
    if (count === 15) { out.push(['15 for 2', 2, 'The running count reached exactly 15.']); }
    if (count === 31) { out.push(['31 for 2', 2, 'The running count reached exactly 31.']); }
    var last = parse(pile[pile.length - 1]).rank, n = 1;
    for (var i = pile.length - 2; i >= 0 && parse(pile[i]).rank === last; i--) { n++; }
    if (n >= 2) { out.push([n === 2 ? 'Pair for 2' : n === 3 ? 'Three of a kind for 6' : 'Four of a kind for 12', n === 2 ? 2 : n === 3 ? 6 : 12, 'The last card matched the one before it.']); }
    for (var len = pile.length; len >= 3; len--) {
      var ranks = pile.slice(pile.length - len).map(function (id) { return parse(id).rank; }).sort(function (a, b) { return a - b; });
      var run = true;
      for (var k = 1; k < ranks.length; k++) { if (ranks[k] !== ranks[k - 1] + 1) { run = false; break; } }
      if (run) { out.push(['Run of ' + len + ' for ' + len, len, 'The last ' + len + ' cards form a run, in any order.']); break; }
    }
    return out;
  }
  function pts(pile) { return playScore(pile).reduce(function (t, s) { return t + s[1]; }, 0); }
  function pickPlay(p, hand) {
    var opts = legal(hand, p.count);
    if (!opts.length) { return null; }
    var best = null;
    opts.forEach(function (id) {
      var nc = p.count + val(id), v = pts(p.pile.concat(id)) - (nc === 5 || nc === 21 ? 1.2 : 0) + Math.random() * 0.05;
      if (!best || v > best.v) { best = { id: id, v: v }; }
    });
    return best.id;
  }
  function playCard(who, id) {
    var p = G.peg, hand = p[who];
    hand.splice(hand.indexOf(id), 1);
    p.pile.push(id);
    p.count += val(id);
    var sc = playScore(p.pile), total = 0, names = [], why = [];
    sc.forEach(function (s) { total += s[1]; names.push(s[0]); why.push(s[2]); });
    if (total) {
      award(who, total);
      p.toast = (who === 'ai' ? 'Opponent: ' : '') + names.join(' + ');
      if (S.settings.explain) { p.coach = why.join(' '); }
    } else { p.toast = ''; }
    p.sel = null;
    if (!G.winner) { advance(who); }
  }
  function advance(who) {
    var p = G.peg, opp = other(who);
    var oppCan = legal(p[opp], p.count).length > 0, meCan = legal(p[who], p.count).length > 0;
    var empty = !p.player.length && !p.ai.length;
    function endSeq(next) {
      p.pile = []; p.count = 0;
      if (empty) { p.done = true; p.turn = null; p.coach = 'All cards played. Time to count the hands.'; return; }
      p.turn = p[next].length ? next : other(next);
    }
    var noteTurn = function () {
      if (!p.toast && !(S.settings.explain && p.coach.indexOf('matched') >= 0)) {
        p.coach = p.turn === 'ai' ? 'Opponent is thinking...' : 'Your turn. The count is ' + p.count + '.';
      }
    };
    if (p.count === 31) { endSeq(opp); noteTurn(); }
    else if (oppCan) { p.turn = opp; noteTurn(); }
    else if (meCan) {
      p.turn = who; p.toast = (opp === 'ai' ? 'Opponent' : 'You') + ' said Go';
      p.coach = who === 'player' ? 'Opponent said Go. Keep playing while you stay at or under 31.' : 'You said Go. Opponent plays on...';
    } else {
      award(who, 1);
      p.toast = (who === 'ai' ? 'Opponent: ' : '') + (empty ? 'Last card' : 'Go') + ' for 1';
      endSeq(opp);
      if (!p.done) { p.coach = p.turn === 'ai' ? 'Opponent leads...' : 'New count. You lead.'; }
    }
  }
  function aiMove() {
    var p = G && G.peg;
    if (!p || p.turn !== 'ai' || S.cur !== 'pegging' || p.done || G.winner) { return; }
    var id = pickPlay(p, p.ai);
    if (id) { playCard('ai', id); render(); }
  }

  /* ---------------------------------------------------------------- shared pieces */
  function crown(who) { return G.dealer === who ? '<span class="badge">DEALER</span>' : ''; }
  function pegBoard() {
    function left(n) { return (7 + Math.min(n, 121) / 121 * 84) + '%'; }
    var a = G.scores.ai, p = G.scores.player;
    return '<div class="board"><div class="peg" style="left:' + left(a.f) + ';top:.45em"></div><div class="peg b" style="left:' + left(a.b) + ';top:.45em"></div>' +
      '<div class="peg" style="left:' + left(p.f) + ';top:1.75em"></div><div class="peg b" style="left:' + left(p.b) + ';top:1.75em"></div></div>';
  }
  function oppPanel(n) {
    return '<div class="box rowf between"><div class="score"><span class="lbl">Opponent</span><b>' + G.scores.ai.f + '</b>' + crown('ai') + '</div>' + (n ? back(n) : '') + '</div>';
  }
  function youPanel(extra) {
    return '<div class="box rowf between"><div class="score"><span class="lbl">You</span><b>' + G.scores.player.f + '</b>' + crown('player') + '</div>' + (extra || '') + '</div>';
  }
  function linkBtn(act, text) {
    return '<button class="lbl" type="button" data-act="' + act + '" style="background:none;border:0;cursor:pointer">' + text + '</button>';
  }
  function gameTop(right) {
    return '<div class="top"><button class="ib" type="button" data-go="pause" aria-label="Pause menu">☰</button><span>ROUND ' + G.round + '</span><span>' + (right || (G.dealer === 'player' ? 'YOUR CRIB' : "OPPONENT'S CRIB")) + '</span></div>';
  }
  function toggle(key, label) {
    return '<div class="box rowf between"><span>' + label + '</span><button class="sw' + (S.settings[key] ? ' on' : '') + '" type="button" role="switch" aria-checked="' + !!S.settings[key] + '" aria-label="' + label + '" data-act="toggle:' + key + '"></button></div>';
  }
  function seg(key, opts) {
    return '<div class="seg">' + opts.map(function (o) { return '<button type="button" class="' + (S.settings[key] === o ? 'on' : '') + '" data-act="seg:' + key + ':' + o + '">' + o + '</button>'; }).join('') + '</div>';
  }
  function backTop(label, to) {
    return '<div class="top"><button class="ib" type="button" data-go="' + to + '" aria-label="Back">‹</button><span>' + label + '</span><span style="width:2.2em"></span></div>';
  }
  function inProgress() { return G && !G.winner && G.phase !== 'gameover'; }

  /* ---------------------------------------------------------------- screens */
  var SCREENS = {};

  SCREENS.home = function () {
    return '<div class="sp"></div>' +
      '<div class="cards lg">' + card('AS') + card('5H') + card('JD') + '</div>' +
      '<div class="title">Cribbage</div><div class="lbl center">Race to 121</div><div class="sp"></div>' +
      (inProgress() ? '<button class="btn pri" type="button" data-act="continue">Continue game · You ' + G.scores.player.f + ' – ' + G.scores.ai.f + '</button>' : '') +
      '<button class="btn' + (inProgress() ? '' : ' pri') + '" type="button" data-act="newgame">New game</button>' +
      '<button class="btn" type="button" data-go="lessons">Learn to play</button>' +
      '<div class="rowf"><button class="btn sm grow" type="button" data-go="rules">Rules</button><button class="btn sm grow" type="button" data-go="settings">Settings</button></div><div class="sp"></div>';
  };

  SCREENS.settings = function () {
    return backTop('SETTINGS', 'home') +
      toggle('sound', 'Sound') + toggle('haptics', 'Haptics') + toggle('explain', 'Score explanations') + toggle('hints', 'Coaching hints') +
      '<div class="lbl">Opponent difficulty</div>' + seg('diff', ['Easy', 'Medium', 'Hard']) +
      '<div class="lbl">Opponent speed</div>' + seg('speed', ['Fast', 'Normal', 'Slow']) + '<div class="sp"></div>';
  };

  SCREENS.discard = function () {
    var ready = S.sel.length === 2, mine = G.dealer === 'player';
    var coach = 'Choose two cards for ' + (mine ? 'your' : "your opponent's") + ' crib.' +
      (S.settings.hints ? (mine ? ' It is your crib, so it scores for you.' : ' Keep cards that make 15s, pairs and runs.') : '');
    return gameTop() + oppPanel(6) + pegBoard() +
      '<div class="table"><div class="rowf" style="gap:1.4em"><div class="ph" style="width:3.3em;height:4.6em">deck</div><div class="ph" style="width:3.3em;height:4.6em">crib</div></div></div>' +
      '<div class="coach">' + coach + '</div>' +
      youPanel(linkBtn('hintDiscard', 'Hint ?')) +
      '<div class="cards gap" style="padding-top:.9em">' + G.hands.player.map(function (id) { return card(id, 'tap' + (S.sel.indexOf(id) >= 0 ? ' sel' : ''), 'data-act="pick:' + id + '"'); }).join('') + '</div>' +
      '<button class="btn pri' + (ready ? '' : ' off') + '" type="button" data-act="sendCrib">' + (ready ? 'Send 2 to crib' : 'Pick ' + (2 - S.sel.length) + ' more') + '</button>';
  };

  SCREENS.cut = function () {
    var mine = pone() === 'player';
    return gameTop() + oppPanel(4) + pegBoard() +
      '<div class="table"><div class="rowf" style="gap:2em">' +
      (mine ? '<div class="ph clickable" style="width:4.6em;height:6.4em" data-act="cut">tap deck to cut</div>' : '<div class="ph" style="width:4.6em;height:6.4em">cutting...</div>') +
      '<div class="ph" style="width:3.3em;height:4.6em">crib x4</div></div></div>' +
      '<div class="coach">' + (mine ? 'Tap the deck to cut the starter card.' : 'Your opponent is cutting the deck...') + ' A jack scores 2 for the dealer.</div>' +
      youPanel() + '<div class="cards gap">' + G.hands.player.map(function (id) { return card(id); }).join('') + '</div>';
  };

  SCREENS.pegging = function () {
    var p = G.peg, legalNow = legal(p.player, p.count);
    var hand = p.player.map(function (id) {
      var cls = 'tap';
      if (p.turn === 'player' && legalNow.indexOf(id) < 0) { cls += ' dim'; }
      if (p.sel === id) { cls += ' sel'; }
      if (p.shake === id) { cls += ' shake'; }
      return card(id, cls, 'data-act="peg:' + id + '"');
    }).join('');
    return gameTop() + oppPanel(p.ai.length) + pegBoard() +
      '<div class="table"><div class="rowf" style="gap:1em"><div class="ph" style="width:2.8em;height:3.9em">deck</div>' + card(G.starter, '', 'style="width:3.6em;height:5em"') + '<div class="ph" style="width:2.8em;height:3.9em">crib</div></div>' +
      '<div class="rowf" style="gap:.9em"><div class="cards sm">' + (p.pile.length ? p.pile.map(function (id) { return card(id); }).join('') : '<div class="lbl">pile empty</div>') + '</div><div class="count">' + p.count + '<small>COUNT</small></div></div></div>' +
      '<div class="toast' + (p.toast ? '' : ' empty') + '">' + (p.toast || '-') + '</div>' +
      '<div class="coach">' + p.coach + '</div>' +
      youPanel(S.settings.hints && !p.done ? linkBtn('hintPeg', 'Hint ?') : '') +
      (p.done ? '<button class="btn pri" type="button" data-act="toCount">Count the hands</button>' : '<div class="cards gap" style="padding-top:.9em;min-height:5.5em">' + hand + '</div>');
  };

  function countData() {
    var step = G.countStep, dealer = G.dealer, owner = step === 0 ? pone() : dealer;
    var ids = step === 2 ? G.crib : G.hands[owner], mine = owner === 'player';
    return {
      owner: owner, ids: ids, crib: step === 2,
      title: step === 2 ? (mine ? 'Your crib' : "Opponent's crib") : (mine ? 'Your hand' : "Opponent's hand"),
      res: scoreHand(ids, G.starter, step === 2)
    };
  }
  SCREENS.counting = function () {
    var d = countData(), res = d.res;
    var active = res.items[G.countItem] || res.items[0], hl = active ? active.ids : [];
    var cards = d.ids.concat([G.starter]).map(function (id, i) { return card(id, hl.indexOf(id) >= 0 ? 'sel' : '', i === d.ids.length ? 'style="border-style:dashed;margin-left:.9em"' : ''); }).join('');
    var rows = res.items.length ? res.items.map(function (it, i) {
      return '<div class="item-row clickable' + (it === active ? ' active' : '') + '" data-act="item:' + i + '"><span>' + it.label + '</span><span>+' + it.pts + '</span></div>';
    }).join('') : '<div class="lbl center">No points in this one</div>';
    var coach = active && active.label === 'Fifteen' && S.settings.explain ? 'Every different set of cards that adds to 15 scores 2 points.' : 'Tap a line to highlight the cards that score it.';
    return gameTop('COUNTING ' + (G.countStep + 1) + '/3') + oppPanel(0) + pegBoard() +
      '<div class="table"><div class="lbl">' + d.title + ' + starter</div><div class="cards">' + cards + '</div></div>' +
      '<div class="box" style="display:grid;gap:.35em;max-height:30%;overflow-y:auto">' + rows +
      '<div class="item-row" style="border-top:1.5px solid var(--line);padding-top:.35em"><b>Total</b><b>' + res.total + '</b></div></div>' +
      '<div class="coach">' + coach + '</div>' +
      youPanel() +
      '<button class="btn pri" type="button" data-act="nextCount">' + (G.countStep === 2 ? 'Score it · Next round' : 'Score ' + res.total + ' · Next') + '</button>';
  };

  SCREENS.pause = function () {
    var base = G.phase === 'gameover' ? SCREENS.home() : SCREENS[G.phase]();
    return base +
      '<div class="scrim"><div class="modal"><div class="title" style="font-size:1.5em">Paused</div>' +
      '<button class="btn pri" type="button" data-go="' + (G.phase === 'gameover' ? 'home' : G.phase) + '">Resume</button>' +
      toggle('sound', 'Sound') + toggle('hints', 'Hints') + seg('diff', ['Easy', 'Medium', 'Hard']) +
      '<button class="btn" type="button" data-act="newgame">Restart game</button>' +
      '<button class="btn" type="button" data-go="home">Quit to home</button></div></div>';
  };

  SCREENS.gameover = function () {
    var win = G.winner === 'player';
    function pos(s) { return (7 + Math.min(s, 121) / 121 * 84) + '%'; }
    return '<div class="top"><span></span><span>GAME OVER</span><span></span></div><div class="ph" style="flex:1">' + (win ? 'confetti (win only)' : 'game table') + '</div>' +
      '<div class="scrim"><div class="modal center"><div class="title">' + (win ? 'You win!' : 'Opponent wins') + '</div>' +
      '<div class="rowf" style="justify-content:space-around"><div><div class="lbl">You</div><b style="font-family:var(--font-mono);font-size:1.9em">' + G.scores.player.f + '</b></div><div><div class="lbl">Opponent</div><b style="font-family:var(--font-mono);font-size:1.9em">' + G.scores.ai.f + '</b></div></div>' +
      '<div class="board" style="height:2.2em"><div class="peg" style="left:' + pos(G.scores.ai.f) + ';top:.35em"></div><div class="peg" style="left:' + pos(G.scores.player.f) + ';top:1.2em"></div></div>' +
      '<div class="lbl">Played ' + G.round + ' round' + (G.round === 1 ? '' : 's') + '</div>' +
      '<button class="btn pri" type="button" data-act="newgame">Play again</button><button class="btn" type="button" data-go="home">Home</button></div></div>';
  };

  SCREENS.lessons = function () {
    var firstOpen = -1;
    LESSONS.forEach(function (l, i) { if (firstOpen < 0 && !S.lessonDone[i]) { firstOpen = i; } });
    return backTop('LEARN', 'home') + '<div class="scroll">' + LESSONS.map(function (l, i) {
      var done = S.lessonDone[i];
      return '<div class="box lesson' + (i === firstOpen ? ' next' : '') + '" data-go="lesson"><div class="rowf between"><b>' + (i + 1) + '. ' + l[0] + '</b>' +
        (done ? '<span class="lbl ok">done</span>' : i === firstOpen ? '<span class="badge">next</span>' : '') + '</div><span style="color:var(--ink-dim)">' + l[1] + '</span></div>';
    }).join('') + '</div>';
  };

  SCREENS.lesson = function () {
    var ids = ['5H', '4S', 'KC', '2D', '6D'];
    var sum = S.lessonSel.reduce(function (t, id) { return t + val(id); }, 0), msg, ok = false;
    if (S.lessonSel.length < 2) { msg = 'Tap the cards you want to add together.'; }
    else if (sum === 15) { ok = true; msg = '<span class="ok">' + S.lessonSel.map(function (id) { return LABEL[parse(id).rank] || parse(id).rank; }).join(' + ') + ' = 15. That scores 2 points.</span>'; }
    else { msg = '<span class="no">Those add up to ' + sum + ', not 15. Try another combination.</span>'; }
    return '<div class="top"><button class="ib" type="button" data-go="lessons" aria-label="Close">×</button><span>FIFTEENS · 2/5</span><span style="width:2.2em"></span></div>' +
      '<div class="dots"><i class="on"></i><i class="on"></i><i></i><i></i><i></i></div>' +
      '<div class="title" style="font-size:1.4em;text-align:left">Try it: find a fifteen</div>' +
      '<div style="display:grid;gap:.4em"><div class="line"></div><div class="line m"></div></div>' +
      '<div class="box center" style="border-color:var(--accent);background:var(--accent-soft)"><b>Tap cards that add up to 15.</b></div>' +
      '<div class="cards gap" style="padding-top:1em">' + ids.map(function (id) { return card(id, 'tap' + (S.lessonSel.indexOf(id) >= 0 ? ' sel' : ''), 'data-act="lessonPick:' + id + '"'); }).join('') + '</div>' +
      '<div class="coach" style="margin-top:.8em">' + msg + '</div><div class="sp"></div>' +
      '<div class="rowf"><button class="btn grow" type="button" data-go="lessons">Back</button><button class="btn pri grow' + (ok ? '' : ' off') + '" type="button" data-act="lessonNext">Next</button></div>';
  };

  SCREENS.rules = function () {
    return backTop('RULES', 'home') + '<div class="scroll">' +
      '<div class="box" style="display:grid;gap:.4em"><b>The goal</b><div class="line"></div><div class="line m"></div></div>' +
      '<div class="box" style="display:grid;gap:.4em"><b>A round, step by step</b><div class="line"></div><div class="line m"></div><div class="line s"></div></div>' +
      '<div class="box" style="display:grid;gap:.35em"><b>Scoring</b>' +
      [['Fifteen', '2'], ['Pair', '2'], ['Three of a kind', '6'], ['Four of a kind', '12'], ['Run of 3 or more', '1 per card'], ['Flush (4 / 5 cards)', '4 / 5'], ['His nobs', '1'], ['His heels', '2']]
        .map(function (r) { return '<div class="item-row"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>'; }).join('') + '</div>' +
      '<div class="box" style="display:grid;gap:.4em"><b>Pegging</b><div class="line"></div><div class="line m"></div></div>' +
      '<div class="box" style="display:grid;gap:.4em"><b>Winning</b><div class="line m"></div></div></div>';
  };

  /* ---------------------------------------------------------------- navigation list and notes */
  var GROUPS = [
    { name: 'Entry', items: [['home', 'Home', 'Start, continue, learn'], ['settings', 'Settings', 'Sound, hints, difficulty']] },
    { name: 'A round of play', items: [['discard', 'Discard', 'Pick 2 cards for the crib'], ['cut', 'Cut', 'Turn up the starter'], ['pegging', 'Pegging', 'Play cards up to 31'], ['counting', 'Counting', 'Score hands and crib']] },
    { name: 'Overlays', items: [['pause', 'Pause menu', 'Resume, restart, quit'], ['gameover', 'Game over', 'Result and play again']] },
    { name: 'Learning', items: [['lessons', 'Tutorial lessons', 'Ten short lessons'], ['lesson', 'Tutorial step', 'Interactive practice'], ['rules', 'Rules', 'Reference page']] }
  ];
  var NOTES = {
    home: 'Press New game to play a full game from 0 to 121. Continue only appears while a game is in progress.',
    settings: 'Every change saves instantly. The toggles and options here work in this preview.',
    discard: 'Pick 2 of your 6 cards for the crib. The dealer swaps every round. Hint selects the best two.',
    cut: 'The non-dealer cuts the deck. If you are the dealer, the opponent cuts for you. A jack gives the dealer 2 points.',
    pegging: 'Play cards up to a count of 31. Tap once to select, tap again to play. Cards that would pass 31 are dimmed.',
    counting: 'Three steps: non-dealer hand, dealer hand, crib. Points are real and move the pegs when you tap the button.',
    pause: 'Opened from the menu button. The game stays in progress, so Home shows Continue.',
    gameover: 'The game ends the moment someone reaches 121, even in the middle of a round.',
    lessons: 'Ten lessons with a short summary each. Progress is saved on the device.',
    lesson: 'The learner taps cards and the app checks the answer with the real scoring rules.',
    rules: 'A scrollable reference: goal, round flow, scoring table, pegging.'
  };
  var TITLES = {};
  GROUPS.forEach(function (g) { g.items.forEach(function (i) { TITLES[i[0]] = i[1]; }); });
  var PHASES = { discard: 1, cut: 1, pegging: 1, counting: 1 };

  function buildNav() {
    var n = 0;
    document.getElementById('nav').innerHTML = GROUPS.map(function (g) {
      return '<div><div class="group-title">' + g.name + '</div>' + g.items.map(function (i) {
        n++;
        return '<button type="button" class="nav-item" data-nav="' + i[0] + '"><span class="n">' + (n < 10 ? '0' : '') + n + '</span><span class="t"><b>' + i[1] + '</b><span>' + i[2] + '</span></span></button>';
      }).join('') + '</div>';
    }).join('');
  }

  /* ---------------------------------------------------------------- render, timers, events */
  function setHash(id) { if (location.hash.slice(1) !== id) { location.hash = id; } }

  function auto() {
    clearTimeout(S.timer);
    if (!G || G.winner) { return; }
    var delay = { Fast: 450, Normal: 900, Slow: 1500 }[S.settings.speed];
    if (S.cur === 'cut' && G.phase === 'cut' && pone() === 'ai') {
      S.timer = setTimeout(function () { if (S.cur === 'cut' && G.phase === 'cut') { doCut(); go('pegging'); } }, 1100);
    } else if (S.cur === 'pegging' && G.peg && G.peg.turn === 'ai' && !G.peg.done) {
      S.timer = setTimeout(aiMove, delay);
    }
  }

  function render() {
    if (G && G.winner && G.phase !== 'gameover') {
      G.phase = 'gameover';
      if (PHASES[S.cur] || S.cur === 'pause') { S.cur = 'gameover'; setHash('gameover'); }
    }
    var id = SCREENS[S.cur] ? S.cur : 'home';
    if (!G && (PHASES[id] || id === 'pause' || id === 'gameover')) { id = S.cur = 'home'; }
    document.getElementById('phone').innerHTML = SCREENS[id]();
    document.getElementById('notes').innerHTML = '<b>' + TITLES[id] + '</b>' + NOTES[id];
    var items = document.querySelectorAll('.nav-item');
    for (var i = 0; i < items.length; i++) { items[i].classList.toggle('on', items[i].getAttribute('data-nav') === id); }
    auto();
  }

  function go(id) {
    if (id === 'lesson') { S.lessonSel = []; }
    S.cur = id;
    setHash(id);
    render();
  }

  /** Opening a game screen from the left panel: reuse the live game if it is already there, else fast-forward a fresh one. */
  function openFromPanel(id) {
    if (id === 'gameover') { demoGameOver(); }
    else if (id === 'pause') { if (!inProgress()) { skipToPhase('pegging'); } }
    else if (PHASES[id]) { if (!G || G.phase !== id) { skipToPhase(id); } }
    go(id);
  }

  function act(a) {
    var parts = a.split(':'), k = parts[0], v = parts[1], p;
    if (k === 'toggle') { S.settings[v] = !S.settings[v]; }
    else if (k === 'seg') { S.settings[v] = parts[2]; }
    else if (k === 'newgame') { newGame(); go('discard'); return; }
    else if (k === 'continue') { go(G.phase); return; }
    else if (k === 'pick') {
      var i = S.sel.indexOf(v);
      if (i >= 0) { S.sel.splice(i, 1); } else { S.sel = S.sel.length >= 2 ? [S.sel[1], v] : S.sel.concat(v); }
    }
    else if (k === 'hintDiscard') { S.sel = bestDiscard(G.hands.player, G.dealer === 'player'); }
    else if (k === 'sendCrib') {
      if (S.sel.length === 2) { confirmDiscard(S.sel.slice()); S.sel = []; go('cut'); return; }
    }
    else if (k === 'cut') { doCut(); go('pegging'); return; }
    else if (k === 'peg') {
      p = G.peg;
      if (!p || p.turn !== 'player') { return; }
      if (legal([v], p.count).length === 0) {
        p.shake = v; p.coach = 'That card would take the count over 31. Choose a lower card.'; render(); p.shake = null; return;
      }
      if (p.sel === v) { playCard('player', v); } else { p.sel = v; }
    }
    else if (k === 'hintPeg') {
      p = G.peg;
      if (p.turn === 'player') {
        var id = pickPlay(p, p.player);
        if (id) { p.sel = id; p.coach = pts(p.pile.concat(id)) ? 'Try the ' + (LABEL[parse(id).rank] || parse(id).rank) + ': it scores ' + pts(p.pile.concat(id)) + '.' : 'Try the ' + (LABEL[parse(id).rank] || parse(id).rank) + ': a safe play that gives away little.'; }
      }
    }
    else if (k === 'toCount') { G.phase = 'counting'; G.countStep = 0; G.countItem = 0; go('counting'); return; }
    else if (k === 'item') { G.countItem = parseInt(v, 10); }
    else if (k === 'nextCount') {
      var d = countData();
      award(d.owner, d.res.total);
      if (G.winner) { render(); return; }
      if (G.countStep < 2) { G.countStep++; G.countItem = 0; }
      else { G.dealer = other(G.dealer); G.round++; deal(G); go('discard'); return; }
    }
    else if (k === 'lessonPick') {
      var j = S.lessonSel.indexOf(v);
      if (j >= 0) { S.lessonSel.splice(j, 1); } else { S.lessonSel.push(v); }
    }
    else if (k === 'lessonNext') { S.lessonDone[3] = true; go('lessons'); return; }
    render();
  }

  document.getElementById('phone').addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-go]');
    if (!t) { return; }
    if (t.hasAttribute('data-act')) { act(t.getAttribute('data-act')); }
    else { go(t.getAttribute('data-go')); }
  });
  document.getElementById('nav').addEventListener('click', function (e) {
    var t = e.target.closest('[data-nav]');
    if (t) { openFromPanel(t.getAttribute('data-nav')); }
  });
  window.addEventListener('hashchange', function () {
    var id = location.hash.slice(1);
    if (SCREENS[id] && id !== S.cur) { openFromPanel(id); }
  });
  document.getElementById('theme').addEventListener('click', function () {
    var root = document.documentElement, cur = root.getAttribute('data-theme');
    var dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', dark ? 'light' : 'dark');
  });

  buildNav();
  var start = location.hash.slice(1);
  if (SCREENS[start]) { openFromPanel(start); } else { render(); }
})();
