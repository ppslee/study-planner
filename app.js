// ──────────────────────────────────────────
// 세무사 시험 플래너 - 핵심 로직
// ──────────────────────────────────────────

// ── 상수 ──
const EXAM_DATE = new Date('2027-04-24');

const SUBJECTS = [
  '법인세법', '소득세법', '부가가치세법',
  '국기법', '국징법', '국제조세법',
  '재무회계', '원가회계', '재정학', '행정소송법'
];

const SUBJECT_COLORS = [
  '#E53935', '#D81B60', '#8E24AA',
  '#1E88E5', '#00ACC1', '#00897B',
  '#43A047', '#7CB342', '#F4511E', '#6D4C41'
];

const METHODS = ['강의', '교재', '문제풀이', '복습', '모의고사', '오답정리'];

// ── 기본 설정 ──
const DEFAULT_SETTINGS = {
  dailyGoal: 8,
  weights: {
    '법인세법': 12, '소득세법': 12, '부가가치세법': 10,
    '국기법': 10, '국징법': 8, '국제조세법': 8,
    '재무회계': 15, '원가회계': 10, '재정학': 8, '행정소송법': 7
  }
};

// ──────────────────────────────────────────
// 데이터 관리
// ──────────────────────────────────────────

function getSettings() {
  const s = localStorage.getItem('planner_settings');
  return s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function saveSettings(settings) {
  localStorage.setItem('planner_settings', JSON.stringify(settings));
}

function getRecords() {
  const r = localStorage.getItem('planner_records');
  return r ? JSON.parse(r) : [];
}

function saveRecords(records) {
  localStorage.setItem('planner_records', JSON.stringify(records));
}

function addRecord(record) {
  const records = getRecords();
  record.id = Date.now();
  records.push(record);
  saveRecords(records);
}

function deleteRecord(id) {
  const records = getRecords().filter(r => r.id !== id);
  saveRecords(records);
}

// ──────────────────────────────────────────
// D-Day 계산
// ──────────────────────────────────────────

function getDDay() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(EXAM_DATE);
  exam.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function getDDayText() {
  const d = getDDay();
  if (d > 0) return `D-${d}`;
  if (d === 0) return 'D-Day!';
  return `D+${Math.abs(d)}`;
}

// ──────────────────────────────────────────
// 날짜 유틸
// ──────────────────────────────────────────

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekRange(offset = 0) {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: dateToStr(monday),
    end: dateToStr(sunday)
  };
}

function getMonthRange(offset = 0) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + offset;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: dateToStr(start), end: dateToStr(end) };
}

function getQuarterRange(offset = 0) {
  const today = new Date();
  const quarter = Math.floor(today.getMonth() / 3) + offset;
  const year = today.getFullYear() + Math.floor(quarter / 4);
  const q = ((quarter % 4) + 4) % 4;
  const start = new Date(year, q * 3, 1);
  const end = new Date(year, q * 3 + 3, 0);
  return { start: dateToStr(start), end: dateToStr(end) };
}

function getHalfRange(offset = 0) {
  const today = new Date();
  const half = Math.floor(today.getMonth() / 6) + offset;
  const year = today.getFullYear() + Math.floor(half / 2);
  const h = ((half % 2) + 2) % 2;
  const start = new Date(year, h * 6, 1);
  const end = new Date(year, h * 6 + 6, 0);
  return { start: dateToStr(start), end: dateToStr(end) };
}

