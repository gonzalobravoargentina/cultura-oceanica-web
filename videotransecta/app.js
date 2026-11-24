/* Video Transecta — conteo de piedras en video transectas, en el navegador.
 * Los videos se leen del disco (URL.createObjectURL): nunca se suben.
 * Categorías, puntos y tramos vistos se guardan en localStorage.
 * "Descargar datos" arma un .xlsx (hojas Totales, Por video y Puntos) sin librerías.
 */
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────
  var LS_CATS = 'vt.categories.v2', LS_ANN = 'vt.annotations.v2', LS_WHO = 'vt.annotator', LS_SEEN = 'vt.seen.v1';
  var KEYS = '123456789qwertyuiopasdfghjklzxcvbm'.split('');   // per category, in order ('n' = next gap)
  var PALETTE = ['#00c9d4', '#f4a261', '#c77dff', '#8ecae6', '#b5e48c', '#ff8fab', '#90be6d', '#4cc9f0', '#f9844a', '#a0c4ff', '#06d6a0', '#ffb703'];
  // default categories (stones). Colours chosen to read on rock: white, cyan, red, and
  // yellow for black stones (a black ring would vanish on dark rock).
  var DEFAULT_CATS = [
    { name: 'Blanca chica', color: '#ffffff' },
    { name: 'Blanca grande', color: '#00c9d4' },
    { name: 'Roja', color: '#ff4d4d' },
    { name: 'Negra', color: '#ffd166' }
  ];
  var cats = load(LS_CATS, null);    // [{id, name, color}]
  var anns = load(LS_ANN, []);       // [{id, video, t, cat, x, y, w, h, note, who, created}]
  var seen = load(LS_SEEN, {});      // video → [[a, b], …] watched stretches
  var videos = [], cur = null, fps = 30, selId = null, activeCat = null;
  if (!cats || !cats.length) cats = DEFAULT_CATS.map(function (d) { return { id: uid(), name: d.name, color: d.color }; });

  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode / full: download still works */ } }
  function save() { store(LS_CATS, cats); store(LS_ANN, anns); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(t, dec) {
    if (!isFinite(t)) t = 0;
    var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
    var ss = s.toFixed(dec == null ? 1 : dec); if (s < 10) ss = '0' + ss;
    return (h ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + ss;
  }
  function fmt0(t) { return fmt(t, 0).replace(/\.\d+$/, ''); }
  function catById(id) { for (var i = 0; i < cats.length; i++) if (cats[i].id === id) return cats[i]; return null; }
  function annById(id) { for (var i = 0; i < anns.length; i++) if (anns[i].id === id) return anns[i]; return null; }
  function curAnns() { return cur ? anns.filter(function (a) { return a.video === cur.name; }) : []; }
  var video = $('video');

  var flashT;
  function flash(txt, color) {
    var f = $('flash'); f.textContent = txt; f.style.background = color || '#00c9d4';
    f.classList.add('on'); clearTimeout(flashT); flashT = setTimeout(function () { f.classList.remove('on'); }, 1100);
  }

  // ── Videos ─────────────────────────────────────────────────────────
  function addVideos(files) {
    var first = null;
    Array.prototype.forEach.call(files, function (f) {
      if (!/^video\//.test(f.type) && !/\.(mp4|mov|m4v|webm|mkv|avi|mts)$/i.test(f.name)) return;
      var ex = videos.filter(function (v) { return v.name === f.name; })[0];
      if (ex) { URL.revokeObjectURL(ex.url); ex.url = URL.createObjectURL(f); first = first || ex; return; }
      var v = { name: f.name, url: URL.createObjectURL(f) }; videos.push(v); first = first || v;
    });
    if (first) selectVideo(first);
  }
  function selectVideo(v) {
    cur = v; selId = null; $('verr').hidden = true;
    video.src = v.url;
    $('stage').classList.add('has-video');
    renderAll();
  }
  function renderVideoPicker() {
    var el = $('vname');
    if (!cur) { el.textContent = ''; return; }
    if (videos.length < 2) { el.textContent = '🎞 ' + cur.name; return; }
    el.innerHTML = '🎞 <select id="vpick" aria-label="Video">' + videos.map(function (v, i) {
      return '<option value="' + i + '"' + (v === cur ? ' selected' : '') + '>' + esc(v.name) + '</option>'; }).join('') + '</select>';
    $('vpick').onchange = function () { video.pause(); selectVideo(videos[+this.value]); };
  }
  // ── Formats: the app itself runs in any modern browser on any system;
  // what changes between systems is which VIDEO CODECS the browser decodes.
  // H.264 plays everywhere; H.265/HEVC (GoPro, recent phones, some TG
  // settings) depends on the OS, the browser and sometimes the GPU.
  var OS = /Windows/i.test(navigator.userAgent) ? 'win' : /Mac|iPhone|iPad/i.test(navigator.userAgent) ? 'mac'
         : /Android/i.test(navigator.userAgent) ? 'android' : /Linux|CrOS/i.test(navigator.userAgent) ? 'linux' : 'other';
  function canPlay(type) { try { return !!document.createElement('video').canPlayType(type); } catch (e) { return false; } }
  var CODEC = { h264: canPlay('video/mp4; codecs="avc1.42E01E"'), hevc: canPlay('video/mp4; codecs="hvc1.1.6.L93.B0"') || canPlay('video/mp4; codecs="hev1.1.6.L93.B0"') };
  $('codecs').innerHTML = 'Este navegador reproduce: H.264 ' + (CODEC.h264 ? '✓' : '✗') + ' · H.265/HEVC ' + (CODEC.hevc ? '✓' : '✗ (si tu video es H.265, mirá abajo qué hacer)');
  var HEVC_HELP = {
    win: 'En Windows: usá <b>Microsoft Edge</b> o <b>Chrome</b> actualizados e instalá «Extensiones de video HEVC» desde Microsoft Store; Firefox en Windows suele no reproducirlo.',
    mac: 'En Mac: usá <b>Safari</b> o <b>Chrome</b> actualizados (macOS 11 o más nuevo).',
    linux: 'En Linux: el soporte de H.265 depende de la placa de video y del navegador; lo más seguro es convertir el video a H.264.',
    android: 'En Android: depende del teléfono; lo más seguro es convertir el video a H.264.',
    other: 'Lo más seguro es convertir el video a H.264.'
  };
  video.addEventListener('error', function () {
    var e = $('verr'); e.hidden = false;
    e.innerHTML = 'Este navegador no puede reproducir <b>' + esc(cur ? cur.name : 'el video') + '</b>. '
      + 'Casi siempre es porque el video está en <b>H.265/HEVC</b> (o es AVI/MTS). ' + HEVC_HELP[OS]
      + '<br>Solución que anda en cualquier sistema: convertirlo a MP4 H.264 con <a href="https://handbrake.fr" target="_blank" rel="noopener">HandBrake</a> (gratis, Windows/Mac/Linux, preset «Fast 1080p30»), '
      + 'o con <code>ffmpeg -i entrada.mp4 -c:v libx264 -crf 20 -an salida.mp4</code>.';
  });
  // some browsers "load" an H.265 file but only show black frames with sound or a 0×0 picture
  video.addEventListener('loadeddata', function () {
    if (cur && video.videoWidth === 0) video.dispatchEvent(new Event('error'));
  });
  // playbackRate is reset by the browser when a new source loads: re-apply it
  video.addEventListener('loadedmetadata', function () { video.playbackRate = +$('speed').value; renderAll(); });
  video.addEventListener('play', function () { syncPlay(); lastSeenT = video.currentTime; });
  video.addEventListener('pause', function () {
    syncPlay(); var t = video.currentTime;
    if (lastSeenT != null && video.playbackRate <= 2 && t > lastSeenT && t - lastSeenT < 1.5) addSeen(lastSeenT, t);
    lastSeenT = t; store(LS_SEEN, seen); renderTable();
  });
  video.addEventListener('timeupdate', function () {
    var t = video.currentTime;
    if (lastSeenT != null && !video.seeking && !video.paused && video.playbackRate <= 2 && t > lastSeenT && t - lastSeenT < 1.5) addSeen(lastSeenT, t);
    if (!video.seeking) lastSeenT = t;
    tick();
  });
  video.addEventListener('seeking', function () { lastSeenT = null; });
  video.addEventListener('seeked', function () { lastSeenT = video.currentTime; tick(); });
  function syncPlay() { $('bPlay').textContent = video.paused ? '▶' : '❚❚'; }

  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {     // frame-rate estimate for , and .
    var lastMT = null, samples = [];
    var onFrame = function (now, md) {
      if (lastMT != null && !video.paused && video.playbackRate === 1) {
        var d = md.mediaTime - lastMT;
        if (d > 0.005 && d < 0.2) { samples.push(d); if (samples.length > 30) samples.shift(); }
        if (samples.length >= 10) { var s = samples.slice().sort(function (a, b) { return a - b; }); fps = Math.round(1 / s[s.length >> 1]); }
      }
      lastMT = md.mediaTime; video.requestVideoFrameCallback(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
  }
  function seek(t) { if (!cur || !isFinite(video.duration)) return; video.currentTime = Math.max(0, Math.min(video.duration, t)); }
  function step(n) { video.pause(); var t0 = video.currentTime, t1 = t0 + n / (fps || 30); if (n > 0) addSeen(t0, t1); seek(t1); }
  function togglePlay() { if (!cur) return; if (video.paused) video.play(); else video.pause(); }
  function jumpS() { return +$('jump').value || 10; }
  function syncJump() { $('bBack').textContent = '−' + jumpS() + ' s'; $('bFwd').textContent = '+' + jumpS() + ' s'; }

  // ── Coverage: which stretches were actually watched ────────────────
  // Played at ≤ 2× or stepped frame by frame = seen; jumps leave gaps.
  var lastSeenT = null, seenSaveT = 0;
  function seenOf() { return cur ? (seen[cur.name] = seen[cur.name] || []) : []; }
  function seenPct(name, dur) {
    var tot = 0; (seen[name] || []).forEach(function (x) { tot += Math.max(0, Math.min(x[1], dur) - Math.max(x[0], 0)); });
    return dur > 0 ? Math.min(100, tot / dur * 100) : 0;
  }
  function addSeen(a, b) {
    if (!cur || !(b > a)) return;
    var iv = seenOf().concat([[a, b]]).sort(function (p, q) { return p[0] - q[0]; }), out = [];
    iv.forEach(function (x) { var L = out[out.length - 1]; if (L && x[0] <= L[1] + 0.25) L[1] = Math.max(L[1], x[1]); else out.push([x[0], x[1]]); });
    seen[cur.name] = out.map(function (x) { return [+x[0].toFixed(2), +x[1].toFixed(2)]; });
    var now = Date.now(); if (now - seenSaveT > 2000) { seenSaveT = now; store(LS_SEEN, seen); }
    renderSeen();
  }
  function renderSeen() {
    var d = video.duration, el = $('tlSeen');
    if (!cur || !isFinite(d) || d <= 0) { el.innerHTML = ''; $('seenPct').textContent = '—'; return; }
    el.innerHTML = seenOf().map(function (x) {
      var a = Math.max(0, x[0]), b = Math.min(d, x[1]);
      return '<div style="left:' + (a / d * 100) + '%;width:' + ((b - a) / d * 100) + '%"></div>';
    }).join('');
    var pct = seenPct(cur.name, d);
    $('seenPct').textContent = pct > 99.5 ? '100 % ✓' : pct.toFixed(0) + ' %';
    if (cur) cur.dur = d;
  }
  function nextGap() {
    var d = video.duration; if (!cur || !isFinite(d)) return;
    var holes = [], t = 0;
    seenOf().forEach(function (x) { if (x[0] > t + 0.25) holes.push([t, x[0]]); t = Math.max(t, x[1]); });
    if (!holes.length) {
      if (t >= d - 0.25) { flash('Ya se vio todo el video ✓', '#52c98a'); return; }
      video.pause(); seek(t); flash('No quedaron huecos. Seguís desde ' + fmt(t), '#52c98a'); return;
    }
    var g = holes.filter(function (x) { return x[0] > video.currentTime + 0.3; })[0] || holes[0];
    video.pause(); seek(g[0]); flash('Hueco sin ver: ' + fmt(g[0]) + '–' + fmt(g[1]), '#f07070');
  }

  // ── Points ─────────────────────────────────────────────────────────
  function frameRect() {
    var r = video.getBoundingClientRect(), vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return null;
    var sc = Math.min(r.width / vw, r.height / vh), w = vw * sc, h = vh * sc;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
  }
  function relPos(e) {
    var f = frameRect(); if (!f) return null;
    var x = (e.clientX - f.left) / f.width, y = (e.clientY - f.top) / f.height;
    return (x < 0 || x > 1 || y < 0 || y > 1) ? null : { x: x, y: y };
  }
  function addPoint(cat, pos) {
    var a = { id: uid(), video: cur.name, t: +video.currentTime.toFixed(3), cat: cat.id,
              x: +pos.x.toFixed(5), y: +pos.y.toFixed(5), w: video.videoWidth, h: video.videoHeight,
              note: '', who: $('annotator').value.trim(), created: new Date().toISOString() };
    anns.push(a); selId = a.id; save();
    flash(cat.name + ' · ' + curAnns().filter(function (b) { return b.cat === cat.id; }).length, cat.color);
    renderAll(); scrollToSel();
  }
  function removeAnn(id) { anns = anns.filter(function (a) { return a.id !== id; }); if (selId === id) selId = null; save(); renderAll(); }
  function undoLast() {
    var mine = curAnns(); if (!mine.length) return;
    removeAnn(mine.reduce(function (p, a) { return a.created > p.created ? a : p; }).id); flash('Deshecho', '#92b8cc');
  }
  function renderPoints() {
    var box = $('pts');
    box.classList.toggle('marking', !!activeCat);
    if (!cur) { box.innerHTML = ''; return; }
    var f = frameRect(), st = $('stage').getBoundingClientRect(), t = video.currentTime;
    if (!f) { box.innerHTML = ''; return; }
    // a point stays on screen 0.3 s around its moment (and always when paused on it)
    box.innerHTML = curAnns().filter(function (a) { return Math.abs(a.t - t) <= 0.3; }).map(function (a) {
      var c = catById(a.cat) || { color: '#888', name: '?' };
      return '<div class="pt' + (a.id === selId ? ' sel' : '') + '" data-id="' + a.id + '" style="left:' + (f.left - st.left + a.x * f.width)
        + 'px;top:' + (f.top - st.top + a.y * f.height) + 'px;border-color:' + c.color + '" title="' + esc(c.name) + '"></div>';
    }).join('');
  }
  window.addEventListener('resize', renderPoints);
  $('pts').addEventListener('click', function (e) {
    var d = e.target.closest('.pt'); if (!d) return;
    e.stopPropagation(); selId = d.dataset.id; renderPoints(); markSel(); renderTimeline(); scrollToSel();
  });

  // ── Categories ─────────────────────────────────────────────────────
  function addCat(name) {
    name = String(name || '').trim(); if (!name) return null;
    var ex = cats.filter(function (c) { return c.name.toLowerCase() === name.toLowerCase(); })[0];
    if (ex) return ex;
    var used = cats.map(function (c) { return c.color; });
    var c = { id: uid(), name: name, color: PALETTE.filter(function (p) { return used.indexOf(p) < 0; })[0] || PALETTE[cats.length % PALETTE.length] };
    cats.push(c); save(); return c;
  }
  function setActive(c, toggle) { activeCat = (toggle && activeCat === c) ? null : c; $('stage').classList.toggle('armed', !!activeCat); renderCats(); renderPoints(); }
  $('catForm').addEventListener('submit', function (e) {
    e.preventDefault(); var c = addCat($('catName').value); $('catName').value = ''; $('catName').blur();
    if (c) renderAll();
  });
  function renderCats() {
    var tot = {}; curAnns().forEach(function (a) { tot[a.cat] = (tot[a.cat] || 0) + 1; });
    var el = $('cats');
    if (!cats.length) { el.innerHTML = '<p class="empty">No hay categorías. Agregá una arriba.</p>'; return; }
    el.innerHTML = cats.map(function (c, i) {
      return '<div class="cat' + (c === activeCat ? ' active' : '') + '" data-id="' + c.id + '">'
        + '<button type="button" class="key" data-act="pick" style="background:' + c.color + '" title="Elegir (tecla ' + esc(KEYS[i] || '') + ')">' + esc((KEYS[i] || '').toUpperCase()) + '</button>'
        + '<button type="button" class="name" data-act="pick" title="Clic: elegir · Doble clic: renombrar">' + esc(c.name) + '</button>'
        + '<span class="n" title="Total en este video">' + (tot[c.id] || '') + '</span>'
        + '<button type="button" class="del" data-act="del" title="Borrar categoría" aria-label="Borrar ' + esc(c.name) + '">✕</button></div>';
    }).join('');
  }
  $('cats').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var c = catById(b.closest('.cat').dataset.id); if (!c) return;
    b.blur();
    if (b.dataset.act === 'pick') setActive(c, true);
    else if (b.dataset.act === 'del') {
      var m = anns.filter(function (a) { return a.cat === c.id; }).length;
      if (m && !confirm('«' + c.name + '» tiene ' + m + ' punto(s) (en todos los videos). ¿Borrar la categoría y sus puntos?')) return;
      if (activeCat === c) setActive(null);
      cats = cats.filter(function (x) { return x !== c; }); anns = anns.filter(function (a) { return a.cat !== c.id; });
      save(); renderAll();
    }
  });
  $('cats').addEventListener('dblclick', function (e) {
    var b = e.target.closest('.name'); if (!b) return;
    var c = catById(b.closest('.cat').dataset.id), nn = prompt('Nuevo nombre para la categoría:', c.name);
    if (nn && nn.trim()) { c.name = nn.trim(); save(); renderAll(); }
  });

  // ── Timeline ───────────────────────────────────────────────────────
  function renderTimeline() {
    var dur = video.duration, axis = $('tlAxis'), lanes = $('tlLanes');
    if (!cur || !isFinite(dur) || dur <= 0) { axis.innerHTML = lanes.innerHTML = ''; return; }
    var steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600], st = 3600;
    for (var i = 0; i < steps.length; i++) if (dur / steps[i] <= 9) { st = steps[i]; break; }
    var h = ''; for (var t = 0; t <= dur; t += st) h += '<span style="left:' + (t / dur * 100) + '%">' + fmt0(t) + '</span>';
    axis.innerHTML = h;
    var mine = curAnns();
    lanes.innerHTML = cats.map(function (c) {
      return '<div class="tl-lane" title="' + esc(c.name) + '">' + mine.filter(function (a) { return a.cat === c.id; }).map(function (a) {
        return '<div class="tl-mark' + (a.id === selId ? ' sel' : '') + '" data-id="' + a.id + '" style="left:' + (a.t / dur * 100) + '%;background:' + c.color + '"></div>';
      }).join('') + '</div>';
    }).join('');
  }
  $('timeline').addEventListener('click', function (e) {
    if (!cur || !isFinite(video.duration)) return;
    var m = e.target.closest('.tl-mark');
    if (m) { var a = annById(m.dataset.id); if (a) { selId = a.id; video.pause(); seek(a.t); renderAll(); scrollToSel(); } return; }
    var r = this.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * video.duration);
  });

  // ── Table ──────────────────────────────────────────────────────────
  function renderTable() {
    // newest first: the point just marked is always the top row
    var mine = curAnns().sort(function (a, b) { return a.created < b.created ? 1 : a.created > b.created ? -1 : 0; });
    $('annCount').textContent = mine.length ? '(' + mine.length + ')' : '';
    if (!mine.length) { $('annBody').innerHTML = '<tr><td colspan="5" class="empty">' + (cur ? 'Sin puntos en este video.' : 'Abrí un video para empezar.') + '</td></tr>'; return; }
    var opts = function (a) { return cats.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === a.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join(''); };
    $('annBody').innerHTML = mine.map(function (a) {
      var c = catById(a.cat) || { color: '#555' };
      return '<tr data-id="' + a.id + '"' + (a.id === selId ? ' class="sel"' : '') + '>'
        + '<td class="t"><button type="button" class="rowbtn" data-act="go" title="Ir a este momento">▸ ' + fmt(a.t, 2) + '</button></td>'
        + '<td><span class="dot" style="background:' + c.color + '"></span><select data-f="cat" aria-label="Categoría">' + opts(a) + '</select></td>'
        + '<td class="t">' + Math.round(a.x * a.w) + ', ' + Math.round(a.y * a.h) + '</td>'
        + '<td><input type="text" data-f="note" value="' + esc(a.note) + '" placeholder="—" aria-label="Nota"></td>'
        + '<td><button type="button" class="rowbtn x" data-act="del" title="Borrar">✕</button></td></tr>';
    }).join('');
    markNear();
  }
  $('annBody').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-id]'); if (!tr) return;
    var a = annById(tr.dataset.id); if (!a) return;
    var b = e.target.closest('[data-act]');
    if (b && b.dataset.act === 'del') { removeAnn(a.id); return; }
    if (b && b.dataset.act === 'go') { video.pause(); seek(a.t); }
    if (selId !== a.id) { selId = a.id; markSel(); renderPoints(); renderTimeline(); }
  });
  $('annBody').addEventListener('change', function (e) {
    var f = e.target.dataset.f; if (!f) return;
    var a = annById(e.target.closest('tr').dataset.id); if (!a) return;
    a[f] = e.target.value; save();
    if (f === 'cat') renderAll();
  });
  function markSel() { Array.prototype.forEach.call($('annBody').rows, function (r) { r.classList.toggle('sel', r.dataset.id === selId); }); }
  function markNear() {
    var t = video.currentTime;
    Array.prototype.forEach.call($('annBody').rows, function (r) { var a = r.dataset.id && annById(r.dataset.id); r.classList.toggle('near', !!a && Math.abs(a.t - t) <= 0.5); });
  }
  function scrollToSel() {
    var r = $('annBody').querySelector('tr.sel'), w = document.querySelector('.tablewrap'); if (!r || !w) return;
    var top = r.offsetTop - 34, bot = r.offsetTop + r.offsetHeight;
    if (top < w.scrollTop) w.scrollTop = top; else if (bot > w.scrollTop + w.clientHeight) w.scrollTop = bot - w.clientHeight;
  }

  function tick() {
    $('tCur').textContent = fmt(video.currentTime);
    $('tDur').textContent = isFinite(video.duration) ? fmt0(video.duration) : '0:00';
    var d = video.duration; $('tlHead').style.left = (isFinite(d) && d > 0 ? video.currentTime / d * 100 : 0) + '%';
    markNear(); renderPoints();
  }
  function renderAll() { renderCats(); renderTimeline(); renderSeen(); renderTable(); renderVideoPicker(); tick(); }

  // ── Excel (.xlsx) without libraries ────────────────────────────────
  // An .xlsx is a ZIP of a few XML files. Cells are written as inline
  // strings or numbers; the ZIP uses "stored" entries (no compression).
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

  $('btnExport').addEventListener('click', function () {
    if (!anns.length) { alert('Todavía no hay puntos para descargar.'); return; }
    var who = $('annotator').value.trim();
    var rows = anns.slice().sort(function (a, b) { return a.video < b.video ? -1 : a.video > b.video ? 1 : a.t - b.t; });
    var puntos = [['video', 'tiempo_s', 'tiempo', 'categoria', 'x_px', 'y_px', 'x_rel', 'y_rel', 'ancho_px', 'alto_px', 'nota', 'anotador', 'fecha_anotacion']]
      .concat(rows.map(function (a) {
        var c = catById(a.cat);
        return [a.video, +a.t.toFixed(3), fmt(a.t, 3), c ? c.name : '', Math.round(a.x * a.w), Math.round(a.y * a.h), +a.x.toFixed(5), +a.y.toFixed(5),
                a.w, a.h, a.note || '', a.who || who, (a.created || '').replace('T', ' ').slice(0, 19)];
      }));
    // totals per video × category (zeros included) and how much of each video was watched
    var vids = []; rows.forEach(function (a) { if (vids.indexOf(a.video) < 0) vids.push(a.video); });
    var totales = [['video', 'categoria', 'n', 'duracion_video_s', 'revisado_pct']];
    vids.forEach(function (v) {
      var vv = videos.filter(function (x) { return x.name === v; })[0], dur = vv && vv.dur ? vv.dur : (cur && cur.name === v && isFinite(video.duration) ? video.duration : null);
      cats.forEach(function (c) {
        totales.push([v, c.name, anns.filter(function (a) { return a.video === v && a.cat === c.id; }).length,
                      dur ? +dur.toFixed(2) : '', dur ? +seenPct(v, dur).toFixed(1) : '']);
      });
    });
    // grand total per category over everything annotated (all videos), plus a TOTAL row
    var resumen = [['categoria', 'total']], all = 0;
    cats.forEach(function (c) { var n = anns.filter(function (a) { return a.cat === c.id; }).length; all += n; resumen.push([c.name, n]); });
    resumen.push(['TOTAL', all]);
    if (vids.length > 1) resumen.push(['', ''], ['videos', vids.length]);
    var base = (videos.length === 1 && cur ? cur.name.replace(/\.[^.]+$/, '') : 'videotransecta') + '_' + new Date().toISOString().slice(0, 10);
    var blob = xlsx([{ name: 'Totales', rows: resumen, widths: [18, 10] },
                     { name: 'Por video', rows: totales, widths: [28, 16, 8, 16, 13] },
                     { name: 'Puntos', rows: puntos, widths: [28, 10, 12, 16, 8, 8, 9, 9, 10, 10, 24, 16, 20] }]);
    var el = document.createElement('a'); el.href = URL.createObjectURL(blob); el.download = base + '.xlsx';
    document.body.appendChild(el); el.click(); setTimeout(function () { URL.revokeObjectURL(el.href); el.remove(); }, 1000);
  });

  // ── Wiring ─────────────────────────────────────────────────────────
  $('btnOpen').onclick = $('btnMore').onclick = function () { $('videoInput').click(); };
  $('videoInput').addEventListener('change', function () { addVideos(this.files); this.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) { $('stage').addEventListener(ev, function (e) { e.preventDefault(); this.classList.add('dragover'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { $('stage').addEventListener(ev, function (e) { e.preventDefault(); this.classList.remove('dragover'); }); });
  $('stage').addEventListener('drop', function (e) { addVideos(e.dataTransfer.files); });
  $('stage').addEventListener('click', function (e) {
    if (!cur || e.target !== video) return;
    if (!activeCat) { togglePlay(); return; }
    var pos = relPos(e); if (pos) addPoint(activeCat, pos);
  });
  $('bPlay').onclick = togglePlay;
  $('bBack').onclick = function () { seek(video.currentTime - jumpS()); };
  $('bFwd').onclick = function () { seek(video.currentTime + jumpS()); };
  $('bFrameB').onclick = function () { step(-1); };
  $('bFrameF').onclick = function () { step(1); };
  $('speed').onchange = function () { video.playbackRate = +this.value; this.blur(); };
  try { var js = localStorage.getItem('vt.jump'); if (js) $('jump').value = js; } catch (e) {}
  syncJump();
  $('jump').onchange = function () { syncJump(); try { localStorage.setItem('vt.jump', this.value); } catch (e) {} this.blur(); };
  $('btnGap').onclick = function () { this.blur(); nextGap(); };
  $('btnSeenReset').onclick = function () {
    this.blur(); if (!cur || !confirm('¿Borrar el registro de lo visto en ' + cur.name + '? (los puntos no se tocan)')) return;
    seen[cur.name] = []; store(LS_SEEN, seen); renderSeen();
  };
  $('annotator').value = localStorage.getItem(LS_WHO) || '';
  $('annotator').addEventListener('change', function () { try { localStorage.setItem(LS_WHO, this.value.trim()); } catch (e) {} });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoLast(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ') { e.preventDefault(); togglePlay(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); seek(video.currentTime - (e.shiftKey ? jumpS() : 1)); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); seek(video.currentTime + (e.shiftKey ? jumpS() : 1)); return; }
    if (e.key === ',') { step(-1); return; }
    if (e.key === '.') { step(1); return; }
    if (e.key === 'Escape') { if (activeCat) setActive(null); return; }
    if (e.key === 'n' || e.key === 'N') { nextGap(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selId) { removeAnn(selId); return; }
    var i = KEYS.indexOf(e.key.toLowerCase());
    if (i >= 0 && cats[i]) { e.preventDefault(); setActive(cats[i]); }
  });

  save();
  renderAll();
})();
