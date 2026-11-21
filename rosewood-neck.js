/* Rosewood 2D neck — visual skin only. Labs keep their own cells, classes, labels, and handlers.
   Usage: RosewoodNeck.attach(neckOuterEl, {isBass?:boolean}) after the grid is built;
          RosewoodNeck.refresh(el) after classes/labels change (inlay coverage). */
(function (root) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var CSS_ID = "rosewood-neck-css";
  var INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
  var DOUBLE_INLAY = { 12: 1, 24: 1 };
  var NOTE_CLASS = /\b(next|correct|wrong|root|ghost|shift|lit|target|chord|scale|pickable)\b/;

  var THEME = {
    board1: "#4a301e",
    board2: "#24160e",
    board3: "#331e14",
    bind: "#e6d7b4",
    bindDark: "#b89a68",
    nut1: "#fff8e8",
    nut2: "#ead9b0",
    nut3: "#b89860",
    pearl1: "#f6eed8",
    pearl2: "#cfc19a",
    pearlStroke: "#8a7a58",
    side: "#e8dcc0",
    stringPlain: "#d8dbe0",
    stringWound: "#c3ae86",
    woundDark: "#5c4a32",
    fretHi: "#f7f6f2",
    fretMid: "#c8c4ba",
    fretLo: "#6a6860",
    bg: "#0b0b0b"
  };

  function injectCSS() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement("style");
    s.id = CSS_ID;
    s.textContent = [
      /* Drop the lab's brown frame so only the SVG binding is visible. */
      ".neck-outer.rw-skinned{background:#0b0b0b !important;border:none !important;box-shadow:none !important;position:relative;}",
      ".neck-outer.rw-skinned .rw-svg{position:absolute;left:0;top:0;pointer-events:none;z-index:0;overflow:visible;display:block;}",
      /* Hide every lab chrome the SVG replaces. !important beats lab rules. */
      ".neck-outer.rw-skinned .string-line,",
      ".neck-outer.rw-skinned i.string-line,",
      ".neck-outer.rw-skinned .fret-cell::after,",
      ".neck-outer.rw-skinned .fret-cell.open-cell::after,",
      ".neck-outer.rw-skinned .inlay,",
      ".neck-outer.rw-skinned .nut,",
      ".neck-outer.rw-skinned > .nut,",
      ".neck-outer.rw-skinned .strings-wrap > .nut{visibility:hidden !important;opacity:0 !important;background:none !important;box-shadow:none !important;border:none !important;}",
      ".neck-outer.rw-skinned .fret-numbers,",
      ".neck-outer.rw-skinned .string-row,",
      ".neck-outer.rw-skinned .strings-wrap{position:relative;z-index:5;background:transparent !important;}",
      ".neck-outer.rw-skinned .string-name{position:relative;z-index:6;text-shadow:0 0 3px #0b0b0b,0 0 6px #0b0b0b;}",
      /* Never skin an inner wrapper — the SVG belongs on .neck-outer only. */
      ".fretboard.rw-skinned{background:transparent;}"
    ].join("\n");
    document.head.appendChild(s);
  }

  /* High-to-low, matching lab row order (high string at the top). */
  function gauges(nStr, isBass) {
    var g;
    if (isBass) {
      if (nStr >= 6) g = [[2.6, 1], [3.1, 1], [3.7, 1], [4.4, 1], [5.1, 1], [5.8, 1]];
      else if (nStr === 5) g = [[2.8, 1], [3.5, 1], [4.2, 1], [5.0, 1], [5.8, 1]];
      else g = [[2.9, 1], [3.7, 1], [4.5, 1], [5.4, 1]];
    } else {
      /* e B G plain, D A E wound; 7/8 add thicker wound B / F#. Slightly up vs v1 so they read on short rows. */
      g = [[1.45, 0], [1.7, 0], [2.05, 0], [2.8, 1], [3.45, 1], [4.15, 1], [5.0, 1], [5.8, 1]];
    }
    if (g.length < nStr) {
      var last = g[g.length - 1];
      while (g.length < nStr) g.push([last[0] + 0.6, 1]);
    }
    return g.slice(0, nStr);
  }

  function inferBass(outer, nStr, names) {
    if (outer && outer.getAttribute("data-rw-bass") === "1") return true;
    if (outer && outer.getAttribute("data-rw-bass") === "0") return false;
    if (document.body && document.body.classList.contains("inst-bass")) return true;
    var n0 = (names && names[0] != null) ? String(names[0]) : "";
    if (/^C$/i.test(n0) && nStr >= 6) return true;
    if (/^e$/i.test(n0) || /^eb$/i.test(n0)) return false;
    if (nStr === 4 || nStr === 5) return true;
    if (/^[Gg]$/.test(n0) && nStr <= 6) return true;
    return false;
  }

  function cellHasNote(cell) {
    if (!cell) return false;
    if (NOTE_CLASS.test(cell.className || "")) return true;
    var dot = cell.querySelector(".dot");
    if (!dot) return false;
    if (NOTE_CLASS.test(dot.className || "")) return true;
    if ((dot.textContent || "").trim()) return true;
    return false;
  }

  function fretOfCell(cell, numList) {
    if (cell && cell.dataset && cell.dataset.f != null && cell.dataset.f !== "") {
      var n = +cell.dataset.f;
      if (!isNaN(n)) return n;
    }
    var row = cell && cell.parentElement;
    if (!row) return null;
    var cells = row.querySelectorAll(".fret-cell");
    var idx = Array.prototype.indexOf.call(cells, cell);
    if (idx < 0) return null;
    if (numList && numList[idx] != null) return numList[idx];
    return idx;
  }

  function numberList(outer) {
    var nums = outer.querySelectorAll(".fret-numbers > *, .fret-numbers span, .fret-numbers div");
    var out = [], started = false, i, t;
    for (i = 0; i < nums.length; i++) {
      t = (nums[i].textContent || "").trim();
      if (!started && t === "") continue;
      started = true;
      if (/^OPEN$/i.test(t)) out.push(0);
      else if (t !== "" && !isNaN(+t)) out.push(+t);
    }
    return out;
  }

  function relRect(el, origin) {
    var a = el.getBoundingClientRect(), k = origin.k || 1;
    /* k = CSS transform scale on .neck-outer (Fret Lab fitNeckToBox); coords stay in unscaled CSS px. */
    return {
      x: (a.left - origin.left) / k,
      y: (a.top - origin.top) / k,
      w: a.width / k,
      h: a.height / k,
      cx: (a.left - origin.left + a.width / 2) / k,
      cy: (a.top - origin.top + a.height / 2) / k,
      r: (a.right - origin.left) / k,
      b: (a.bottom - origin.top) / k
    };
  }

  function uid() {
    return "rw" + Math.random().toString(36).slice(2, 8);
  }

  function mid(a, b) { return (a + b) / 2; }

  function neckHost(el) {
    if (!el) return null;
    if (el.classList && el.classList.contains("neck-outer")) return el;
    if (el.querySelector) {
      var found = el.querySelector(".neck-outer");
      if (found) return found;
    }
    return null;
  }

  function stripStraySkins(outer) {
    /* A previous auto-attach painted #fretboard as well as .neck-outer. Keep only one SVG. */
    var all = document.querySelectorAll("svg.rw-svg");
    for (var i = 0; i < all.length; i++) {
      if (all[i].parentElement !== outer) all[i].parentNode.removeChild(all[i]);
    }
    var sk = document.querySelectorAll(".rw-skinned");
    for (i = 0; i < sk.length; i++) {
      if (sk[i] !== outer) sk[i].classList.remove("rw-skinned");
    }
  }

  function defs(id) {
    var T = THEME;
    return [
      "<defs>",
      '<linearGradient id="', id, '-board" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="', T.board1, '"/>',
      '<stop offset="0.16" stop-color="', T.board3, '"/>',
      '<stop offset="0.5" stop-color="', T.board2, '"/>',
      '<stop offset="0.84" stop-color="', T.board3, '"/>',
      '<stop offset="1" stop-color="', T.board1, '"/>',
      "</linearGradient>",
      '<linearGradient id="', id, '-rad" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#000" stop-opacity="0.42"/>',
      '<stop offset="0.22" stop-color="#000" stop-opacity="0"/>',
      '<stop offset="0.78" stop-color="#000" stop-opacity="0"/>',
      '<stop offset="1" stop-color="#000" stop-opacity="0.46"/>',
      "</linearGradient>",
      '<linearGradient id="', id, '-nut" x1="0" y1="0" x2="1" y2="0">',
      '<stop offset="0" stop-color="', T.nut1, '"/>',
      '<stop offset="0.4" stop-color="', T.nut2, '"/>',
      '<stop offset="1" stop-color="', T.nut3, '"/>',
      "</linearGradient>",
      '<linearGradient id="', id, '-fret" x1="0" y1="0" x2="1" y2="0">',
      '<stop offset="0" stop-color="', T.fretLo, '"/>',
      '<stop offset="0.16" stop-color="', T.fretHi, '"/>',
      '<stop offset="0.42" stop-color="', T.fretMid, '"/>',
      '<stop offset="0.72" stop-color="', T.fretLo, '"/>',
      '<stop offset="1" stop-color="#4a4840"/>',
      "</linearGradient>",
      '<radialGradient id="', id, '-pearl" cx="38%" cy="32%" r="70%">',
      '<stop offset="0" stop-color="#fff" stop-opacity="0.55"/>',
      '<stop offset="0.35" stop-color="', T.pearl1, '"/>',
      '<stop offset="1" stop-color="', T.pearl2, '"/>',
      "</radialGradient>",
      /* Grain is meant to be visible (polished mockup), not a flat wash. */
      '<filter id="', id, '-grain" x="0%" y="0%" width="100%" height="100%">',
      '<feTurbulence type="fractalNoise" baseFrequency="0.035 0.14" numOctaves="3" seed="11" result="n"/>',
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.42 0" result="a"/>',
      '<feBlend in="SourceGraphic" in2="a" mode="multiply"/>',
      "</filter>",
      '<pattern id="', id, '-streak" patternUnits="userSpaceOnUse" width="240" height="200">',
      grainStreaks(),
      "</pattern>",
      '<pattern id="', id, '-wound" patternUnits="userSpaceOnUse" width="2.4" height="6" patternTransform="rotate(22)">',
      '<rect width="2.4" height="6" fill="', T.stringWound, '"/>',
      '<line x1="0" y1="0" x2="0" y2="6" stroke="', T.woundDark, '" stroke-width="1.05" stroke-opacity="0.7"/>',
      '<line x1="1.2" y1="0" x2="1.2" y2="6" stroke="#fff" stroke-width="0.45" stroke-opacity="0.28"/>',
      "</pattern>",
      "</defs>"
    ].join("");
  }

  function grainStreaks() {
    var s = [], j, y = 1.5, sw, op, y2, y3, col, light, gap, wob;
    for (j = 0; j < 38; j++) {
      gap = 3.6 + ((j * 53) % 11) * 0.28;
      y += gap;
      light = (j % 5 === 2);
      sw = (j % 6 === 0) ? 1.45 : (0.5 + ((j * 17) % 6) * 0.1);
      op = light ? 0.15 : ((j % 6 === 0) ? 0.4 : 0.2);
      col = light ? "#8a5e3a" : "#0a0604";
      wob = 2.4 + (j % 5) * 0.7;
      y2 = y + (j % 2 ? wob : -wob * 0.7);
      y3 = y + (j % 2 ? -wob * 0.5 : wob * 0.85);
      s.push('<path fill="none" stroke="', col, '" stroke-width="', sw.toFixed(2),
        '" stroke-opacity="', op, '" stroke-linecap="round" d="M-40 ', y.toFixed(1),
        " C 40 ", y2.toFixed(1), ", 110 ", y3.toFixed(1),
        ", 180 ", (y + 0.5).toFixed(1),
        " S 260 ", y2.toFixed(1), ", 330 ", y.toFixed(1), '"/>');
    }
    return s.join("");
  }

  function paint(el, opts) {
    injectCSS();
    var outer = neckHost(el) || el;
    if (!outer || !outer.querySelector) return null;
    opts = opts || {};
    stripStraySkins(outer);

    var rows = outer.querySelectorAll(".string-row");
    if (!rows.length) return null;

    var box = outer.getBoundingClientRect();
    var cs = (typeof getComputedStyle === "function") ? getComputedStyle(outer) : null;
    var borderL = cs ? (parseFloat(cs.borderLeftWidth) || 0) : 0;
    var borderT = cs ? (parseFloat(cs.borderTopWidth) || 0) : 0;
    /* SVG sits on the padding edge; all coords are CSS pixels in that box. No viewBox scaling. */
    var W = Math.max(1, Math.round(outer.clientWidth || (box.width - 2 * borderL)));
    var H = Math.max(1, Math.round(outer.clientHeight || (box.height - 2 * borderT)));
    if (W < 40 || H < 20) return null;
    var k = (outer.offsetWidth > 0) ? (box.width / outer.offsetWidth) : 1;
    if (!(k > 0.05) || Math.abs(k - 1) < 0.002) k = 1;
    var origin = { left: box.left + borderL * k, top: box.top + borderT * k, width: W, height: H, k: k };

    var names = [], i;
    for (i = 0; i < rows.length; i++) {
      var nm = rows[i].querySelector(".string-name");
      names.push(nm ? (nm.textContent || "").trim() : "");
    }
    var nStr = rows.length;
    var isBass = (opts.isBass != null) ? !!opts.isBass : inferBass(outer, nStr, names);
    var gau = gauges(nStr, isBass);
    var nums = numberList(outer);
    var firstRowCells = rows[0].querySelectorAll(".fret-cell");
    if (!firstRowCells.length) return null;

    var nameRight = 0;
    var nameEls = outer.querySelectorAll(".string-name");
    for (i = 0; i < nameEls.length; i++) {
      var nr = relRect(nameEls[i], origin);
      if (nr.r > nameRight) nameRight = nr.r;
    }

    var cols = [], covered = {}, c, s;
    for (c = 0; c < firstRowCells.length; c++) {
      var cell = firstRowCells[c];
      var rr = relRect(cell, origin);
      var fret = fretOfCell(cell, nums);
      var has = false;
      for (s = 0; s < rows.length; s++) {
        var cells = rows[s].querySelectorAll(".fret-cell");
        if (cells[c] && cellHasNote(cells[c])) has = true;
      }
      cols.push({
        fret: fret,
        x: rr.x, r: rr.r, cx: rr.cx, w: rr.w,
        open: cell.classList.contains("open-cell") || fret === 0
      });
      if (has) covered[fret] = true;
    }
    if (outer.querySelectorAll(".dot.on-nut").length) covered[0] = true;

    var nutEl = outer.querySelector(".nut");
    var nut = nutEl ? relRect(nutEl, origin) : null;
    var lastRow = relRect(rows[nStr - 1], origin);
    var firstRow = relRect(rows[0], origin);
    var playCols = cols.filter(function (col) { return !col.open; });
    if (!playCols.length) playCols = cols;

    /* Board starts at the nut, or at the first playing cell — never under the names. */
    var boardL = nut ? nut.x : playCols[0].x;
    if (nameRight > 0) boardL = Math.max(boardL, nameRight + 6);
    var boardR = Math.min(W - 2, playCols[playCols.length - 1].r + 2);
    var boardT = Math.max(1, firstRow.y - 4);
    var boardB = Math.min(H - 1, lastRow.b + 4);
    if (boardR <= boardL + 8) return null;

    var id = outer.getAttribute("data-rw-id") || uid();
    outer.setAttribute("data-rw-id", id);
    outer.classList.add("rw-skinned");

    var T = THEME;
    var parts = [];
    /* width/height attributes + matching viewBox + explicit CSS px = 1:1 with cell rects. */
    parts.push('<svg class="rw-svg" viewBox="0 0 ', W, " ", H,
      '" width="', W, '" height="', H,
      '" style="width:', W, "px;height:", H, 'px;left:0;top:0;"',
      ' preserveAspectRatio="none" xmlns="', NS, '" aria-hidden="true">');
    parts.push(defs(id));

    var bx = boardL, by = boardT, bw = boardR - boardL, bh = boardB - boardT;
    parts.push('<rect x="', (bx - 2.2).toFixed(1), '" y="', (by - 2.2).toFixed(1),
      '" width="', (bw + 4.4).toFixed(1), '" height="', (bh + 4.4).toFixed(1),
      '" rx="4.5" fill="', T.bindDark, '"/>');
    parts.push('<rect x="', (bx - 1.3).toFixed(1), '" y="', (by - 1.3).toFixed(1),
      '" width="', (bw + 2.6).toFixed(1), '" height="', (bh + 2.6).toFixed(1),
      '" rx="4" fill="', T.bind, '"/>');
    parts.push('<rect x="', bx.toFixed(1), '" y="', by.toFixed(1), '" width="', bw.toFixed(1),
      '" height="', bh.toFixed(1), '" rx="3" fill="url(#', id, '-board)"/>');
    parts.push('<rect x="', bx.toFixed(1), '" y="', by.toFixed(1), '" width="', bw.toFixed(1),
      '" height="', bh.toFixed(1), '" rx="3" fill="url(#', id, '-streak)" opacity="1"/>');
    parts.push('<rect x="', bx.toFixed(1), '" y="', by.toFixed(1), '" width="', bw.toFixed(1),
      '" height="', bh.toFixed(1), '" rx="3" filter="url(#', id, '-grain)" fill="url(#', id, '-board)" opacity="0.4"/>');
    parts.push('<rect x="', bx.toFixed(1), '" y="', by.toFixed(1), '" width="', bw.toFixed(1),
      '" height="', bh.toFixed(1), '" rx="3" fill="url(#', id, '-rad)"/>');

    var ys = [];
    for (s = 0; s < nStr; s++) ys.push(relRect(rows[s], origin).cy);

    /* Face inlays: centre of the visible fret cell only. Never under the string-name column.
       Covered = faded pearl only — no dark ring (that read as an extra note). */
    function pearl(cx, cy, r, faded) {
      var op = faded ? 0.16 : 1;
      parts.push('<g opacity="', op, '">');
      if (faded) {
        parts.push('<circle cx="', cx.toFixed(1), '" cy="', cy.toFixed(1), '" r="', (r * 0.9).toFixed(1),
          '" fill="url(#', id, '-pearl)" stroke="none"/>');
      } else {
        parts.push('<circle cx="', cx.toFixed(1), '" cy="', cy.toFixed(1), '" r="', r.toFixed(1),
          '" fill="url(#', id, '-pearl)" stroke="', T.pearlStroke, '" stroke-width="0.55"/>');
        parts.push('<circle cx="', (cx - r * 0.28).toFixed(1), '" cy="', (cy - r * 0.32).toFixed(1),
          '" r="', (r * 0.28).toFixed(1), '" fill="#fff" fill-opacity="0.32"/>');
      }
      parts.push("</g>");
    }

    playCols.forEach(function (col) {
      var f = col.fret;
      if (INLAY_FRETS.indexOf(f) < 0) return;
      if (col.cx < nameRight + 8) return; /* would sit under / in the name column */
      if (col.cx < boardL + 4) return;
      var cx = col.cx;
      var faded = !!covered[f];
      var rMain = Math.max(3.2, Math.min(6.2, col.w * 0.16));
      if (DOUBLE_INLAY[f] && nStr >= 2) {
        pearl(cx, mid(ys[0], ys[Math.min(1, nStr - 1)]), rMain, faded);
        pearl(cx, mid(ys[nStr - 2], ys[nStr - 1]), rMain, faded);
      } else {
        var a = Math.floor((nStr - 1) / 2);
        var b = Math.min(nStr - 1, a + (nStr >= 2 ? 1 : 0));
        pearl(cx, mid(ys[a], ys[b]), rMain * 0.92, faded);
      }
    });

    /* Fret wires at the right edge of each playing cell (where the lab's ::after lived). */
    playCols.forEach(function (col) {
      if (col.open) return;
      var x = col.r;
      parts.push('<line x1="', (x + 1.15).toFixed(1), '" y1="', by.toFixed(1),
        '" x2="', (x + 1.15).toFixed(1), '" y2="', (by + bh).toFixed(1),
        '" stroke="#000" stroke-opacity="0.55" stroke-width="2.6"/>');
      parts.push('<line x1="', x.toFixed(1), '" y1="', by.toFixed(1),
        '" x2="', x.toFixed(1), '" y2="', (by + bh).toFixed(1),
        '" stroke="url(#', id, '-fret)" stroke-width="2.8"/>');
      parts.push('<line x1="', (x - 0.85).toFixed(1), '" y1="', by.toFixed(1),
        '" x2="', (x - 0.85).toFixed(1), '" y2="', (by + bh).toFixed(1),
        '" stroke="#fff" stroke-opacity="0.78" stroke-width="0.8"/>');
    });

    if (nut && nut.w > 0 && nut.r > nameRight - 2) {
      var nx = Math.max(nameRight + 2, nut.x), ny = Math.min(nut.y, by - 1);
      var nw = Math.max(nut.w, 9), nh = Math.max(nut.h, bh + 2);
      if (nw < 10) { nx = nx - (10 - nw) * 0.35; nw = 10; }
      parts.push('<rect x="', nx.toFixed(1), '" y="', ny.toFixed(1), '" width="', nw.toFixed(1),
        '" height="', nh.toFixed(1), '" rx="1.5" fill="url(#', id, '-nut)" stroke="#8a7848" stroke-width="0.5"/>');
      parts.push('<line x1="', (nx + 2).toFixed(1), '" y1="', ny.toFixed(1),
        '" x2="', (nx + 2).toFixed(1), '" y2="', (ny + nh).toFixed(1),
        '" stroke="#fff" stroke-opacity="0.5" stroke-width="1"/>');
      for (s = 0; s < nStr; s++) {
        var yslot = ys[s];
        var sl = Math.max(1.2, (gau[s][0] || 2) * 0.7);
        parts.push('<rect x="', (nx + nw - 5).toFixed(1), '" y="', (yslot - sl / 2).toFixed(1),
          '" width="5" height="', sl.toFixed(1), '" rx="0.35" fill="#2a1c10" fill-opacity="0.7"/>');
      }
    }

    var strX0 = (nut && nut.r > nameRight) ? Math.max(boardL, nut.x + Math.max(nut.w, 8)) : boardL + 1;
    var strX1 = boardR - 1;
    for (s = 0; s < nStr; s++) {
      var y = ys[s];
      var g = gau[s][0], wound = gau[s][1];
      var rowH = relRect(rows[s], origin).h;
      /* Don't shrink below the designed gauge unless the row is truly tighter than the string. */
      g = Math.min(g, Math.max(g * 0.85, rowH * 0.42));
      parts.push('<line x1="', strX0.toFixed(1), '" y1="', (y + 1.35).toFixed(1),
        '" x2="', strX1.toFixed(1), '" y2="', (y + 1.35).toFixed(1),
        '" stroke="#000" stroke-opacity="0.38" stroke-width="', (g + 0.8).toFixed(2), '"/>');
      if (wound) {
        parts.push('<line x1="', strX0.toFixed(1), '" y1="', y.toFixed(1),
          '" x2="', strX1.toFixed(1), '" y2="', y.toFixed(1),
          '" stroke="url(#', id, '-wound)" stroke-width="', g.toFixed(2), '"/>');
        parts.push('<line x1="', strX0.toFixed(1), '" y1="', (y - g * 0.3).toFixed(1),
          '" x2="', strX1.toFixed(1), '" y2="', (y - g * 0.3).toFixed(1),
          '" stroke="#fff" stroke-opacity="0.28" stroke-width="', Math.max(0.35, g * 0.18).toFixed(2), '"/>');
      } else {
        parts.push('<line x1="', strX0.toFixed(1), '" y1="', y.toFixed(1),
          '" x2="', strX1.toFixed(1), '" y2="', y.toFixed(1),
          '" stroke="', T.stringPlain, '" stroke-width="', g.toFixed(2), '"/>');
        parts.push('<line x1="', strX0.toFixed(1), '" y1="', (y - g * 0.32).toFixed(1),
          '" x2="', strX1.toFixed(1), '" y2="', (y - g * 0.32).toFixed(1),
          '" stroke="#fff" stroke-opacity="0.55" stroke-width="', Math.max(0.35, g * 0.3).toFixed(2), '"/>');
      }
    }

    var sideY = boardB + 6;
    if (sideY + 3 < H) {
      playCols.forEach(function (col) {
        var f = col.fret;
        if (INLAY_FRETS.indexOf(f) < 0) return;
        if (col.cx < boardL + 4) return;
        if (DOUBLE_INLAY[f]) {
          parts.push('<circle cx="', (col.cx - 4).toFixed(1), '" cy="', sideY.toFixed(1), '" r="2" fill="', T.side, '"/>');
          parts.push('<circle cx="', (col.cx + 4).toFixed(1), '" cy="', sideY.toFixed(1), '" r="2" fill="', T.side, '"/>');
        } else {
          parts.push('<circle cx="', col.cx.toFixed(1), '" cy="', sideY.toFixed(1), '" r="2" fill="', T.side, '"/>');
        }
      });
    }

    parts.push("</svg>");

    var prev = outer.querySelector(":scope > svg.rw-svg");
    var wrap = document.createElement("div");
    wrap.innerHTML = parts.join("");
    var svg = wrap.firstChild;
    if (prev) outer.replaceChild(svg, prev);
    else outer.insertBefore(svg, outer.firstChild);
    outer.__rwSig = geometrySig(outer);
    return outer;
  }

  var timers = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function geometrySig(outer) {
    var r = outer.getBoundingClientRect();
    var row0 = outer.querySelector(".string-row");
    var n = row0 ? row0.querySelectorAll(".fret-cell").length : 0;
    var rows = outer.querySelectorAll(".string-row").length;
    return rows + "x" + n + ":" + Math.round(r.width) + "x" + Math.round(r.height);
  }

  function applyCoverage(outer) {
    /* Coverage-only updates used to toggle a ring; rings are gone, so just fade pearls. */
    return false;
  }

  function schedule(outer, opts) {
    if (!outer) return;
    if (!timers) { paint(outer, opts); return; }
    var t = timers.get(outer);
    if (t) clearTimeout(t);
    timers.set(outer, setTimeout(function () {
      timers.delete(outer);
      paint(outer, opts);
    }, 32));
  }

  function attach(el, opts) {
    if (typeof el === "string") el = document.querySelector(el);
    if (!el) return null;
    var outer = neckHost(el) || el;
    injectCSS();
    paint(outer, opts);
    if (!outer.__rwObs) {
      try {
        outer.__rwObs = new ResizeObserver(function () { schedule(outer, opts); });
        outer.__rwObs.observe(outer);
      } catch (e) {}
    }
    if (!outer.__rwOrient) {
      outer.__rwOrient = 1;
      window.addEventListener("orientationchange", function () { schedule(outer, opts); });
      window.addEventListener("resize", function () { schedule(outer, opts); });
    }
    return outer;
  }

  function refresh(el, opts) {
    if (typeof el === "string") el = document.querySelector(el);
    if (!el) return;
    var outer = neckHost(el) || el;
    paint(outer, opts || {});
  }

  var STD = {
    guitar6: { opens: [64, 59, 55, 50, 45, 40], names: ["e", "B", "G", "D", "A", "E"] },
    guitar7: { opens: [64, 59, 55, 50, 45, 40, 35], names: ["e", "B", "G", "D", "A", "E", "B"] },
    guitar8: { opens: [64, 59, 55, 50, 45, 40, 35, 30], names: ["e", "B", "G", "D", "A", "E", "B", "F♯"] },
    bass4: { opens: [55, 50, 45, 40], names: ["G", "D", "A", "E"] },
    bass5: { opens: [55, 50, 45, 40, 35], names: ["G", "D", "A", "E", "B"] },
    bass6: { opens: [48, 43, 38, 33, 28, 23], names: ["C", "G", "D", "A", "E", "B"] }
  };

  function preset(inst, n) {
    inst = inst === "bass" ? "bass" : "guitar";
    n = +n;
    if (inst === "bass") {
      if (n === 6) return STD.bass6;
      if (n === 5) return STD.bass5;
      return STD.bass4;
    }
    if (n === 8) return STD.guitar8;
    if (n === 7) return STD.guitar7;
    return STD.guitar6;
  }

  function sharedInstrument() {
    var inst = "guitar", n = 6;
    try {
      if (typeof instrument !== "undefined" && instrument === "bass") inst = "bass";
      if (typeof window !== "undefined" && window.instrument === "bass") inst = "bass";
      if (typeof stringOpt === "number") n = stringOpt;
      var st = (root.GLShared && root.GLShared.load) ? root.GLShared.load() : null;
      if (st) {
        if (st.instrument === "bass" || st.instrument === "guitar") inst = st.instrument;
        if (st.strings) n = +st.strings;
      }
      var sel = document.getElementById("strSel") || document.getElementById("strSelect") || document.getElementById("gls-str") || document.getElementById("gls-strings");
      if (sel && sel.value) n = +sel.value || n;
      var isel = document.getElementById("instSel") || document.getElementById("instSelect") || document.getElementById("gls-inst");
      if (isel && isel.value) inst = isel.value === "bass" ? "bass" : "guitar";
      var q = new URLSearchParams(location.search);
      var qi = q.get("inst") || q.get("instrument");
      var qs = q.get("strings");
      if (typeof hopInst === "string" && hopInst) qi = hopInst;
      if (typeof hopStrings === "string" && hopStrings) qs = hopStrings;
      if (qi === "bass" || qi === "guitar") inst = qi;
      if (qs) n = +qs || n;
    } catch (e) {}
    if (inst === "bass") n = (n === 5 || n === 6) ? n : 4;
    else n = (n === 7 || n === 8) ? n : 6;
    var p = preset(inst, n);
    return { inst: inst, n: n, opens: p.opens.slice(), names: p.names.slice(), isBass: inst === "bass" };
  }

  function autoAttach() {
    /* Only .neck-outer — never #fretboard (that painted a second, offset SVG). */
    var nodes = document.querySelectorAll(".neck-outer");
    for (var i = 0; i < nodes.length; i++) {
      var outer = nodes[i];
      if (!(outer.querySelector && outer.querySelector(".string-row"))) continue;
      try {
        var want = sharedInstrument();
        var have = outer.querySelectorAll(".string-row").length;
        if (want && have && want.n !== have && typeof root.glParityChanged === "function" && !outer.__rwRetry) {
          outer.__rwRetry = 1;
          root.glParityChanged("strings", (root.GLShared && root.GLShared.load) ? root.GLShared.load() : {});
          continue;
        }
        attach(outer, { isBass: !!(want && want.isBass) });
      } catch (e) {}
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(autoAttach, 0); });
  } else {
    setTimeout(autoAttach, 0);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("load", function () { setTimeout(autoAttach, 60); });
  }

  root.RosewoodNeck = {
    attach: attach,
    refresh: refresh,
    paint: paint,
    preset: preset,
    sharedInstrument: sharedInstrument,
    gauges: gauges
  };
})(typeof window !== "undefined" ? window : this);