function getYearRange(offset = 0) {
  const year = new Date().getFullYear() + offset;
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`
  };
}

function dateToStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function isInRange(dateStr, start, end) {
  return dateStr >= start && dateStr <= end;
}

// ──────────────────────────────────────────
// 통계 계산
// ──────────────────────────────────────────

function calcStats(records, start, end) {
  const settings = getSettings();
  const filtered = records.filter(r => isInRange(r.date, start, end));

  // 날짜 수
  const days = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

  // 전체 시간
  const totalHours = filtered.reduce((sum, r) => sum + Number(r.hours), 0);

  // 전체 목표 시간
  const totalGoal = settings.dailyGoal * days;

  // 과목별 통계
  const subjectStats = {};
  SUBJECTS.forEach(sub => {
    const subRecords = filtered.filter(r => r.subject === sub);
    const done = subRecords.reduce((sum, r) => sum + Number(r.hours), 0);

    // 과목별 목표 = 전체목표 × 비중%
    const weight = settings.weights[sub] || 10;
    const goal = totalGoal * (weight / 100);
    const shortage = Math.max(0, goal - done);
    const pct = goal > 0 ? Math.min(100, Math.round(done / goal * 100)) : 0;

    subjectStats[sub] = { done, goal, shortage, pct, weight };
  });

  return { totalHours, totalGoal, subjectStats, days, filtered };
}

// ──────────────────────────────────────────
// 히트맵 생성
// ──────────────────────────────────────────

function buildHeatmap(containerId) {
  const records = getRecords();
  const container = document.getElementById(containerId);
  if (!container) return;

  // 날짜별 합계
  const dayMap = {};
  records.forEach(r => {
    dayMap[r.date] = (dayMap[r.date] || 0) + Number(r.hours);
  });

  // 최근 1년
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 1);
  start.setDate(start.getDate() - start.getDay() + 1); // 월요일 시작

  const cells = [];
  const cur = new Date(start);
  while (cur <= today) {
    const str = dateToStr(cur);
    const h = dayMap[str] || 0;
    let cls = 'heatmap-cell';
    if (h > 0 && h < 3) cls += ' h1';
    else if (h >= 3 && h < 5) cls += ' h2';
    else if (h >= 5 && h < 8) cls += ' h3';
    else if (h >= 8) cls += ' h4';

    const cell = document.createElement('div');
    cell.className = cls;
    cell.title = `${str}: ${h}시간`;
    cells.push(cell);
    cur.setDate(cur.getDate() + 1);
  }

  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';
  cells.forEach(c => grid.appendChild(c));

  container.innerHTML = '';
  container.appendChild(grid);

  // 범례
  const legend = document.createElement('div');
  legend.className = 'heatmap-legend';
  legend.innerHTML = `
    Less
    <div class="legend-cell" style="background:#EEEEEE"></div>
    <div class="legend-cell" style="background:#C8E6C9"></div>
    <div class="legend-cell" style="background:#81C784"></div>
    <div class="legend-cell" style="background:#4CAF50"></div>
    <div class="legend-cell" style="background:#2E7D32"></div>
    More
  `;
  container.appendChild(legend);
}

// ──────────────────────────────────────────
// 레이더 차트 (SVG)
// ──────────────────────────────────────────

function buildRadar(canvasId, stats, period) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const size = Math.min(canvas.offsetWidth || 300, 300);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const n = SUBJECTS.length;

  // SVG 생성
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  // 각도 계산
  const angle = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pt = (i, ratio) => ({
    x: cx + r * ratio * Math.cos(angle(i)),
    y: cy + r * ratio * Math.sin(angle(i))
  });

  // 배경 다각형 (5단계)
  [0.2, 0.4, 0.6, 0.8, 1.0].forEach(ratio => {
    const points = SUBJECTS.map((_, i) => {
      const p = pt(i, ratio);
      return `${p.x},${p.y}`;
    }).join(' ');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', points);
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', '#E0E0E0');
    poly.setAttribute('stroke-width', '1');
    svg.appendChild(poly);
  });

  // 축선
  SUBJECTS.forEach((_, i) => {
    const p = pt(i, 1);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', cx);
    line.setAttribute('y1', cy);
    line.setAttribute('x2', p.x);
    line.setAttribute('y2', p.y);
    line.setAttribute('stroke', '#E0E0E0');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  });

  // 목표 다각형
  const goalPoints = SUBJECTS.map((sub, i) => {
    const p = pt(i, 1.0);
    return `${p.x},${p.y}`;
  }).join(' ');
  const goalPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  goalPoly.setAttribute('points', goalPoints);
  goalPoly.setAttribute('fill', 'rgba(26,35,126,0.05)');
  goalPoly.setAttribute('stroke', '#C5CAE9');
  goalPoly.setAttribute('stroke-width', '1.5');
  goalPoly.setAttribute('stroke-dasharray', '4,3');
  svg.appendChild(goalPoly);

  // 실적 다각형
  const dataPoints = SUBJECTS.map((sub, i) => {
    const s = stats.subjectStats[sub];
    const ratio = s ? Math.min(1, s.pct / 100) : 0;
    const p = pt(i, ratio);
    return `${p.x},${p.y}`;
  }).join(' ');
  const dataPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  dataPoly.setAttribute('points', dataPoints);
  dataPoly.setAttribute('fill', 'rgba(76,175,80,0.3)');
  dataPoly.setAttribute('stroke', '#4CAF50');
  dataPoly.setAttribute('stroke-width', '2');
  svg.appendChild(dataPoly);

  // 데이터 포인트
  SUBJECTS.forEach((sub, i) => {
    const s = stats.subjectStats[sub];
    const ratio = s ? Math.min(1, s.pct / 100) : 0;
    const p = pt(i, ratio);
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x);
    circle.setAttribute('cy', p.y);
    circle.setAttribute('r', '4');
    circle.setAttribute('fill', '#4CAF50');
    circle.setAttribute('stroke', 'white');
    circle.setAttribute('stroke-width', '1.5');
    svg.appendChild(circle);
  });

  // 라벨
  SUBJECTS.forEach((sub, i) => {
    const p = pt(i, 1.22);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', p.x);
    text.setAttribute('y', p.y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-family', 'Malgun Gothic, sans-serif');
    text.setAttribute('fill', '#555');
    text.textContent = sub;
    svg.appendChild(text);
  });

  canvas.innerHTML = '';
  canvas.appendChild(svg);
}

// ──────────────────────────────────────────
// 과목별 현황 바 렌더링
// ──────────────────────────────────────────

function renderSubjectBars(containerId, stats) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  SUBJECTS.forEach((sub, i) => {
    const s = stats.subjectStats[sub];
    const color = SUBJECT_COLORS[i];
    const pct = s.pct;
    const done = s.done.toFixed(1);
    const goal = s.goal.toFixed(1);
    const shortage = s.shortage.toFixed(1);

    const item = document.createElement('div');
    item.className = 'subject-item';
    item.innerHTML = `
      <div class="subject-header">
        <span class="subject-name">${sub}</span>
        <span class="subject-stats">
          <span class="${parseFloat(shortage) > 0 ? 'shortage' : 'done'}">
            ${parseFloat(shortage) > 0 ? `부족 ${shortage}h` : '✅ 달성'}
          </span>
          &nbsp;${done}h / ${goal}h
        </span>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar"
             style="width:${pct}%; background:${color}">
        </div>
      </div>
      <div class="progress-pct">${pct}%</div>
    `;
    container.appendChild(item);
  });
}

// ──────────────────────────────────────────
// 막대 차트 렌더링
// ──────────────────────────────────────────

function renderBarChart(containerId, stats) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const maxHours = Math.max(
    ...SUBJECTS.map(s => stats.subjectStats[s].goal),
    1
  );

  container.innerHTML = '';
  SUBJECTS.forEach((sub, i) => {
    const s = stats.subjectStats[sub];
    const color = SUBJECT_COLORS[i];
    const donePct = (s.done / maxHours * 100).toFixed(1);
    const goalPct = (s.goal / maxHours * 100).toFixed(1);

    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-label">${sub}</div>
      <div class="bar-bg">
        <div class="bar-fill"
             style="width:${donePct}%; background:${color}; opacity:0.85">
        </div>
        <div class="bar-target-line"
             style="left:${goalPct}%">
        </div>
      </div>
      <div class="bar-val">${s.done.toFixed(1)}h</div>
    `;
    container.appendChild(row);
  });

  // 범례
  const legend = document.createElement('div');
  legend.style.cssText = 'font-size:0.75rem; color:#888; text-align:right; margin-top:6px;';
  legend.innerHTML = '빨간 선 = 목표';
  container.appendChild(legend);
}

