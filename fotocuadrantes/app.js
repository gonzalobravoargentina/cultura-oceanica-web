/* Fotocuadrantes — conteo de piedras y cobertura (roca / arena) en fotocuadrantes.
 * Las fotos se leen del disco (URL.createObjectURL): nunca se suben.
 * Datos por nombre de foto en localStorage: puntos, % roca, % arena, analizada.
 * "Descargar datos" arma un .xlsx (Conteos, Densidad, Cobertura, Puntos) sin librerías.
 */
(function () {
  'use strict';

  var LS_CATS = 'fq.categories.v1', LS_DATA = 'fq.data.v1', LS_WHO = 'fq.annotator', LS_AREA = 'fq.area';
  var KEYS = '123456789qwertyuiopasdfghjklzxcvbnm'.split('');
  var PALETTE = ['#00c9d4', '#f4a261', '#c77dff', '#8ecae6', '#b5e48c', '#ff8fab', '#90be6d', '#4cc9f0', '#f9844a', '#a0c4ff', '#06d6a0', '#ffb703'];
  // same stones and colours as Video Transecta (yellow ring for black stones: a black one would vanish on dark rock)
  var DEFAULT_CATS = [
    { name: 'Blanca chica', color: '#ffffff' },
    { name: 'Blanca grande', color: '#00c9d4' },
    { name: 'Roja', color: '#ff4d4d' },
    { name: 'Negra', color: '#ffd166' }
  ];
  var cats = load(LS_CATS, null);
  var data = load(LS_DATA, {});      // photo name → {pts: [{id, cat, x, y, who, created}], roca, arena, done, w, h}
  var photos = [];                   // [{name, url}] this session, sorted by name
  var idx = -1, selId = null, activeCat = null;
  if (!cats || !cats.length) cats = DEFAULT_CATS.map(function (d) { return { id: uid(), name: d.name, color: d.color }; });

  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* full / private: download still works */ } }
  function save() { store(LS_CATS, cats); store(LS_DATA, data); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function catById(id) { for (var i = 0; i < cats.length; i++) if (cats[i].id === id) return cats[i]; return null; }
  function area() { var a = parseFloat($('area').value); return a > 0 ? a : 0.0625; }
  function cur() { return idx >= 0 ? photos[idx] : null; }
  function rec(name) { return data[name] || (data[name] = { pts: [], roca: null, arena: null, done: false }); }
  function curRec() { var p = cur(); return p ? rec(p.name) : null; }
  function nfmt(x, d) { return (+x).toFixed(d).replace('.', ','); }
  var img = $('photo'), stage = $('stage');

  var flashT;
  function flash(txt, color) {
    var f = $('flash'); f.textContent = txt; f.style.background = color || '#00c9d4';
    f.classList.add('on'); clearTimeout(flashT); flashT = setTimeout(function () { f.classList.remove('on'); }, 1000);
  }

  // ── Photos ─────────────────────────────────────────────────────────
  function addFiles(files) {
    var added = 0;
    Array.prototype.forEach.call(files, function (f) {
      if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|gif|bmp|tiff?|heic)$/i.test(f.name)) return;
      var ex = photos.filter(function (p) { return p.name === f.name; })[0];
      if (ex) { URL.revokeObjectURL(ex.url); ex.url = URL.createObjectURL(f); return; }
      photos.push({ name: f.name, url: URL.createObjectURL(f) }); added++;
    });
    photos.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
    if (added) flash(added + ' foto(s) cargadas', '#52c98a');
    if (idx < 0 && photos.length) {                 // start at the first photo not analysed yet
      var k = photos.findIndex(function (p) { return !(data[p.name] && data[p.name].done); });
      show(k >= 0 ? k : 0);
    } else renderAll();
  }
  function show(i) {
    if (!photos.length) return;
    idx = Math.max(0, Math.min(photos.length - 1, i)); selId = null;
    stage.classList.add('has-photo'); $('zoombox').hidden = false;
    img.onload = function () { var r = curRec(); r.w = img.naturalWidth; r.h = img.naturalHeight; fit(); renderAll(); };
    img.onerror = function () { flash('No se puede mostrar ' + cur().name + ' (¿formato HEIC/TIFF? convertila a JPG)', '#f07070'); };
    img.src = cur().url;
    renderAll();
  }

  // ── Zoom / pan (transform on the <img>; points are drawn on top) ───
  var view = { s: 1, tx: 0, ty: 0, fit: 1 };
  function applyView() { img.style.transform = 'translate(' + view.tx + 'px,' + view.ty + 'px) scale(' + view.s + ')'; renderPoints(); renderMeasures(); }
  function fit() {
    var W = stage.clientWidth, H = stage.clientHeight, iw = img.naturalWidth, ih = img.naturalHeight; if (!iw) return;
    view.fit = view.s = Math.min(W / iw, H / ih);
    view.tx = (W - iw * view.s) / 2; view.ty = (H - ih * view.s) / 2; applyView();
  }
  function zoomAt(f, cx, cy) {
    var s = Math.max(view.fit, Math.min(view.fit * 25, view.s * f));
    view.tx = cx - (cx - view.tx) * s / view.s; view.ty = cy - (cy - view.ty) * s / view.s; view.s = s;
    if (s === view.fit) fit(); else applyView();
  }
  function stagePt(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  stage.addEventListener('wheel', function (e) {
    if (!cur()) return; e.preventDefault();
    var p = stagePt(e); zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x, p.y);
  }, { passive: false });
  // a press that moves more than a few pixels pans; a still press is a click (adds a point)
  var drag = null;
  stage.addEventListener('pointerdown', function (e) {
    if (!cur() || e.button !== 0 || e.target.closest('.zoombox, .pt')) return;
    drag = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; stage.classList.add('panning'); }
    if (drag.moved) { view.tx = drag.tx + dx; view.ty = drag.ty + dy; applyView(); }
  });
  stage.addEventListener('pointerup', function (e) {
    if (!drag) return;
    var moved = drag.moved; drag = null; stage.classList.remove('panning');
    if (moved || (!activeCat && !measure)) return;
    var p = stagePt(e), x = (p.x - view.tx) / view.s / img.naturalWidth, y = (p.y - view.ty) / view.s / img.naturalHeight;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    if (measure) { measureClick(x, y); return; }
    addPoint(activeCat, x, y);
  });
  window.addEventListener('resize', function () { if (cur()) fit(); });

  // ── Points ─────────────────────────────────────────────────────────
  function addPoint(cat, x, y) {
    var r = curRec();
    if (!r.w && img.naturalWidth) { r.w = img.naturalWidth; r.h = img.naturalHeight; }   // e.g. after "Borrar anotaciones"
    var pt = { id: uid(), cat: cat.id, x: +x.toFixed(5), y: +y.toFixed(5), who: $('annotator').value.trim(), created: new Date().toISOString() };
    r.pts.push(pt); selId = pt.id; save();
    flash(cat.name + ' · ' + r.pts.filter(function (q) { return q.cat === cat.id; }).length, cat.color);
    renderAll();
  }
  function removePt(id) { var r = curRec(); if (!r) return; r.pts = r.pts.filter(function (q) { return q.id !== id; }); if (selId === id) selId = null; save(); renderAll(); }
  function undoLast() {
    var r = curRec(); if (!r || !r.pts.length) return;
    removePt(r.pts.reduce(function (p, q) { return q.created > p.created ? q : p; }).id); flash('Deshecho', '#92b8cc');
  }
  function renderPoints() {
    var box = $('pts'), r = curRec();
    box.classList.toggle('marking', !!activeCat);
    if (!r || !img.naturalWidth) { box.innerHTML = ''; return; }
    var iw = img.naturalWidth, ih = img.naturalHeight;
    box.innerHTML = r.pts.map(function (q) {
      var c = catById(q.cat) || { color: '#888', name: '?' };
      return '<div class="pt' + (q.id === selId ? ' sel' : '') + '" data-id="' + q.id + '" style="left:' + (view.tx + q.x * iw * view.s)
        + 'px;top:' + (view.ty + q.y * ih * view.s) + 'px;border-color:' + c.color + '" title="' + esc(c.name) + '"></div>';
    }).join('');
  }
  $('pts').addEventListener('pointerdown', function (e) {
    var d = e.target.closest('.pt'); if (!d) return;
    e.stopPropagation(); selId = d.dataset.id; renderPoints();
  });

  // ── Measuring tool ─────────────────────────────────────────────────
  // Scale (cm per image pixel), per photo:
  //  · default: the photo IS the quadrat opening (crop from the Quadrat
  //    Cropper) → side = √area, cm/px = side_cm / image width;
  //  · "Calibrar": two clicks on something of known length (e.g. the frame side).
  // Each measurement = two clicks; stored in image-relative coordinates.
  var measure = null;                    // null | {mode: 'measure'|'cal', p0: {x,y}|null}
  function sideCm() { return Math.sqrt(area()) * 100; }
  function pxLen(r, a, b) { return Math.hypot((b.x - a.x) * r.w, (b.y - a.y) * r.h); }
  function cmPerPx(r) {
    if (!r || !r.w) return null;
    if (r.cal && r.cal.px > 0) return r.cal.cm / r.cal.px;
    return sideCm() / r.w;
  }
  function setMeasure(on, mode) {
    measure = on ? { mode: mode || 'measure', p0: null } : null;
    if (on && activeCat) setActive(null);
    stage.classList.toggle('measuring', !!measure);
    $('bMeasure').classList.toggle('on', !!measure && measure.mode === 'measure');
    renderMeasures();
  }
  function measureClick(x, y) {
    var r = curRec(); if (!r) return;
    if (!r.w && img.naturalWidth) { r.w = img.naturalWidth; r.h = img.naturalHeight; }
    if (!measure.p0) { measure.p0 = { x: x, y: y }; renderMeasures(); return; }
    var a = measure.p0, b = { x: x, y: y }, px = pxLen(r, a, b);
    if (px < 2) { measure.p0 = null; renderMeasures(); return; }
    if (measure.mode === 'cal') {
      var v = prompt('¿Cuánto mide en la realidad lo que marcaste? (en cm)', (sideCm()).toFixed(1).replace('.', ','));
      var cm = v == null ? NaN : parseFloat(String(v).replace(',', '.'));
      if (cm > 0) { r.cal = { px: +px.toFixed(2), cm: cm, x1: a.x, y1: a.y, x2: b.x, y2: b.y }; save(); flash('Escala calibrada: ' + nfmt(cm / px * 10, 3) + ' mm/px', '#ff8fab'); }
      setMeasure(true, 'measure'); renderAll(); return;
    }
    r.meas = r.meas || [];
    var m = { id: uid(), x1: +a.x.toFixed(5), y1: +a.y.toFixed(5), x2: +b.x.toFixed(5), y2: +b.y.toFixed(5), created: new Date().toISOString() };
    r.meas.push(m); selMeas = m.id; save();
    var k = cmPerPx(r); flash('📏 ' + nfmt(px * k, 1) + ' cm', '#ffe14d');
    measure.p0 = null; renderMeasures();
  }
  var selMeas = null;
  function renderMeasures() {
    var svg = $('meas'), r = curRec(), k = cmPerPx(r);
    // scale info + list
    if (!r || !r.w) { $('scaleInfo').innerHTML = 'Abrí una foto para medir.'; $('mlist').innerHTML = ''; svg.innerHTML = ''; return; }
    $('scaleInfo').innerHTML = (r.cal ? 'Escala calibrada: <b>' + nfmt(r.cal.cm, 1) + ' cm</b> = ' + Math.round(r.cal.px) + ' px'
        : 'Escala: la foto es el cuadrante de <b>' + nfmt(sideCm(), 1) + ' cm</b> de lado')
      + ' → <b>' + nfmt(k * 10, 3) + ' mm/px</b>. '
      + '<button class="btn sm" type="button" id="bCal">' + (measure && measure.mode === 'cal' ? 'Marcá los 2 extremos…' : 'Calibrar') + '</button>'
      + (r.cal ? ' <button class="btn sm" type="button" id="bCalOff" title="Volver a usar el lado del cuadrante">Quitar calibración</button>' : '');
    $('bCal').onclick = function () { setMeasure(!(measure && measure.mode === 'cal'), 'cal'); if (!measure) setMeasure(false); };
    if ($('bCalOff')) $('bCalOff').onclick = function () { delete r.cal; save(); renderAll(); };
    var ms = r.meas || [];
    $('mlist').innerHTML = ms.length ? ms.map(function (m, i) {
      return '<tr data-id="' + m.id + '"' + (m.id === selMeas ? ' style="background:rgba(255,225,77,.12)"' : '') + '><td>' + (i + 1) + '</td><td class="num"><b>' + nfmt(pxLen(r, { x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }) * k, 1) + ' cm</b></td>'
        + '<td><button class="x" data-del="' + m.id + '" title="Borrar medida">✕</button></td></tr>';
    }).join('') : '<tr><td class="empty">Sin medidas. Tocá 📏 Medir.</td></tr>';
    // drawing (screen coordinates follow zoom / pan)
    var iw = img.naturalWidth, ih = img.naturalHeight; if (!iw) { svg.innerHTML = ''; return; }
    var X = function (x) { return view.tx + x * iw * view.s; }, Y = function (y) { return view.ty + y * ih * view.s; };
    var seg = function (x1, y1, x2, y2, cls, label) {
      return '<line class="halo" x1="' + X(x1) + '" y1="' + Y(y1) + '" x2="' + X(x2) + '" y2="' + Y(y2) + '"/>'
        + '<line class="' + cls + '" x1="' + X(x1) + '" y1="' + Y(y1) + '" x2="' + X(x2) + '" y2="' + Y(y2) + '"/>'
        + '<circle cx="' + X(x1) + '" cy="' + Y(y1) + '" r="3.5"/><circle cx="' + X(x2) + '" cy="' + Y(y2) + '" r="3.5"/>'
        + (label ? '<text x="' + ((X(x1) + X(x2)) / 2 + 8) + '" y="' + ((Y(y1) + Y(y2)) / 2 - 8) + '">' + label + '</text>' : '');
    };
    var h = ms.map(function (m) { return seg(m.x1, m.y1, m.x2, m.y2, m.id === selMeas ? 'sel' : '', nfmt(pxLen(r, { x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }) * k, 1) + ' cm'); }).join('');
    if (r.cal && r.cal.x1 != null && measure && measure.mode === 'cal') h += seg(r.cal.x1, r.cal.y1, r.cal.x2, r.cal.y2, 'cal', nfmt(r.cal.cm, 1) + ' cm (calibración)');
    if (measure && measure.p0) h += '<circle cx="' + X(measure.p0.x) + '" cy="' + Y(measure.p0.y) + '" r="5" style="fill:' + (measure.mode === 'cal' ? '#ff8fab' : '#ffe14d') + '"/>';
    svg.innerHTML = h;
  }
  $('mlist').addEventListener('click', function (e) {
    var r = curRec(); if (!r) return;
    var d = e.target.closest('[data-del]');
    if (d) { r.meas = (r.meas || []).filter(function (m) { return m.id !== d.dataset.del; }); save(); renderMeasures(); renderList(); return; }
    var tr = e.target.closest('tr[data-id]'); if (tr) { selMeas = tr.dataset.id; renderMeasures(); }
  });
  $('bMeasure').onclick = function () { this.blur(); setMeasure(!(measure && measure.mode === 'measure')); };

  // ── Categories ─────────────────────────────────────────────────────
  function addCat(name) {
    name = String(name || '').trim(); if (!name) return null;
    var ex = cats.filter(function (c) { return c.name.toLowerCase() === name.toLowerCase(); })[0];
    if (ex) return ex;
    var used = cats.map(function (c) { return c.color; });
    var c = { id: uid(), name: name, color: PALETTE.filter(function (p) { return used.indexOf(p) < 0; })[0] || PALETTE[cats.length % PALETTE.length] };
    cats.push(c); save(); return c;
  }
  function setActive(c, toggle) { if (measure && c) { measure = null; stage.classList.remove('measuring'); $('bMeasure').classList.remove('on'); }
    activeCat = (toggle && activeCat === c) ? null : c; stage.classList.toggle('armed', !!activeCat); renderCats(); renderPoints(); }
  $('catForm').addEventListener('submit', function (e) {
    e.preventDefault(); var c = addCat($('catName').value); $('catName').value = ''; $('catName').blur(); if (c) renderAll();
  });
  function renderCats() {
    var r = curRec(), tot = {}; if (r) r.pts.forEach(function (q) { tot[q.cat] = (tot[q.cat] || 0) + 1; });
    $('cats').innerHTML = cats.length ? cats.map(function (c, i) {
      return '<div class="cat' + (c === activeCat ? ' active' : '') + '" data-id="' + c.id + '">'
        + '<button type="button" class="key" data-act="pick" style="background:' + c.color + '" title="Elegir (tecla ' + esc(KEYS[i] || '') + ')">' + esc((KEYS[i] || '').toUpperCase()) + '</button>'
        + '<button type="button" class="name" data-act="pick" title="Clic: elegir · Doble clic: renombrar">' + esc(c.name) + '</button>'
        + '<span class="n" title="En esta foto">' + (tot[c.id] || '') + '</span>'
        + '<button type="button" class="del" data-act="del" title="Borrar categoría" aria-label="Borrar ' + esc(c.name) + '">✕</button></div>';
    }).join('') : '<p class="empty">No hay categorías. Agregá una arriba.</p>';
  }
  $('cats').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var c = catById(b.closest('.cat').dataset.id); if (!c) return;
    b.blur();
    if (b.dataset.act === 'pick') setActive(c, true);
    else {
      var m = 0; Object.keys(data).forEach(function (k) { m += data[k].pts.filter(function (q) { return q.cat === c.id; }).length; });
      if (m && !confirm('«' + c.name + '» tiene ' + m + ' punto(s) en las fotos. ¿Borrar la categoría y sus puntos?')) return;
      if (activeCat === c) setActive(null);
      cats = cats.filter(function (x) { return x !== c; });
      Object.keys(data).forEach(function (k) { data[k].pts = data[k].pts.filter(function (q) { return q.cat !== c.id; }); });
      save(); renderAll();
    }
  });
  $('cats').addEventListener('dblclick', function (e) {
    var b = e.target.closest('.name'); if (!b) return;
    var c = catById(b.closest('.cat').dataset.id), nn = prompt('Nuevo nombre para la categoría:', c.name);
    if (nn && nn.trim()) { c.name = nn.trim(); save(); renderAll(); }
  });

  // ── Per-photo panels ───────────────────────────────────────────────
  function renderNav() {
    var p = cur(), r = curRec(), n = photos.length;
    $('curIdx').textContent = p ? 'Foto ' + (idx + 1) + ' / ' + n : '—';
    $('fname').textContent = p ? p.name : '';
    $('bPrev').disabled = !p || idx === 0; $('bNext').disabled = !p || idx >= n - 1;
    $('bDone').disabled = !p;
    var done = !!(r && r.done);
    $('bDone').textContent = done ? '✓ Analizada (deshacer)' : '✓ Foto analizada';
    $('bDone').className = 'btn' + (done ? ' ok' : '');
    stage.classList.toggle('done', done);
    $('doneN').textContent = photos.filter(function (q) { return data[q.name] && data[q.name].done; }).length + '/' + n;
  }
  function renderCounts() {
    var r = curRec(), A = area(), tot = 0;
    var rows = '<tr><th>Categoría</th><th>n</th><th>ind/m²</th></tr>' + cats.map(function (c) {
      var n = r ? r.pts.filter(function (q) { return q.cat === c.id; }).length : 0; tot += n;
      return '<tr><td><span class="dot" style="background:' + c.color + '"></span>' + esc(c.name) + '</td><td>' + n + '</td><td>' + nfmt(n / A, 1) + '</td></tr>';
    }).join('');
    $('counts').innerHTML = rows + '<tr class="tot"><td>Total</td><td>' + tot + '</td><td>' + nfmt(tot / A, 1) + '</td></tr>';
  }
  function renderCover() {
    var r = curRec(), on = !!r;
    ['cRoca', 'cArena'].forEach(function (id) { $(id).disabled = !on; });
    var ro = r && r.roca != null ? r.roca : null, ar = r && r.arena != null ? r.arena : null;
    if (document.activeElement !== $('cRoca')) $('cRoca').value = ro == null ? '' : ro;
    if (document.activeElement !== $('cArena')) $('cArena').value = ar == null ? '' : ar;
    var sum = (ro || 0) + (ar || 0);
    $('cOtro').textContent = ro == null && ar == null ? '—' : Math.max(0, 100 - sum) + ' %';
    $('cWarn').textContent = sum > 100 ? 'Roca + arena suman ' + sum + ' %: revisá (no puede pasar de 100).' : '';
  }
  function setCover(field, el) {
    var r = curRec(); if (!r) return;
    var v = el.value.trim() === '' ? null : Math.max(0, Math.min(100, parseFloat(el.value.replace(',', '.'))));
    r[field] = isFinite(v) ? v : null; save(); renderCover(); renderList();
  }
  $('cRoca').addEventListener('input', function () { setCover('roca', this); });
  $('cArena').addEventListener('input', function () { setCover('arena', this); });

  function renderList() {
    $('listHead').innerHTML = '<tr><th>#</th><th>Foto</th><th>Analizada</th>' + cats.map(function (c) {
      return '<th><span class="dot" style="background:' + c.color + '"></span>' + esc(c.name) + '</th>'; }).join('') + '<th>Total</th><th>Roca %</th><th>Arena %</th></tr>';
    $('listCount').textContent = photos.length ? '(' + photos.length + ')' : '';
    if (!photos.length) { $('listBody').innerHTML = '<tr><td colspan="' + (6 + cats.length) + '" class="empty">Todavía no hay fotos cargadas.</td></tr>'; return; }
    $('listBody').innerHTML = photos.map(function (p, i) {
      var r = data[p.name] || { pts: [] }, tot = 0;
      return '<tr data-i="' + i + '"' + (i === idx ? ' class="cur"' : '') + '><td class="num">' + (i + 1) + '</td><td>' + esc(p.name) + '</td><td>' + (r.done ? '<span class="ok">✓</span>' : '') + '</td>'
        + cats.map(function (c) { var n = r.pts.filter(function (q) { return q.cat === c.id; }).length; tot += n; return '<td class="num">' + (n || '') + '</td>'; }).join('')
        + '<td class="num">' + (tot || '') + '</td><td class="num">' + (r.roca != null ? r.roca : '') + '</td><td class="num">' + (r.arena != null ? r.arena : '') + '</td></tr>';
    }).join('');
    var row = $('listBody').querySelector('tr.cur'), w = row && row.closest('.tablewrap');
    if (row && w) { var top = row.offsetTop - 34, bot = row.offsetTop + row.offsetHeight;
      if (top < w.scrollTop) w.scrollTop = top; else if (bot > w.scrollTop + w.clientHeight) w.scrollTop = bot - w.clientHeight; }
  }
  $('listBody').addEventListener('click', function (e) { var tr = e.target.closest('tr[data-i]'); if (tr) show(+tr.dataset.i); });

  function renderAll() { renderNav(); renderCats(); renderCounts(); renderCover(); renderList(); renderPoints(); renderMeasures(); }

  function toggleDone() {
    var r = curRec(); if (!r) return;
    r.done = !r.done; save();
    if (r.done) {
      if (r.roca == null && r.arena == null) flash('Ojo: esta foto no tiene % de roca/arena', '#f4a261');
      if (idx < photos.length - 1) show(idx + 1); else { flash('¡Última foto analizada!', '#52c98a'); renderAll(); }
    } else renderAll();
  }

  // ── Excel (.xlsx) without libraries ────────────────────────────────
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {                              // files: [{name, text}] → Blob
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    var d = new Date(), dosT = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
        dosD = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dosT, true); h.setUint16(12, dosD, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(h.buffer, name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dosT, true); c.setUint16(14, dosD, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true);
      c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
      central.push(c.buffer, name);
      offset += 30 + name.length + data.length;
    });
    var csize = central.reduce(function (s, b) { return s + (b.byteLength || b.length); }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, csize, true); e.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [e.buffer]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function xesc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; })
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function sheetXml(rows, widths) {                 // rows[0] = header (bold, style 1)
    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      + '<cols>' + widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols><sheetData>';
    rows.forEach(function (r, ri) {
      x += '<row r="' + (ri + 1) + '">';
      r.forEach(function (v, ci) {
        var ref = colName(ci) + (ri + 1), st = ri === 0 ? ' s="1"' : '';
        if (v === '' || v == null) return;
        if (typeof v === 'number' && isFinite(v)) x += '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
        else x += '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + xesc(v) + '</t></is></c>';
      });
      x += '</row>';
    });
    return x + '</sheetData></worksheet>';
  }
  function xlsx(sheets) {                            // sheets: [{name, rows, widths}]
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('')
      + '</Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      + sheets.map(function (s, i) { return '<sheet name="' + xesc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>';
    var wbr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('')
      + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
      + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
      + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    var files = [{ name: '[Content_Types].xml', text: ct }, { name: '_rels/.rels', text: rels }, { name: 'xl/workbook.xml', text: wb },
                 { name: 'xl/_rels/workbook.xml.rels', text: wbr }, { name: 'xl/styles.xml', text: styles }];
    sheets.forEach(function (s, i) { files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', text: sheetXml(s.rows, s.widths) }); });
    return zip(files);
  }

  // File name for the download: YYYYMMDD_<annotator>_<type>.xlsx (local date;
  // annotator without accents, spaces or symbols so it is safe on any OS).
  function exportName(who, type) {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    var ymd = '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
    var w = who.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return ymd + '_' + w + '_' + type + '.xlsx';
  }
  // The annotator name is required: it goes into the file name.
  function needAnnotator() {
    var who = $('annotator').value.trim();
    if (!who) { alert('Escribí tu nombre en Anotador/a antes de descargar los datos.'); $('annotator').focus(); }
    return who;
  }

  $('btnExport').addEventListener('click', function () {
    var names = Object.keys(data).filter(function (k) { var r = data[k]; return r.pts.length || r.done || r.roca != null || r.arena != null || (r.meas && r.meas.length); })
      .sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
    if (!names.length) { alert('Todavía no hay datos para descargar.'); return; }
    var who = needAnnotator(); if (!who) return;
    var A = area();
    var head = ['foto', 'analizada'].concat(cats.map(function (c) { return c.name; }), ['total']);
    var conteos = [head], dens = [['foto', 'analizada', 'area_m2'].concat(cats.map(function (c) { return c.name; }), ['total'])];
    var cober = [['foto', 'analizada', 'roca_pct', 'arena_pct', 'otro_pct', 'suma_roca_arena']];
    var medidas = [['foto', 'medida', 'largo_cm', 'largo_px', 'escala_mm_px', 'escala', 'x1_px', 'y1_px', 'x2_px', 'y2_px']];
    var puntos = [['foto', 'categoria', 'x_px', 'y_px', 'x_rel', 'y_rel', 'ancho_px', 'alto_px', 'anotador', 'fecha_anotacion']];
    names.forEach(function (k) {
      var r = data[k], ns = cats.map(function (c) { return r.pts.filter(function (q) { return q.cat === c.id; }).length; });
      var tot = ns.reduce(function (s, n) { return s + n; }, 0), done = r.done ? 'si' : 'no';
      conteos.push([k, done].concat(ns, [tot]));
      dens.push([k, done, A].concat(ns.map(function (n) { return +(n / A).toFixed(2); }), [+(tot / A).toFixed(2)]));
      var ro = r.roca, ar = r.arena, hasC = ro != null || ar != null;
      cober.push([k, done, ro == null ? '' : ro, ar == null ? '' : ar, hasC ? Math.max(0, 100 - (ro || 0) - (ar || 0)) : '', hasC ? (ro || 0) + (ar || 0) : '']);
      var kk = cmPerPx(r);
      (r.meas || []).forEach(function (m, i) {
        var px = pxLen(r, { x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 });
        medidas.push([k, i + 1, +(px * kk).toFixed(2), +px.toFixed(1), +(kk * 10).toFixed(4), r.cal ? 'calibrada (' + r.cal.cm + ' cm)' : 'lado del cuadrante (' + +sideCm().toFixed(2) + ' cm)',
                      Math.round(m.x1 * r.w), Math.round(m.y1 * r.h), Math.round(m.x2 * r.w), Math.round(m.y2 * r.h)]);
      });
      r.pts.forEach(function (q) {
        var c = catById(q.cat);
        puntos.push([k, c ? c.name : '', r.w ? Math.round(q.x * r.w) : '', r.h ? Math.round(q.y * r.h) : '', q.x, q.y, r.w || '', r.h || '',
                     q.who || who, (q.created || '').replace('T', ' ').slice(0, 19)]);
      });
    });
    var catW = cats.map(function () { return 14; });
    var blob = xlsx([
      { name: 'Conteos', rows: conteos, widths: [30, 10].concat(catW, [8]) },
      { name: 'Densidad (ind por m2)', rows: dens, widths: [30, 10, 9].concat(catW, [8]) },
      { name: 'Cobertura (%)', rows: cober, widths: [30, 10, 10, 10, 10, 16] },
      { name: 'Medidas', rows: medidas, widths: [30, 8, 10, 10, 12, 26, 8, 8, 8, 8] },
      { name: 'Puntos', rows: puntos, widths: [30, 16, 8, 8, 9, 9, 10, 10, 16, 20] }
    ]);
    var el = document.createElement('a'); el.href = URL.createObjectURL(blob);
    el.download = exportName(who, 'cuadrante');
    document.body.appendChild(el); el.click(); setTimeout(function () { URL.revokeObjectURL(el.href); el.remove(); }, 1000);
  });

  // ── Reset: wipe every annotation kept in this browser ──────────────
  // Points, rock/sand cover and "analizada" marks of ALL photos. Categories,
  // quadrat area and annotator name stay; the photos loaded now stay open.
  $('btnReset').addEventListener('click', function () {
    this.blur();
    var names = Object.keys(data).filter(function (k) { var r = data[k]; return r.pts.length || r.done || r.roca != null || r.arena != null; });
    var nPts = names.reduce(function (s, k) { return s + data[k].pts.length; }, 0);
    if (!names.length) { flash('No hay anotaciones guardadas', '#92b8cc'); return; }
    if (!confirm('Se van a borrar ' + nPts + ' punto(s) y las coberturas de ' + names.length + ' foto(s), y las marcas de «analizada».\n\n'
      + 'Esto no se puede deshacer. Si los necesitás, tocá primero «⬇ Descargar datos».\n\n¿Borrar todas las anotaciones?')) return;
    data = {}; selId = null; save();
    renderAll(); flash('Anotaciones borradas', '#f07070');
  });

  // ── Wiring ─────────────────────────────────────────────────────────
  $('btnOpen').onclick = $('bMore').onclick = function () { $('fileInput').click(); };
  $('btnOpenDir').onclick = function () { $('dirInput').click(); };
  $('fileInput').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
  $('dirInput').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) { stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.add('dragover'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.remove('dragover'); }); });
  stage.addEventListener('drop', function (e) {
    // folders dropped: walk them (Chrome/Edge/Safari/Firefox support webkitGetAsEntry)
    var items = e.dataTransfer.items, entries = [];
    if (items && items.length && items[0].webkitGetAsEntry) {
      for (var i = 0; i < items.length; i++) { var en = items[i].webkitGetAsEntry(); if (en) entries.push(en); }
      var out = [], pending = 0;
      var done = function () { if (--pending === 0) addFiles(out); };
      var walk = function (en) {
        pending++;
        if (en.isFile) en.file(function (f) { out.push(f); done(); }, done);
        else if (en.isDirectory) {
          var rd = en.createReader(), all = [];
          var next = function () { rd.readEntries(function (b) { if (b.length) { all = all.concat(b); next(); } else { all.forEach(walk); done(); } }, done); };
          next();
        } else done();
      };
      entries.forEach(walk);
    } else addFiles(e.dataTransfer.files);
  });
  $('bPrev').onclick = function () { this.blur(); show(idx - 1); };
  $('bNext').onclick = function () { this.blur(); show(idx + 1); };
  $('bDone').onclick = function () { this.blur(); toggleDone(); };
  $('zIn').onclick = function () { zoomAt(1.4, stage.clientWidth / 2, stage.clientHeight / 2); };
  $('zOut').onclick = function () { zoomAt(1 / 1.4, stage.clientWidth / 2, stage.clientHeight / 2); };
  $('zFit').onclick = fit;
  try { var a0 = localStorage.getItem(LS_AREA); if (a0) $('area').value = a0; } catch (e) {}
  $('area').addEventListener('change', function () { try { localStorage.setItem(LS_AREA, area()); } catch (e) {} renderCounts(); renderMeasures(); });
  $('annotator').value = localStorage.getItem(LS_WHO) || '';
  $('annotator').addEventListener('change', function () { try { localStorage.setItem(LS_WHO, this.value.trim()); } catch (e) {} });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
      if (e.key === 'Enter' && (e.target.id === 'cRoca' || e.target.id === 'cArena')) { e.preventDefault(); e.target.blur(); toggleDone(); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoLast(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); return; }
    if (e.key === 'Enter') { if (cur()) { e.preventDefault(); toggleDone(); } return; }
    if (e.key === '+' || e.key === '=') { zoomAt(1.4, stage.clientWidth / 2, stage.clientHeight / 2); return; }
    if (e.key === '-') { zoomAt(1 / 1.4, stage.clientWidth / 2, stage.clientHeight / 2); return; }
    if (e.key === '0') { fit(); return; }
    if (e.key === 'Escape') { if (measure) setMeasure(false); else if (activeCat) setActive(null); return; }
    if (e.key === 'm' || e.key === 'M') { setMeasure(!(measure && measure.mode === 'measure')); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selId) { removePt(selId); return; }
    var i = KEYS.indexOf(e.key.toLowerCase());
    if (i >= 0 && cats[i]) { e.preventDefault(); setActive(cats[i]); }
  });
  window.addEventListener('pagehide', save);

  save();
  renderAll();
})();
