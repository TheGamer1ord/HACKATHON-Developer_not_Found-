(function () {
  const STORAGE_KEY_V1 = 'daily-checkin-dates-v1'; // old: Set<string>
  const STORAGE_KEY_V2 = 'daily-checkin-entries-v2'; // new: { [dateIso]: number }

  /** @typedef {{ [dateIso: string]: number }} EntriesMap */
  /** @type {EntriesMap} */
  let entries = {};
  /** @type {FullCalendar.Calendar | null} */
  let calendar = null;
  /** @type {{open:(dateIso:string)=>void, close:()=>void, setSelected:(n:number|null)=>void, getSelected:()=>number|null}} */
  let moodModal;

  function isoDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function loadFromStorage() {
    // Prefer V2
    try {
      const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
      if (rawV2) {
        const obj = JSON.parse(rawV2);
        if (obj && typeof obj === 'object') return obj;
      }
    } catch (_) {}
    // Migrate V1 if exists
    try {
      const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
      if (rawV1) {
        const arr = JSON.parse(rawV1);
        if (Array.isArray(arr)) {
          /** @type {EntriesMap} */
          const migrated = {};
          for (const d of arr) migrated[d] = 5; // default mid mood
          // Save to V2 and clear V1
          localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
          localStorage.removeItem(STORAGE_KEY_V1);
          return migrated;
        }
      }
    } catch (_) {}
    return {};
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(entries));
    } catch (_) {}
  }

  function isTodayChecked() {
    return Object.prototype.hasOwnProperty.call(entries, isoDateString(new Date()));
  }

  function calculateStreaks() {
    // Current streak: consecutive days ending today
    let currentStreak = 0;
    let bestStreak = 0;
    const dates = Object.keys(entries);
    if (dates.length === 0) return { currentStreak, bestStreak };

    // Build a sorted array of timestamps (ms) for fast traversal
    const daysMs = dates
      .map(d => new Date(d + 'T00:00:00').getTime())
      .sort((a, b) => a - b);

    // Compute best streak by scanning
    let streak = 1;
    for (let i = 1; i < daysMs.length; i++) {
      const prev = daysMs[i - 1];
      const cur = daysMs[i];
      if (cur - prev === 24 * 60 * 60 * 1000) {
        streak += 1;
      } else {
        if (streak > bestStreak) bestStreak = streak;
        streak = 1;
      }
    }
    if (streak > bestStreak) bestStreak = streak;

    // Compute current streak ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let dayCursor = today.getTime();
    while (Object.prototype.hasOwnProperty.call(entries, isoDateString(new Date(dayCursor)))) {
      currentStreak += 1;
      dayCursor -= 24 * 60 * 60 * 1000;
    }

    return { currentStreak, bestStreak };
  }

  function updateSummary() {
    const todayText = document.getElementById('summary-today');
    const streakEl = document.getElementById('summary-streak');
    const bestStreakEl = document.getElementById('summary-best-streak');
    if (!todayText || !streakEl || !bestStreakEl) return;

    todayText.textContent = isTodayChecked() ? 'Checked in' : 'Not checked in';
    const { currentStreak, bestStreak } = calculateStreaks();
    streakEl.textContent = String(currentStreak);
    bestStreakEl.textContent = String(bestStreak);

    const btnCheckToday = document.getElementById('btn-check-today');
    if (btnCheckToday) {
      btnCheckToday.textContent = isTodayChecked() ? 'Undo Today' : 'Check-in Today';
    }
  }

  function moodToColor(mood) {
    // 0 (green) -> 10 (red) gradient
    const clamped = Math.max(0, Math.min(10, mood));
    const t = clamped / 10;
    const r = Math.round(46 + (255 - 46) * t); // 0x2e to 0xff
    const g = Math.round(204 + (92 - 204) * t); // 0xcc to 0x5c
    const b = Math.round(113 + (92 - 113) * t); // 0x71 to 0x5c
    return `rgb(${r}, ${g}, ${b})`;
  }

  function moodFace(mood) {
    const faces = [
      '😀', // 0 extremely happy
      '🙂', // 1 very mild
      '😊', // 2 comforting
      '😌', // 3 tolerable
      '😐', // 4 distressing begins
      '😕', // 5 very distressing
      '🙁', // 6 intense
      '☹️', // 7 very intense
      '😣', // 8 utterly horrible
      '😫', // 9 excruciating
      '😭'  // 10 unimaginable suffering
    ];
    const idx = Math.max(0, Math.min(10, Math.round(mood)));
    return faces[idx];
  }
  function moodMessage(mood) {
  if (mood >= 10) return "please give your address now, so we can reach you";
  if (mood >= 9) return "call 911 or visit emergency care now";
  if (mood >= 8) return "share your location You may need help";
  if (mood >= 7) return "Condition worsening — tell someone nearby";
  if (mood >= 6) return "rest more and check your temperature.";
  if (mood >= 5) return "take medicine if needed and stay warm";
  if (mood >= 4) return "rest properly and monitor symptoms";
  if (mood >= 3) return "take a break and avoid stress";
  if (mood >= 2) return "keep staying active and hydrated";
  return "Feeling great 😄";
}


  function toEvents() {
    return Object.keys(entries).map(dateIso => ({
      id: `checkin-${dateIso}`,
      title: `${moodFace(entries[dateIso])} ${entries[dateIso]}`,
      start: dateIso,
      allDay: true,
      display: 'background',
      classNames: ['checkin-event'],
      color: moodToColor(entries[dateIso])
    }));
  }

  function rerenderEvents() {
    if (!calendar) return;
    calendar.removeAllEvents();
    calendar.addEventSource(toEvents());
  }

  function openMoodForDate(dateIso) {
    moodModal.open(dateIso);
  }

  function attachControls() {
    const btnToday = document.getElementById('btn-today');
    if (btnToday) {
      btnToday.addEventListener('click', () => {
        if (calendar) calendar.today();
      });
    }

    const btnCheckToday = document.getElementById('btn-check-today');
    if (btnCheckToday) {
      btnCheckToday.addEventListener('click', () => {
        openMoodForDate(isoDateString(new Date()));
      });
    }

    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (Object.keys(entries).length === 0) return;
        const ok = confirm('Clear all check-ins?');
        if (!ok) return;
        entries = {};
        saveToStorage();
        rerenderEvents();
        updateSummary();
      });
    }

    const btnExport = document.getElementById('btn-export');
    const fileImport = document.getElementById('file-import');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const data = JSON.stringify(entries, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'checkins.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
    if (fileImport) {
      fileImport.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            // old format: list of dates
            /** @type {EntriesMap} */
            const m = {};
            for (const s of parsed) if (/\d{4}-\d{2}-\d{2}/.test(s)) m[s] = 5;
            entries = m;
          } else if (parsed && typeof parsed === 'object') {
            entries = {};
            for (const [k, v] of Object.entries(parsed)) {
              if (/\d{4}-\d{2}-\d{2}/.test(k)) entries[k] = Number(v);
            }
          } else {
            throw new Error('Invalid file');
          }
          saveToStorage();
          rerenderEvents();
          updateSummary();
        } catch (err) {
          alert('Import failed: ' + (err && err.message ? err.message : 'Unknown error'));
        } finally {
          e.target.value = '';
        }
      });
    }
  }

  function setupMoodModal() {
    const modal = document.getElementById('mood-modal');
    const grid = document.getElementById('mood-grid');
    const removeBtn = document.getElementById('mood-remove');
    const cancelEls = modal ? modal.querySelectorAll('[data-dismiss]') : [];
    if (!modal || !grid || !removeBtn) return;

    /** @type {string|null} */
    let activeDateIso = null;
    /** @type {number|null} */
    let selected = null;

    function renderButtons() {
      grid.innerHTML = '';
      for (let i = 0; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mood-btn';
        const face = document.createElement('span');
        face.className = 'mood-face';
        face.textContent = moodFace(i);
        const num = document.createElement('span');
        num.className = 'mood-num';
        num.textContent = String(i);
        btn.appendChild(face);
        btn.appendChild(num);
        btn.style.background = moodToColor(i);
        btn.setAttribute('aria-pressed', selected === i ? 'true' : 'false');
        btn.addEventListener('click', () => {
          selected = i;
          if (activeDateIso) {
            entries[activeDateIso] = i;
            saveToStorage();
            rerenderEvents();
            updateSummary();
          }
          api.close();
        });
        grid.appendChild(btn);
      }
      const label = document.createElement('div');
      label.className = 'mood-label';
      label.textContent = '0 = best, 10 = worst';
      grid.appendChild(label);
    }

    function open(dateIso) {
      activeDateIso = dateIso;
      selected = Object.prototype.hasOwnProperty.call(entries, dateIso) ? entries[dateIso] : null;
      renderButtons();
      modal.setAttribute('aria-hidden', 'false');
    }
    function close() {
      modal.setAttribute('aria-hidden', 'true');
      activeDateIso = null; selected = null;
    }

    removeBtn.addEventListener('click', () => {
      if (!activeDateIso) return;
      delete entries[activeDateIso];
      saveToStorage();
      rerenderEvents();
      updateSummary();
      close();
    });
    cancelEls.forEach(el => el.addEventListener('click', () => close()));

    const api = {
      open,
      close,
      setSelected: (n) => { selected = n; },
      getSelected: () => selected
    };
    moodModal = api;
  }

  function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

   calendar = new FullCalendar.Calendar(calendarEl, {
  initialView: 'dayGridMonth',
  height: 'auto',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,dayGridWeek,dayGridDay'
  },
  fixedWeekCount: false,
  firstDay: 1,
  selectable: true,
  dayMaxEventRows: 1,
  events: toEvents(),
  dateClick: (info) => {
    const dateIso = info.dateStr;
    openMoodForDate(dateIso);
  },
  eventMouseEnter: function(info) {
    const mood = entries[info.event.startStr];
    if (mood === undefined) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'mood-tooltip';
    tooltip.innerHTML = `${moodFace(mood)} Mood Level: <strong>${mood}</strong><br><small>${moodMessage(mood)}</small>`;
    document.body.appendChild(tooltip);

    const moveTooltip = (e) => {
      tooltip.style.left = e.pageX + 12 + 'px';
      tooltip.style.top = e.pageY + 12 + 'px';
    };
    moveTooltip(info.jsEvent);
    tooltip.classList.add('visible');
    document.addEventListener('mousemove', moveTooltip);

    info.el.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
      setTimeout(() => tooltip.remove(), 150);
      document.removeEventListener('mousemove', moveTooltip);
    }, { once: true });
  }
});

    calendar.render();
  }

  function main() {
    entries = loadFromStorage();
    initCalendar();
    attachControls();
    setupMoodModal();
    updateSummary();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();