// ──────────────────────────────────────────
// 분석 테이블 렌더링
// ──────────────────────────────────────────

function renderAnalysisTable(containerId, stats, periodLabel) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = `
    <table class="analysis-table">
      <thead>
        <tr>
          <th>과목</th>
          <th>공부시간</th>
          <th>목표시간</th>
          <th>달성률</th>
          <th>부족/초과</th>
        </tr>
      </thead>
      <tbody>
  `;

  SUBJECTS.forEach(sub => {
    const s = stats.subjectStats[sub];
    const done = s.done.toFixed(1);
    const goal = s.goal.toFixed(1);
    const pct = s.pct;
    const diff = (s.done - s.goal).toFixed(1);
    const diffClass = parseFloat(diff) >= 0 ? 'badge-over' : 'badge-short';
    const diffText = parseFloat(diff) >= 0 ? `+${diff}h` : `${diff}h`;

    html += `
      <tr>
        <td style="font-weight:bold; text-align:left;">${sub}</td>
        <td>${done}h</td>
        <td>${goal}h</td>
        <td class="${pct >= 100 ? 'badge-done' : pct >= 70 ? '' : 'badge-short'}">${pct}%</td>
        <td class="${diffClass}">${diffText}</td>
      </tr>
    `;
  });

  const totalDone = stats.totalHours.toFixed(1);
  const totalGoal = stats.totalGoal.toFixed(1);
  const totalPct = stats.totalGoal > 0
    ? Math.round(stats.totalHours / stats.totalGoal * 100)
    : 0;

  html += `
      </tbody>
      <tfoot>
        <tr style="background:#F3F4FF; font-weight:bold;">
          <td>합계</td>
          <td>${totalDone}h</td>
          <td>${totalGoal}h</td>
          <td class="${totalPct >= 100 ? 'badge-done' : ''}">${totalPct}%</td>
          <td class="${totalDone >= totalGoal ? 'badge-over' : 'badge-short'}">
            ${(stats.totalHours - stats.totalGoal).toFixed(1)}h
          </td>
        </tr>
      </tfoot>
    </table>
  `;

  container.innerHTML = html;
}

