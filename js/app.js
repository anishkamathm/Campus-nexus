/*
 * Campus Resource Platform: interactive demo
 * Plain JavaScript, no build step. State is kept in localStorage so the
 * demo survives a page refresh. Use "Reset demo data" in the footer to clear it.
 */
(function () {
  'use strict';

  var D = window.CRP_DATA;
  var STORE_KEY = 'crp-demo-v1';

  /* ---------- Small helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clockTime(d) {
    return (d || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function dueLabel(date) {
    var today = new Date();
    var same = date.toDateString() === today.toDateString();
    return (same ? 'Today, ' : 'Tomorrow, ') + clockTime(date);
  }
  function regexEscape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* ---------- Faculty availability (per approver: cabin + hours) ---------- */
  var SMALL_MAX_HOURS = 4; // equipment borrows at or under this count as "small"
  var QR_VALID_MS = 2 * 60 * 60 * 1000; // a generated QR is only good for 2 hours

  function parseRange(str) {
    var parts = str.split('-');
    function toMin(hm) {
      var bits = hm.split(':');
      return Number(bits[0]) * 60 + Number(bits[1]);
    }
    return { start: toMin(parts[0]), end: toMin(parts[1]) };
  }
  function minToLabel(min) {
    var d = new Date();
    d.setHours(Math.floor(min / 60), min % 60, 0, 0);
    return clockTime(d);
  }
  function facultyStatus(approverName) {
    var info = D.approvers && D.approvers[approverName];
    if (!info) return null;
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var ranges = info.hours.map(parseRange).sort(function (a, b) { return a.start - b.start; });
    var inRange = ranges.some(function (r) { return nowMin >= r.start && nowMin < r.end; });
    if (inRange) {
      return { available: true, text: 'Available now', cabin: info.cabin };
    }
    var next = ranges.filter(function (r) { return r.start > nowMin; })[0];
    var text = next
      ? 'Back at ' + minToLabel(next.start) + ' today'
      : 'Back tomorrow at ' + minToLabel(ranges[0].start);
    return { available: false, text: text, cabin: info.cabin };
  }
  function availBadge(approverName) {
    var st = facultyStatus(approverName);
    if (!st) return '';
    return '<div class="avail-row"><span class="pill ' + (st.available ? 'pill--ok' : 'pill--wait') + '">' + esc(st.text) + '</span>' +
      '<span>' + esc(st.cabin) + '</span></div>';
  }
  function isTicketExpired(t) {
    return !t.scanned && (Date.now() - t.generatedAt) > QR_VALID_MS;
  }

  var ICON = {
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M20 14v.01"/><path d="M14 20h3"/><path d="M20 17v4"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>'
  };
  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICON[name] + '</svg>';
  }

  /* ---------- State ---------- */
  function defaultState() {
    return {
      auth: { role: null, name: '' },
      tab: 'ask',
      name: '',
      askText: '',
      askMsg: '',
      echo: '',
      bell: false,
      notes: [],
      perm: { procId: D.procedures[0].id, checked: {}, purpose: '', request: null },
      lib: { query: '', avail: {}, notify: {} },
      eq: { itemId: D.equipment[0].id, hours: '4', purpose: '', ticket: null, log: [], counter: 1041 }
    };
  }
  function loadState() {
    var s = defaultState();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        Object.keys(s).forEach(function (k) {
          if (saved[k] === undefined) return;
          if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) {
            s[k] = Object.assign(s[k], saved[k]);
          } else {
            s[k] = saved[k];
          }
        });
      }
    } catch (e) { /* storage unavailable: run without saving */ }
    return s;
  }
  var state = loadState();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---------- Notifications and toast ---------- */
  function addNote(text) {
    state.notes.unshift({ id: Date.now() + Math.random(), text: text, time: clockTime(), read: false });
    state.notes = state.notes.slice(0, 12);
  }
  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 3600);
  }

  /* ---------- Header ---------- */
  var STUDENT_TABS = [
    { id: 'ask', label: 'Ask' },
    { id: 'perm', label: 'Permissions' },
    { id: 'lib', label: 'Library' },
    { id: 'equip', label: 'Equipment' }
  ];
  var ADMIN_TABS = [
    { id: 'appr', label: 'Approvals' },
    { id: 'eqdesk', label: 'Equipment desk' },
    { id: 'libdesk', label: 'Library desk' }
  ];
  function currentTabs() { return state.auth.role === 'admin' ? ADMIN_TABS : STUDENT_TABS; }
  function renderWho() {
    var w = $('#who');
    if (!w) return;
    if (!state.auth.role) { w.innerHTML = ''; return; }
    w.innerHTML =
      '<span class="who__role">' + (state.auth.role === 'admin' ? 'Admin' : 'Student') + '</span>' +
      '<span class="who__name">' + esc(state.name || state.auth.name) + '</span>' +
      '<button type="button" class="btn btn--quiet btn--small" data-action="logout">Log out</button>';
  }
  function renderHeader() {
    $('#brand').textContent = D.APP_NAME;
    $('#tabs').innerHTML = currentTabs().map(function (t) {
      var on = t.id === state.tab;
      return '<a href="#' + t.id + '" class="tab' + (on ? ' is-on' : '') + '" data-action="go" data-tab="' + t.id + '"' +
        (on ? ' aria-current="page"' : '') + '>' + t.label + '</a>';
    }).join('');

    var unread = state.notes.filter(function (n) { return !n.read; }).length;
    var count = $('#bell-count');
    count.hidden = unread === 0;
    count.textContent = unread;
    $('#bell').setAttribute('aria-expanded', String(state.bell));
    $('#bell').setAttribute('aria-label', unread ? 'Notifications, ' + unread + ' unread' : 'Notifications');

    var panel = $('#bell-panel');
    panel.hidden = !state.bell;
    if (state.bell) {
      panel.innerHTML =
        '<div class="bell-panel__head"><strong>Notifications</strong>' +
        (state.notes.length ? '<button type="button" class="link" data-action="read-all">Mark all as read</button>' : '') + '</div>' +
        (state.notes.length
          ? '<ul>' + state.notes.map(function (n) {
              return '<li class="' + (n.read ? '' : 'is-unread') + '"><span>' + esc(n.text) + '</span><time>' + esc(n.time) + '</time></li>';
            }).join('') + '</ul>'
          : '<p class="empty">Nothing yet. Alerts about approvals, returned books and borrowed equipment will show up here.</p>');
    }
    renderWho();
  }

  /* ---------- Login ---------- */
  function viewLogin() {
    return '' +
      '<section class="hero">' +
        '<div class="hero__main">' +
          '<h1>Welcome to ' + esc(D.APP_NAME) + '</h1>' +
          '<p class="lede">Sign in to continue. Use a demo account below to try either side of the app.</p>' +
          '<div class="login-cards">' +
            '<button type="button" class="login-card" data-action="login" data-role="student">' +
              '<span class="login-card__role">Student</span>' +
              '<span class="login-card__name">' + esc(D.DEMO_STUDENT.name) + '</span>' +
              '<span class="login-card__hint">Ask for things, request permissions, check the library and borrow equipment.</span>' +
            '</button>' +
            '<button type="button" class="login-card" data-action="login" data-role="admin">' +
              '<span class="login-card__role">Admin</span>' +
              '<span class="login-card__name">' + esc(D.DEMO_ADMIN.name) + '</span>' +
              '<span class="login-card__hint">Approve requests, scan equipment QR codes and manage the library desk.</span>' +
            '</button>' +
          '</div>' +
          '<p class="fineprint">Demo accounts only — no password needed for this demo.</p>' +
        '</div>' +
      '</section>';
  }

  /* ---------- Ask: understand a request and route it ---------- */
  var EXAMPLES = [
    'I need an oscilloscope for my project tomorrow',
    'How do I get permission to attend a hackathon?',
    'Is Operating System Concepts available?',
    'Where do I get a bonafide certificate?'
  ];

  function hasWord(text, list) {
    return list.some(function (k) {
      return new RegExp('\\b' + regexEscape(k) + 's?\\b').test(text);
    });
  }

  function routeAsk(raw) {
    var t = raw.toLowerCase().trim();
    if (!t) return null;

    var eq = D.equipment.filter(function (e) { return hasWord(t, e.keywords); })[0];
    if (eq) return { tab: 'equip', itemId: eq.id };

    var pr = D.procedures.filter(function (p) { return hasWord(t, p.keywords); })[0];
    if (pr) return { tab: 'perm', procId: pr.id };

    var bk = D.books.filter(function (b) { return hasWord(t, b.tags) || t.indexOf(b.title.toLowerCase()) !== -1; })[0];
    if (bk) {
      var tag = bk.tags.filter(function (k) { return hasWord(t, [k]); })[0];
      return { tab: 'lib', query: tag || bk.title };
    }

    if (hasWord(t, ['book', 'library', 'journal', 'reading', 'seat', 'study room', 'available', 'availability', 'copy', 'copies'])) {
      var stop = 'i need want a an the to for on of in is are be any there do you can how get find check my me book library available availability copy copies borrow'.split(' ');
      var q = t.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w && stop.indexOf(w) === -1; }).join(' ');
      return { tab: 'lib', query: q };
    }
    if (hasWord(t, ['equipment', 'lab', 'kit', 'board', 'borrow', 'instrument'])) {
      return { tab: 'equip', itemId: state.eq.itemId };
    }
    if (hasWord(t, ['permission', 'permit', 'letter', 'approval', 'approve', 'form', 'document', 'procedure', 'whom'])) {
      return { tab: 'perm', procId: state.perm.procId };
    }
    return null;
  }

  function submitAsk(text) {
    state.askText = text;
    var r = routeAsk(text);
    if (!r) {
      state.askMsg = text.trim()
        ? 'We couldn’t match that yet. Pick one of the three areas below, or try an example.'
        : 'Type what you need, or pick an example.';
      save();
      render();
      return;
    }
    state.askMsg = '';
    state.echo = text.trim();
    state.tab = r.tab;
    if (r.procId) state.perm.procId = r.procId;
    if (r.itemId) state.eq.itemId = r.itemId;
    if (r.tab === 'lib') state.lib.query = r.query || '';
    save();
    render();
    goTop();
  }

  function echoLine() {
    return state.echo
      ? '<p class="echo">You asked: “' + esc(state.echo) + '”. Here is what we found.</p>'
      : '';
  }

  function viewAsk() {
    return '' +
      '<section class="hero">' +
        '<div class="hero__main">' +
          '<h1>Tell us what you need. We’ll show you the way.</h1>' +
          '<p class="lede">Permissions, library books and lab equipment in one place, with the next step spelled out.</p>' +
          '<form class="ask" id="ask-form" autocomplete="off">' +
            '<label class="sr-only" for="ask-input">What do you need?</label>' +
            '<input id="ask-input" name="q" type="text" data-input="ask" placeholder="Try: I need an oscilloscope for my project tomorrow" value="' + esc(state.askText) + '">' +
            '<button class="btn btn--primary" type="submit">Find it</button>' +
          '</form>' +
          (state.askMsg ? '<p class="ask-msg" role="alert">' + esc(state.askMsg) + '</p>' : '') +
          '<div class="chips" role="group" aria-label="Example questions">' +
            EXAMPLES.map(function (x) {
              return '<button type="button" class="chip" data-action="ask-example" data-text="' + esc(x) + '">' + esc(x) + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<aside class="path" aria-labelledby="path-h">' +
          '<h2 id="path-h">A good way to try the demo</h2>' +
          '<ol>' +
            '<li>Ask for something above, or choose an area below.</li>' +
            '<li>Read the guidance: whom to ask, when and how.</li>' +
            '<li>Small requests can be sent and approved on WhatsApp. Major ones need an in-person visit.</li>' +
            '<li>Generate a QR for equipment — the in-charge scans it to record the borrowing.</li>' +
          '</ol>' +
        '</aside>' +
      '</section>' +
      '<section class="routes" aria-label="Areas">' +
        '<a class="route" href="#perm" data-action="go" data-tab="perm">' +
          icon('doc', 'route__icon') +
          '<h2>Permissions and documents</h2>' +
          '<p>Whom to ask, when, how, and which papers to carry. Small requests can be approved in one tap on WhatsApp.</p>' +
        '</a>' +
        '<a class="route" href="#lib" data-action="go" data-tab="lib">' +
          icon('book', 'route__icon') +
          '<h2>Library</h2>' +
          '<p>See if a book is on the shelf. If every copy is out, get an alert when one comes back.</p>' +
        '</a>' +
        '<a class="route" href="#equip" data-action="go" data-tab="equip">' +
          icon('qr', 'route__icon') +
          '<h2>Lab equipment</h2>' +
          '<p>Generate a QR for short borrows, or visit in person for longer ones. The in-charge scans it to record the borrowing.</p>' +
        '</a>' +
      '</section>';
  }

  /* ---------- Permissions ---------- */
  function curProc() {
    return D.procedures.filter(function (p) { return p.id === state.perm.procId; })[0] || D.procedures[0];
  }
  function docsReady(p) {
    var c = state.perm.checked[p.id] || {};
    return p.documents.filter(function (_, i) { return c[i]; }).length;
  }

  function studentPhone(r) {
    var body;
    if (!r) {
      body = '<p class="empty">Send a request to see its status here.</p>';
    } else {
      var proc = D.procedures.filter(function (p) { return p.id === r.procId; })[0] || {};
      var decided = r.status === 'approved' || r.status === 'declined';
      var last = r.status === 'approved' ? 'Approved by ' + r.approver
               : r.status === 'declined' ? 'Declined by ' + r.approver
               : 'Waiting for ' + r.approver;
      body =
        '<div class="req">' +
          '<h4>' + esc(r.title) + '</h4>' +
          '<ol class="timeline">' +
            '<li class="done">Sent<time>' + esc(r.sentAt) + '</time></li>' +
            '<li class="' + (r.status !== 'sent' ? 'done' : '') + '">Delivered</li>' +
            '<li class="' + (decided ? 'done' : '') + '">' + esc(last) + (decided ? '<time>' + esc(r.decidedAt) + '</time>' : '') + '</li>' +
          '</ol>' +
          (r.status === 'approved'
            ? '<div class="stamp-row"><span class="stamp' + (r.animate ? ' pop' : '') + '">APPROVED</span></div>' +
              '<p class="next"><strong>Next step:</strong> ' + esc(proc.nextStep || '') + '</p>'
            : '') +
          (r.status === 'declined'
            ? '<div class="stamp-row"><span class="stamp stamp--no' + (r.animate ? ' pop' : '') + '">DECLINED</span></div>' +
              '<p class="next">Ask the ' + esc(r.approver) + ' for the reason, then send the request again.</p>'
            : '') +
        '</div>';
    }
    return '<div class="phone phone--student"><div class="phone__bar">Your requests</div><div class="phone__body">' + body + '</div></div>';
  }

  function facultyPhone(r) {
    var approver = r ? r.approver : curProc().approver;
    var body;
    if (!r) {
      body = '<p class="empty empty--wa">Requests from students appear here, with Approve and Decline buttons.</p>';
    } else {
      var decided = r.status === 'approved' || r.status === 'declined';
      body =
        '<div class="bubble bubble--in">' +
          '<strong>Permission request</strong>' +
          '<span>From: ' + esc(r.name) + '</span>' +
          '<span>For: ' + esc(r.title) + '</span>' +
          '<span>Details: ' + esc(r.purpose || 'Not added') + '</span>' +
          '<span>Documents ready: ' + r.docsReady + ' of ' + r.docsTotal + '</span>' +
          '<time>' + esc(r.sentAt) + '</time>' +
        '</div>' +
        (decided
          ? '<div class="bubble bubble--out">' + (r.status === 'approved' ? 'Approved ✓' : 'Declined') + '<time>' + esc(r.decidedAt) + '</time></div>'
          : '<div class="quick"><button type="button" class="qbtn qbtn--yes" data-action="fac-approve">Approve</button>' +
            '<button type="button" class="qbtn" data-action="fac-decline">Decline</button></div>');
    }
    return '<div class="phone phone--faculty"><div class="phone__bar phone__bar--wa">' + esc(approver) + '</div><div class="phone__body phone__body--wa">' + body + '</div></div>';
  }

  function phonesHTML() {
    var r = state.perm.request;
    return '' +
      '<figure class="phone-wrap"><figcaption>Your phone</figcaption>' + studentPhone(r) + '</figure>';
  }
  function refreshPhones() {
    var el = $('#phones');
    if (el) el.innerHTML = phonesHTML();
    clearAnimate();
  }
  function clearAnimate() {
    var r = state.perm.request;
    if (r && r.animate) { r.animate = false; save(); }
  }

  function waLink(r) {
    var msg = 'Permission request\nFrom: ' + r.name + '\nFor: ' + r.title +
      '\nDetails: ' + (r.purpose || 'Not added') + '\nDocuments ready: ' + r.docsReady + ' of ' + r.docsTotal;
    return 'https://wa.me/?text=' + encodeURIComponent(msg);
  }

  function viewPerm() {
    var p = curProc();
    var r = state.perm.request;
    var checked = state.perm.checked[p.id] || {};
    return '' +
      '<section class="page">' +
        '<header class="page__head"><h1>Permissions and documents</h1>' +
        '<p class="lede">Pick what you need. See whom to ask, when, and how. Then send the request on WhatsApp and watch it get approved.</p></header>' +
        echoLine() +
        '<div class="split">' +
          '<div class="col">' +
            '<h2 class="h-sm" id="proc-h">What do you need?</h2>' +
            '<div class="proc-list" role="group" aria-labelledby="proc-h">' +
              D.procedures.map(function (x) {
                var on = x.id === p.id;
                return '<button type="button" class="proc' + (on ? ' is-on' : '') + '" data-action="perm-select" data-id="' + x.id + '" aria-pressed="' + on + '">' + esc(x.title) + '</button>';
              }).join('') +
            '</div>' +
            '<article class="guide">' +
              '<h2>' + esc(p.title) + '</h2>' +
              '<dl class="facts">' +
                '<div><dt>Whom to ask</dt><dd><span class="hl">' + esc(p.whom) + '</span></dd></div>' +
                '<div><dt>Faculty availability</dt><dd>' + (availBadge(p.approver) || 'Not tracked for this approver') + '</dd></div>' +
                '<div><dt>When</dt><dd><span class="hl">' + esc(p.when) + '</span></dd></div>' +
                '<div><dt>How</dt><dd>' + esc(p.how) + '</dd></div>' +
                '<div><dt>Where</dt><dd>' + esc(p.where) + '</dd></div>' +
                '<div><dt>Time it takes</dt><dd>' + esc(p.turnaround) + '</dd></div>' +
              '</dl>' +
              '<h3 class="h-sm">Documents to carry <span class="count" id="doc-count">' + docsReady(p) + ' of ' + p.documents.length + ' ready</span></h3>' +
              '<ul class="checks">' +
                p.documents.map(function (d, i) {
                  return '<li><label class="check"><input type="checkbox" data-input="doc" data-idx="' + i + '"' + (checked[i] ? ' checked' : '') + '><span>' + esc(d) + '</span></label></li>';
                }).join('') +
              '</ul>' +
              '<p class="fineprint">Sample procedure. Your college’s real steps can be added in js/data.js.</p>' +
            '</article>' +
          '</div>' +
          '<div class="col">' +
            '<section class="panel">' +
              (p.small
                ? '' +
                  '<h2>Send the request</h2>' +
                  '<div class="fields">' +
                    '<label class="field"><span>Your name</span><input type="text" data-input="name" maxlength="40" value="' + esc(state.name) + '"></label>' +
                    '<label class="field"><span>Details for the ' + esc(p.approver) + '</span><input type="text" data-input="purpose" maxlength="90" placeholder="e.g. Extending my library due date" value="' + esc(state.perm.purpose) + '"></label>' +
                  '</div>' +
                  (r
                    ? '<button type="button" class="btn btn--quiet" data-action="perm-reset">Start over</button>'
                    : '<button type="button" class="btn btn--wa" data-action="perm-send">Send request on WhatsApp</button>') +
                  '<div class="phones" id="phones">' + phonesHTML() + '</div>' +
                  (r ? '<p class="fineprint"><a class="link" href="' + waLink(r) + '" target="_blank" rel="noopener">Open this message in your own WhatsApp</a> (a real approval would need the WhatsApp Business API).</p>'
                     : '<p class="fineprint">This is a small request, so it can be sent and approved on WhatsApp.</p>')
                : '' +
                  '<h2>This is a major request</h2>' +
                  '<p>Major requests like this one need to be done in person — WhatsApp approval isn’t available for it.</p>' +
                  '<p class="fineprint">Visit the ' + esc(p.approver) + ' at the time and place above, with the documents checked off on the left.</p>') +
            '</section>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  function decide(status) {
    var r = state.perm.request;
    if (!r || r.status === 'approved' || r.status === 'declined') return;
    var proc = D.procedures.filter(function (p) { return p.id === r.procId; })[0] || {};
    r.status = status;
    r.decidedAt = clockTime();
    r.animate = true;
    if (status === 'approved') {
      addNote('Approved: ' + r.title + '. ' + (proc.nextStep || ''));
      toast('Approved. The student’s phone has been updated.');
    } else {
      addNote('Declined: ' + r.title + '. Ask the ' + r.approver + ' for the reason, then send it again.');
      toast('Declined. The student’s phone has been updated.');
    }
    save();
    render();
  }

  function approverAvailRow(name) {
    var st = facultyStatus(name);
    if (!st) return '';
    return '<div class="avail-card">' +
      '<strong>' + esc(name) + '</strong>' +
      '<div class="avail-row"><span class="pill ' + (st.available ? 'pill--ok' : 'pill--wait') + '">' + esc(st.text) + '</span>' +
      '<span>' + esc(st.cabin) + '</span></div>' +
    '</div>';
  }

  function viewApprovals() {
    var r = state.perm.request;
    return '' +
      '<section class="page">' +
        '<header class="page__head"><h1>Approvals</h1>' +
        '<p class="lede">Small requests students send on WhatsApp show up here for you to approve or decline. Major requests are handled when the student visits in person.</p></header>' +
        '<div class="split">' +
          '<div class="col">' +
            '<h2 class="h-sm">Your availability</h2>' +
            '<div class="proc-list">' +
              Object.keys(D.approvers).map(approverAvailRow).join('') +
            '</div>' +
            '<p class="fineprint">This is exactly what students see on the Permissions page, so they know when to expect a reply or when to come in person instead.</p>' +
          '</div>' +
          '<div class="col">' +
            '<section class="panel">' +
              '<h2>Latest WhatsApp request</h2>' +
              '<div class="phones"><figure class="phone-wrap"><figcaption>Your WhatsApp</figcaption>' + facultyPhone(r) + '</figure></div>' +
            '</section>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  /* ---------- Admin: equipment desk ---------- */
  function viewEqDesk() {
    var t = state.eq.ticket;
    var expired = t ? isTicketExpired(t) : false;
    return '' +
      '<section class="page">' +
        '<header class="page__head"><h1>Equipment desk</h1>' +
        '<p class="lede">Scan a student’s QR to record a borrowing. A QR stops working 2 hours after it’s generated.</p></header>' +
        '<section class="panel">' +
          '<h2>Waiting to be scanned</h2>' +
          (t
            ? '<div class="req">' +
                '<h4>' + esc(t.itemName) + ' — ' + esc(t.ref) + '</h4>' +
                '<p>Student: ' + esc(t.student) + ' · For ' + esc(t.hours) + ' hours · Collect from ' + esc(t.location) + '</p>' +
                (t.scanned
                  ? '<span class="pill pill--ok">Already recorded</span>'
                  : expired
                    ? '<span class="pill pill--no">QR expired — ask the student to generate a new one</span>'
                    : '<span class="pill pill--wait">Waiting for scan</span>') +
              '</div>'
            : '<p class="empty empty--box">No QR generated yet.</p>') +
          '<button type="button" class="btn btn--primary" data-action="eq-scan"' + (t && !t.scanned && !expired ? '' : ' disabled') + '>Scan the student’s QR</button>' +
        '</section>' +
        '<section class="panel panel--wide">' +
          '<h2>Borrow log</h2>' +
          logHTML() +
        '</section>' +
      '</section>';
  }

  /* ---------- Admin: library desk ---------- */
  function libDeskCard(b) {
    var a = availOf(b);
    return '<li class="item">' +
      '<div class="item__main">' +
        '<p class="item__type">' + esc(b.type) + '</p>' +
        '<h3>' + esc(b.title) + '</h3>' +
        '<p class="item__author">' + a + ' of ' + b.total + (b.type === 'Book' ? ' copies' : ' places') + ' available · ' + esc(b.location) + '</p>' +
      '</div>' +
      '<div class="item__status">' +
        (a < b.total
          ? '<button type="button" class="btn btn--small" data-action="lib-return" data-id="' + b.id + '">Mark one returned</button>'
          : '<span class="pill pill--ok">All in</span>') +
      '</div>' +
    '</li>';
  }
  function viewLibDesk() {
    return '' +
      '<section class="page">' +
        '<header class="page__head"><h1>Library desk</h1>' +
        '<p class="lede">Mark items as returned. Students who asked to be notified get an alert automatically.</p></header>' +
        '<ul class="items">' + D.books.map(libDeskCard).join('') + '</ul>' +
      '</section>';
  }

  /* ---------- Library ---------- */
  function availOf(b) {
    return state.lib.avail[b.id] !== undefined ? state.lib.avail[b.id] : b.available;
  }
  function norm(w) { return w.replace(/s$/, ''); }
  function filterBooks(q) {
    var tokens = q.toLowerCase().split(/\s+/).filter(Boolean).map(norm);
    if (!tokens.length) return D.books;
    return D.books.filter(function (b) {
      var hay = (b.title + ' ' + b.author + ' ' + b.type + ' ' + b.tags.join(' ')).toLowerCase();
      return tokens.every(function (t) { return hay.indexOf(t) !== -1; });
    });
  }

  function waLinkLib(b) {
    var msg = 'Library request\nItem: ' + b.title + '\nStudent: ' + (state.name || D.STUDENT.name);
    return 'https://wa.me/?text=' + encodeURIComponent(msg);
  }
  function bookCard(b) {
    var a = availOf(b);
    var notify = !!state.lib.notify[b.id];
    var status, detail, action = '';
    if (a > 0) {
      status = '<span class="pill pill--ok">Available</span>';
      detail = a + ' of ' + b.total + (b.type === 'Book' ? ' copies' : ' places') + ' free. Go to <strong>' + esc(b.location) + '</strong>.';
    } else {
      status = '<span class="pill pill--no">Not available</span>';
      detail = 'All ' + b.total + (b.type === 'Book' ? ' copies are' : ' places are') + ' taken.' + (b.nextReturn ? ' Earliest return: <strong>' + esc(b.nextReturn) + '</strong>.' : '');
      action = '<button type="button" class="btn btn--small' + (notify ? ' btn--on' : '') + '" data-action="lib-notify" data-id="' + b.id + '" aria-pressed="' + notify + '">' +
        (notify ? 'We’ll notify you. Tap to stop' : 'Notify me when available') + '</button>';
    }
    var wa = '<a class="btn btn--wa btn--small" href="' + waLinkLib(b) + '" target="_blank" rel="noopener">Ask on WhatsApp</a>';
    return '<li class="item">' +
      '<div class="item__main">' +
        '<p class="item__type">' + esc(b.type) + '</p>' +
        '<h3>' + esc(b.title) + '</h3>' +
        '<p class="item__author">' + esc(b.author) + '</p>' +
      '</div>' +
      '<div class="item__status">' + status + '<p>' + detail + '</p>' + action + wa + '</div>' +
    '</li>';
  }

  function libResults() {
    var list = filterBooks(state.lib.query);
    if (!list.length) {
      return '<p class="empty empty--box">Nothing matches “' + esc(state.lib.query) + '”. Try a title, an author or a topic such as “networks” or “algorithms”.</p>';
    }
    return '<p class="count-line">' + list.length + (list.length === 1 ? ' result' : ' results') + '</p><ul class="items">' + list.map(bookCard).join('') + '</ul>';
  }

  function viewLib() {
    return '' +
      '<section class="page">' +
        '<header class="page__head"><h1>Library</h1>' +
        '<p class="lede">Check a book or resource before you walk over. If every copy is out, ask to be notified.</p></header>' +
        echoLine() +
        '<form class="searchbar" id="lib-form" role="search">' +
          icon('search', 'searchbar__icon') +
          '<label class="sr-only" for="lib-q">Search the library</label>' +
          '<input id="lib-q" type="search" data-input="libq" placeholder="Search a title, author or topic" value="' + esc(state.lib.query) + '">' +
        '</form>' +
        '<div id="lib-results">' + libResults() + '</div>' +
        '<p class="fineprint">Sample catalog. Small requests like this can be sent straight to the library desk on WhatsApp.</p>' +
      '</section>';
  }

  /* ---------- Equipment ---------- */
  function curItem() {
    return D.equipment.filter(function (e) { return e.id === state.eq.itemId; })[0] || D.equipment[0];
  }
  function unitsFree(e) {
    var out = state.eq.log.filter(function (l) { return l.itemId === e.id && l.status === 'With student'; }).length;
    return e.units - out;
  }

  function ticketHTML(t) {
    var expired = isTicketExpired(t);
    return '<div class="ticket">' +
      '<div class="ticket__qr" id="qr-box"></div>' +
      '<div class="ticket__info">' +
        '<p class="ticket__ref">' + esc(t.ref) + '</p>' +
        '<h3>' + esc(t.itemName) + '</h3>' +
        '<dl>' +
          '<div><dt>Student</dt><dd>' + esc(t.student) + '</dd></div>' +
          '<div><dt>Collect from</dt><dd>' + esc(t.location) + '</dd></div>' +
          '<div><dt>For</dt><dd>' + esc(t.hours) + ' hours</dd></div>' +
        '</dl>' +
        (t.scanned
          ? '<span class="pill pill--ok">Recorded by the in-charge</span>'
          : expired
            ? '<span class="pill pill--no">QR expired — generate a new one</span>'
            : '<span class="pill pill--wait">Waiting for the in-charge to scan · valid for 2 hours</span>') +
      '</div>' +
    '</div>';
  }
  function waLinkEquip(it, hours) {
    var msg = 'Equipment request\nItem: ' + it.name + '\nFor: ' + hours + ' hours\nStudent: ' + (state.name || D.STUDENT.name);
    return 'https://wa.me/?text=' + encodeURIComponent(msg);
  }

  function logHTML() {
    var log = state.eq.log;
    if (!log.length) {
      return '<p class="empty empty--box">No borrowings yet. Generate a QR, then scan it as the faculty.</p>';
    }
    return '<div class="table-wrap"><table class="log">' +
      '<thead><tr><th scope="col">Ref</th><th scope="col">Student</th><th scope="col">Equipment</th><th scope="col">Out</th><th scope="col">Due</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead><tbody>' +
      log.map(function (l, i) {
        return '<tr>' +
          '<td>' + esc(l.ref) + '</td><td>' + esc(l.student) + '</td><td>' + esc(l.itemName) + '</td>' +
          '<td>' + esc(l.out) + '</td><td>' + esc(l.due) + '</td>' +
          '<td>' + (l.status === 'With student' ? '<span class="pill pill--wait">With student</span>' : '<span class="pill pill--ok">Returned ' + esc(l.back) + '</span>') + '</td>' +
          '<td>' + (l.status === 'With student' ? '<button type="button" class="btn btn--small" data-action="eq-return" data-idx="' + i + '">Mark returned</button>' : '') + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function myLog() {
    var name = state.name || D.STUDENT.name;
    return state.eq.log.filter(function (l) { return l.student === name; });
  }
  function myLogHTML() {
    var mine = myLog();
    if (!mine.length) return '';
    return '<h3 class="h-sm">Your borrow history</h3><div class="table-wrap"><table class="log">' +
      '<thead><tr><th scope="col">Ref</th><th scope="col">Equipment</th><th scope="col">Out</th><th scope="col">Due</th><th scope="col">Status</th></tr></thead><tbody>' +
      mine.map(function (l) {
        return '<tr><td>' + esc(l.ref) + '</td><td>' + esc(l.itemName) + '</td><td>' + esc(l.out) + '</td><td>' + esc(l.due) + '</td>' +
          '<td>' + (l.status === 'With student' ? '<span class="pill pill--wait">With you</span>' : '<span class="pill pill--ok">Returned ' + esc(l.back) + '</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function viewEquip() {
    var it = curItem();
    var t = state.eq.ticket;
    var free = unitsFree(it);
    var hours = Number(state.eq.hours);
    var isSmall = hours <= SMALL_MAX_HOURS;
    return '' +
      '<section class="page">' +
        '<header class="page__head"><h1>Lab equipment</h1>' +
        '<p class="lede">Generate a QR for what you need. The in-charge scans it, and the record is kept for you both.</p></header>' +
        echoLine() +
        '<div class="split">' +
          '<div class="col">' +
            '<h2 class="h-sm" id="eq-h">Choose equipment</h2>' +
            '<div class="eq-list" role="group" aria-labelledby="eq-h">' +
              D.equipment.map(function (e) {
                var on = e.id === it.id;
                var f = unitsFree(e);
                return '<button type="button" class="eq' + (on ? ' is-on' : '') + '" data-action="eq-select" data-id="' + e.id + '" aria-pressed="' + on + '">' +
                  '<span class="eq__name">' + esc(e.name) + '</span>' +
                  '<span class="eq__meta">' + esc(e.location) + ' · ' + esc(e.slot) + '</span>' +
                  '<span class="eq__meta">' + (f > 0 ? f + ' of ' + e.units + ' free' : 'All lent out') + ' · ' + esc(e.approval) + '</span>' +
                '</button>';
              }).join('') +
            '</div>' +
            myLogHTML() +
          '</div>' +
          '<div class="col">' +
            '<section class="panel">' +
              '<h2>Your borrow request</h2>' +
              '<div class="fields">' +
                '<label class="field"><span>Your name</span><input type="text" data-input="name" maxlength="40" value="' + esc(state.name) + '"></label>' +
                '<label class="field"><span>What is it for?</span><input type="text" data-input="eq-purpose" maxlength="90" placeholder="e.g. Signal analysis for my project" value="' + esc(state.eq.purpose) + '"></label>' +
                '<label class="field"><span id="eq-hours-label">For how long? <strong>' + hours + ' hour' + (hours === 1 ? '' : 's') + '</strong></span>' +
                  '<input type="range" min="1" max="24" step="1" data-input="eq-hours" value="' + hours + '"></label>' +
              '</div>' +
              '<button type="button" class="btn btn--primary" data-action="eq-generate"' + (free > 0 ? '' : ' disabled') + '>Generate QR for ' + esc(it.name) + '</button>' +
              (free > 0 ? '' : '<p class="fineprint">All units are lent out right now.</p>') +
              '<div id="eq-wa-block">' + (isSmall
                ? '<a class="btn btn--wa" href="' + waLinkEquip(it, hours) + '" target="_blank" rel="noopener">Send quick request on WhatsApp</a>'
                : '<p class="fineprint">Borrowing for more than ' + SMALL_MAX_HOURS + ' hours is a major request — visit the ' + esc(it.inCharge) + ' in person to sign it out. WhatsApp is only for shorter borrows.</p>') + '</div>' +
              (t ? ticketHTML(t) : '<p class="empty empty--box">Your QR slip appears here.</p>') +
            '</section>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  function drawQR() {
    var box = $('#qr-box');
    var t = state.eq.ticket;
    if (!box || !t) return;
    try {
      var qr = qrcode(0, 'M');
      qr.addData(t.payload);
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: 'QR code for ' + t.ref });
    } catch (e) {
      box.textContent = 'QR could not be drawn. Ref: ' + t.ref;
    }
  }

  /* ---------- Render ---------- */
  var STUDENT_VIEWS = { ask: viewAsk, perm: viewPerm, lib: viewLib, equip: viewEquip };
  var ADMIN_VIEWS = { appr: viewApprovals, eqdesk: viewEqDesk, libdesk: viewLibDesk };
  function render() {
    var bellWrap = document.querySelector('.bell-wrap');
    if (!state.auth.role) {
      $('#brand').textContent = D.APP_NAME;
      $('#tabs').innerHTML = '';
      renderWho();
      if (bellWrap) bellWrap.style.display = 'none';
      $('#main').innerHTML = viewLogin();
      return;
    }
    if (bellWrap) bellWrap.style.display = '';
    renderHeader();
    var views = state.auth.role === 'admin' ? ADMIN_VIEWS : STUDENT_VIEWS;
    var fn = views[state.tab] || views[Object.keys(views)[0]];
    $('#main').innerHTML = fn();
    if (state.auth.role === 'student' && state.tab === 'equip') drawQR();
    clearAnimate();
  }
  function goTop() {
    window.scrollTo(0, 0);
    $('#main').focus({ preventScroll: true });
  }

  /* ---------- Actions (click) ---------- */
  var ACTIONS = {
    go: function (el) {
      if (!state.auth.role) return;
      var tab = el.dataset.tab;
      var valid = currentTabs().some(function (t) { return t.id === tab; });
      state.tab = valid ? tab : currentTabs()[0].id;
      state.bell = false;
      state.echo = '';
      state.askMsg = '';
      save();
      render();
      goTop();
    },
    login: function (el) {
      var role = el.dataset.role;
      var demo = role === 'admin' ? D.DEMO_ADMIN : D.DEMO_STUDENT;
      state.auth = { role: role, name: demo.name };
      state.name = demo.name;
      state.tab = role === 'admin' ? 'appr' : 'ask';
      save();
      render();
      goTop();
    },
    logout: function () {
      state.auth = { role: null, name: '' };
      save();
      render();
      goTop();
    },
    'ask-example': function (el) {
      submitAsk(el.dataset.text);
    },
    'toggle-bell': function () {
      state.bell = !state.bell;
      renderHeader();
    },
    'read-all': function () {
      state.notes.forEach(function (n) { n.read = true; });
      save();
      renderHeader();
    },
    'reset-demo': function () {
      state = defaultState();
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
      render();
      goTop();
      toast('Demo data reset.');
    },

    /* permissions */
    'perm-select': function (el) {
      state.perm.procId = el.dataset.id;
      save();
      render();
    },
    'perm-send': function () {
      var p = curProc();
      state.perm.request = {
        procId: p.id,
        title: p.title,
        approver: p.approver,
        name: state.name || D.STUDENT.name,
        purpose: state.perm.purpose.trim(),
        docsReady: docsReady(p),
        docsTotal: p.documents.length,
        status: 'sent',
        sentAt: clockTime(),
        decidedAt: '',
        animate: false
      };
      save();
      render();
      toast('Request sent to the ' + p.approver + '.');
      setTimeout(function () {
        var r = state.perm.request;
        if (r && r.status === 'sent') {
          r.status = 'delivered';
          save();
          if (state.tab === 'perm') refreshPhones();
        }
      }, 900);
    },
    'perm-reset': function () {
      state.perm.request = null;
      save();
      render();
    },
    'fac-approve': function () { decide('approved'); },
    'fac-decline': function () { decide('declined'); },

    /* library */
    'lib-notify': function (el) {
      var id = el.dataset.id;
      var on = !state.lib.notify[id];
      state.lib.notify[id] = on;
      var b = D.books.filter(function (x) { return x.id === id; })[0];
      save();
      $('#lib-results').innerHTML = libResults();
      toast(on ? 'We’ll alert you when “' + b.title + '” is available.' : 'Alert turned off for “' + b.title + '”.');
    },
    'lib-return': function (el) {
      var b = D.books.filter(function (x) { return x.id === el.dataset.id; })[0];
      var before = availOf(b);
      if (before >= b.total) return;
      state.lib.avail[b.id] = before + 1;
      if (before === 0 && state.lib.notify[b.id]) {
        state.lib.notify[b.id] = false;
        addNote('Good news: “' + b.title + '” is now available. Go to ' + b.location + '.');
        toast('Alert: “' + b.title + '” is now available.');
      } else {
        toast('One returned: “' + b.title + '”.');
      }
      save();
      renderHeader();
      $('#lib-results').innerHTML = libResults();
    },

    /* equipment */
    'eq-select': function (el) {
      state.eq.itemId = el.dataset.id;
      save();
      render();
    },
    'eq-generate': function () {
      var it = curItem();
      if (unitsFree(it) < 1) return;
      state.eq.counter += 1;
      var ref = 'EQ-' + state.eq.counter;
      var student = state.name || D.STUDENT.name;
      var payload = JSON.stringify({ ref: ref, item: it.name, student: student, hours: Number(state.eq.hours), at: new Date().toISOString() });
      state.eq.ticket = {
        ref: ref, itemId: it.id, itemName: it.name, location: it.location, inCharge: it.inCharge,
        student: student, hours: state.eq.hours, purpose: state.eq.purpose.trim(), payload: payload, scanned: false,
        generatedAt: Date.now()
      };
      save();
      render();
      toast('QR ready. Show it to the ' + it.inCharge + '. It’s valid for 2 hours.');
    },
    'eq-scan': function () {
      var t = state.eq.ticket;
      if (!t || t.scanned || isTicketExpired(t)) return;
      var now = new Date();
      var due = new Date(now.getTime() + Number(t.hours) * 3600000);
      state.eq.log.unshift({
        ref: t.ref, itemId: t.itemId, itemName: t.itemName, student: t.student,
        out: clockTime(now), due: dueLabel(due), status: 'With student', back: ''
      });
      t.scanned = true;
      addNote('Recorded: you borrowed ' + t.itemName + ' from ' + t.location + '. Due back ' + dueLabel(due) + '.');
      save();
      render();
      toast('Scanned. The borrowing is recorded with the faculty.');
    },
    'eq-return': function (el) {
      var l = state.eq.log[Number(el.dataset.idx)];
      if (!l || l.status !== 'With student') return;
      l.status = 'Returned';
      l.back = clockTime();
      addNote('Returned: ' + l.itemName + '. Thank you.');
      save();
      render();
      toast('Marked as returned.');
    }
  };

  /* ---------- Inputs ---------- */
  var INPUTS = {
    ask: function (el) { state.askText = el.value; save(); },
    name: function (el) { state.name = el.value; save(); },
    purpose: function (el) { state.perm.purpose = el.value; save(); },
    doc: function (el) {
      var p = curProc();
      var c = state.perm.checked[p.id] || (state.perm.checked[p.id] = {});
      c[el.dataset.idx] = el.checked;
      save();
      var out = $('#doc-count');
      if (out) out.textContent = docsReady(p) + ' of ' + p.documents.length + ' ready';
    },
    libq: function (el) {
      state.lib.query = el.value;
      save();
      $('#lib-results').innerHTML = libResults();
    },
    'eq-purpose': function (el) { state.eq.purpose = el.value; save(); },
    'eq-hours': function (el) {
      var h = Math.min(24, Math.max(1, Number(el.value) || 1));
      state.eq.hours = String(h);
      save();
      var label = $('#eq-hours-label');
      if (label) label.innerHTML = 'For how long? <strong>' + h + ' hour' + (h === 1 ? '' : 's') + '</strong>';
      var block = $('#eq-wa-block');
      if (block) {
        var it = curItem();
        block.innerHTML = h <= SMALL_MAX_HOURS
          ? '<a class="btn btn--wa" href="' + waLinkEquip(it, h) + '" target="_blank" rel="noopener">Send quick request on WhatsApp</a>'
          : '<p class="fineprint">Borrowing for more than ' + SMALL_MAX_HOURS + ' hours is a major request — visit the ' + esc(it.inCharge) + ' in person to sign it out. WhatsApp is only for shorter borrows.</p>';
      }
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (state.bell && !e.target.closest('.bell-wrap')) {
      state.bell = false;
      renderHeader();
    }
    if (!el) return;
    if (el.tagName === 'A') e.preventDefault();
    var fn = ACTIONS[el.dataset.action];
    if (fn) fn(el, e);
  });
  function onInput(e) {
    var key = e.target.dataset && e.target.dataset.input;
    if (key && INPUTS[key]) INPUTS[key](e.target);
  }
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'ask-form') submitAsk($('#ask-input').value);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.bell) {
      state.bell = false;
      renderHeader();
      $('#bell').focus();
    }
  });

  /* Tidy up a request that was mid-flight when the page was refreshed */
  (function settle() {
    var r = state.perm.request;
    if (r && r.status === 'sent') { r.status = 'delivered'; save(); }
  })();

  render();
})();