// ──────────────────────────────────────────
// 오늘의 기록 렌더링
// ──────────────────────────────────────────

function renderTodayRecords(containerId, onDelete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const today = getTodayStr();
  const records = getRecords().filter(r => r.date === today);

  if (!records.length) {
    container.innerHTML = '<div style="text-align:center; color:#aaa; padding:16px;">오늘 기록이 없습니다</div>';
    return;
  }

  container.innerHTML = '';
  records.slice().reverse().forEach(r => {
    const item = document.createElement('div');
    item.className = 'record-item';
    item.innerHTML = `
      <div class="record-header">
        <span class="record-subject">${r.subject}</span>
        <span class="record-time">${r.hours}시간</span>
      </div>
      <div class="record-detail">
        📚 ${r.methods || '-'} &nbsp;|&nbsp; 📖 ${r.range || '-'}
        ${r.memo ? `<br>💬 ${r.memo}` : ''}
      </div>
      <button class="btn-delete" onclick="deleteRecordAndRefresh(${r.id})">🗑️ 삭제</button>
    `;
    container.appendChild(item);
  });
}

// ──────────────────────────────────────────
// 데이터 내보내기 / 불러오기
// ──────────────────────────────────────────

function exportData() {
  const data = {
    records: getRecords(),
    settings: getSettings(),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `planner_backup_${getTodayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 데이터를 내보냈습니다!');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.records) saveRecords(data.records);
      if (data.settings) saveSettings(data.settings);
      showToast('📤 데이터를 불러왔습니다!');
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      showToast('❌ 파일 형식이 올바르지 않습니다');
    }
  };
  reader.readAsText(file);
}

// ──────────────────────────────────────────
// 토스트 메시지
// ──────────────────────────────────────────

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ──────────────────────────────────────────
// 전역 삭제 함수
// ──────────────────────────────────────────

function deleteRecordAndRefresh(id) {
  if (!confirm('이 기록을 삭제하시겠어요?')) return;
  deleteRecord(id);
  showToast('🗑️ 삭제되었습니다');
  if (typeof refreshPage === 'function') refreshPage();
}

// ──────────────────────────────────────────
// 기간별 범위 라벨
// ──────────────────────────────────────────

function getPeriodRange(period) {
  switch(period) {
    case 'week':    return getWeekRange();
    case 'month':   return getMonthRange();
    case 'quarter': return getQuarterRange();
    case 'half':    return getHalfRange();
    case 'year':    return getYearRange();
    default:        return getWeekRange();
  }
}

function getPeriodLabel(period) {
  const r = getPeriodRange(period);
  return `${r.start} ~ ${r.end}`;
}
