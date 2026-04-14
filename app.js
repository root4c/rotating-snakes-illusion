(function () {
  const cfg = window.EXPERIMENT_CONFIG;
  if (!cfg) {
    alert('config.js를 찾을 수 없습니다.');
    return;
  }

  const screens = {
    start: document.getElementById('screen-start'),
    trial: document.getElementById('screen-trial'),
    rating: document.getElementById('screen-rating'),
    finish: document.getElementById('screen-finish')
  };

  const warningEl = document.getElementById('device-warning');
  const introText = document.getElementById('intro-text');
  const introImage = document.getElementById('intro-image');
  const introImageMissing = document.getElementById('intro-image-missing');
  const agreeDevice = document.getElementById('agree-device');
  const agreeReady = document.getElementById('agree-ready');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnStart = document.getElementById('btn-start');
  const trialMessage = document.getElementById('trial-message');
  const stimulusImage = document.getElementById('stimulus-image');
  const btnGoRating = document.getElementById('btn-go-rating');
  const trialCounter = document.getElementById('trial-counter');
  const ratingButtons = document.getElementById('rating-buttons');
  const saveStatus = document.getElementById('save-status');
  const btnDownloadJson = document.getElementById('btn-download-json');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnRestart = document.getElementById('btn-restart');
  const progressContainer = document.getElementById('progress-container');
  const progressText = document.getElementById('progress-text');
  const progressFill = document.getElementById('progress-bar-fill');

  let participantId = createParticipantId();
  let assignment = null;
  let trialOrder = [];
  let trialIndex = -1;
  let currentTrial = null;
  let results = [];
  let startedAt = null;
  let currentShownAt = 0;

  buildRatingButtons();
  renderIntro();
  loadIntroImage();
  updateDesktopGate();

  window.addEventListener('resize', updateDesktopGate);
  window.addEventListener('orientationchange', updateDesktopGate);

  btnFullscreen.addEventListener('click', async () => {
    try { await document.documentElement.requestFullscreen(); } catch (err) { console.warn(err); }
  });

  btnStart.addEventListener('click', async () => {
    if (!validateStart()) return;
    startedAt = new Date().toISOString();
    participantId = createParticipantId();
    results = [];
    trialIndex = -1;
    btnStart.disabled = true;

    try {
      assignment = await getAssignment();
      trialOrder = buildTrialOrderFromAssignment(assignment);
      setProgressVisible(true);
      updateProgress(0, trialOrder.length);
      nextTrial();
    } catch (err) {
      console.error(err);
      btnStart.disabled = false;
      alert('설문 배정을 불러오지 못했습니다. config.js 경로와 Worker 설정을 확인하세요.');
    }
  });

  btnGoRating.addEventListener('click', () => {
    const elapsed = Date.now() - currentShownAt;
    if (elapsed < cfg.ui.minViewMs) return;
    showRating();
  });

  btnDownloadJson.addEventListener('click', downloadJson);
  btnDownloadCsv.addEventListener('click', downloadCsv);
  btnRestart.addEventListener('click', () => window.location.reload());

  function renderIntro() {
    const lines = cfg.ui.introText || [];
    introText.innerHTML = '<ul>' + lines.map(line => `<li>${escapeHtml(line)}</li>`).join('') + '</ul>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[ch]));
  }

  function loadIntroImage() {
    if (!cfg.introImage) return;
    introImage.src = cfg.introImage;
    introImage.onload = () => {
      introImage.classList.remove('hidden');
      introImageMissing.classList.add('hidden');
    };
    introImage.onerror = () => {
      introImage.classList.add('hidden');
      introImageMissing.classList.remove('hidden');
    };
  }

  function buildRatingButtons() {
    ratingButtons.innerHTML = '';
    for (let i = cfg.rating.min; i <= cfg.rating.max; i++) {
      const btn = document.createElement('button');
      btn.className = 'rating-btn';
      btn.textContent = String(i);
      btn.addEventListener('click', () => submitRating(i));
      ratingButtons.appendChild(btn);
    }
  }

  function isProbablyMobile() {
    const ua = navigator.userAgent || '';
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const smallTouchScreen = window.innerWidth < (cfg.desktopMinWidth || 900) && (navigator.maxTouchPoints || 0) > 0;
    return mobileUA || smallTouchScreen;
  }

  function updateDesktopGate() {
    if (!cfg.requireDesktop) {
      warningEl.classList.add('hidden');
      agreeDevice.checked = true;
      agreeDevice.disabled = true;
      btnStart.disabled = false;
      return;
    }
    const blocked = isProbablyMobile();
    if (blocked) {
      warningEl.textContent = '이 설문은 모바일에서 시작할 수 없습니다. 노트북 또는 데스크톱에서 접속하세요.';
      warningEl.classList.remove('hidden');
      btnStart.disabled = true;
      agreeDevice.checked = false;
      agreeDevice.disabled = true;
    } else {
      warningEl.classList.add('hidden');
      agreeDevice.checked = true;
      agreeDevice.disabled = true;
      btnStart.disabled = false;
    }
  }

  function validateStart() {
    if (cfg.requireDesktop && isProbablyMobile()) {
      alert('모바일에서는 시작할 수 없습니다.');
      return false;
    }
    if (!agreeReady.checked) {
      alert('안내를 읽고 응답 방식을 이해했다는 항목을 확인하세요.');
      return false;
    }
    return true;
  }

  async function getAssignment() {
    if (cfg.assignment.mode === 'local_only') {
      return buildLocalAssignment();
    }

    if (cfg.assignment.mode === 'remote_first') {
      try {
        const params = new URLSearchParams({ participant_id: participantId });
        const res = await fetch(`${cfg.assignment.endpoint}?${params.toString()}`, { method: 'GET' });
        if (!res.ok) throw new Error(`assign failed: ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Remote assignment failed, falling back to local sets.', err);
        return buildLocalAssignment();
      }
    }

    return buildLocalAssignment();
  }

  function buildLocalAssignment() {
    const groupIndex = hashString(participantId) % cfg.stimuli.groups.length;
    return {
      participant_id: participantId,
      mode: 'local-fallback',
      group_index: groupIndex,
      anchors: (cfg.anchorTrials || []).map(a => ({
        id: a.id,
        file: a.file,
        kind: a.kind
      })),
      stimuli: cfg.stimuli.groups[groupIndex].map(id => ({
        id,
        file: cfg.stimuli.buildStimulusPath(id)
      }))
    };
  }

  function buildTrialOrderFromAssignment(assign) {
    const anchors = (assign.anchors || cfg.anchorTrials || []).map(a => ({
      id: a.id,
      file: a.file,
      kind: a.kind || 'anchor'
    }));

    const body = (assign.stimuli || []).map(s => ({
      id: s.id,
      file: s.file || cfg.stimuli.buildStimulusPath(s.id),
      kind: 'stimulus'
    }));

    const shuffledBody = shuffle(body);

    if (anchors.length === 2) {
      const mid = Math.floor(shuffledBody.length / 2);
      return [
        anchors[0],
        ...shuffledBody.slice(0, mid),
        anchors[1],
        ...shuffledBody.slice(mid)
      ];
    }

    return [...anchors, ...shuffledBody];
  }

  function nextTrial() {
    trialIndex += 1;
    if (trialIndex >= trialOrder.length) {
      finishExperiment();
      return;
    }
    currentTrial = trialOrder[trialIndex];
    showTrial();
  }

  function showTrial() {
    const total = trialOrder.length;
    updateProgress(trialIndex, total);
    trialCounter.textContent = `${trialIndex + 1} / ${total}`;

    if (currentTrial.kind === 'anchor_low') {
      trialMessage.textContent = '약한 기준 이미지입니다. 얼마나 움직이는 것처럼 느껴지는지 응답하세요.';
    } else if (currentTrial.kind === 'anchor_high') {
      trialMessage.textContent = '강한 기준 이미지입니다. 얼마나 움직이는 것처럼 느껴지는지 응답하세요.';
    } else {
      trialMessage.textContent = '이미지를 보고 실제로 느껴진 정도를 응답하세요.';
    }

    btnGoRating.disabled = true;
    stimulusImage.src = currentTrial.file;
    stimulusImage.onload = () => {
      currentShownAt = Date.now();
      setTimeout(() => { btnGoRating.disabled = false; }, cfg.ui.minViewMs);
    };
    stimulusImage.onerror = () => {
      trialMessage.textContent = `이미지를 불러오지 못했습니다: ${currentTrial.file}`;
      btnGoRating.disabled = false;
    };
    showScreen('trial');
  }

  function showRating() {
    showScreen('rating');
  }

  function submitRating(score) {
    const endedAt = new Date().toISOString();
    results.push({
      participant_id: assignment?.participant_id || participantId,
      group_index: assignment?.group_index ?? null,
      trial_index: trialIndex + 1,
      trial_id: currentTrial.id,
      trial_kind: currentTrial.kind,
      score,
      shown_at: new Date(currentShownAt).toISOString(),
      answered_at: endedAt,
      response_ms: Date.now() - currentShownAt
    });
    updateProgress(trialIndex + 1, trialOrder.length);
    nextTrial();
  }

  async function finishExperiment() {
    const payload = {
      participant_id: assignment?.participant_id || participantId,
      assignment_mode: assignment?.mode || 'unknown',
      group_index: assignment?.group_index ?? null,
      anchor_ids: (assignment?.anchors || cfg.anchorTrials || []).map(a => a.id),
      started_at: startedAt,
      submitted_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      results
    };

    let posted = false;
    if (cfg.saving.autoPostEndpoint) {
      try {
        const res = await fetch(cfg.saving.autoPostEndpoint, {
          method: cfg.saving.endpointMethod || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          saveStatus.textContent = data.message || '서버에 저장되었습니다.';
          posted = true;
        } else {
          saveStatus.textContent = `서버 저장 실패: ${res.status}`;
        }
      } catch (err) {
        console.warn(err);
        saveStatus.textContent = '온라인 저장에 실패하여 로컬 저장 파일을 제공합니다.';
      }
    }

    if (!posted) {
      downloadJson(payload);
      downloadCsv(payload);
    }
    showScreen('finish');
  }

  function downloadJson(payload) {
    const data = payload || buildDownloadPayload();
    downloadBlob(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }),
      `rotating-snakes-${participantId}.json`
    );
  }

  function downloadCsv(payload) {
    const data = payload || buildDownloadPayload();
    const header = [
      'participant_id', 'group_index', 'trial_index', 'trial_id', 'trial_kind',
      'score', 'shown_at', 'answered_at', 'response_ms'
    ];
    const rows = [header.join(',')];
    for (const row of data.results) {
      rows.push([
        csvEscape(row.participant_id),
        csvEscape(row.group_index),
        csvEscape(row.trial_index),
        csvEscape(row.trial_id),
        csvEscape(row.trial_kind),
        csvEscape(row.score),
        csvEscape(row.shown_at),
        csvEscape(row.answered_at),
        csvEscape(row.response_ms)
      ].join(','));
    }
    downloadBlob(
      new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }),
      `rotating-snakes-${participantId}.csv`
    );
  }

  function buildDownloadPayload() {
    return {
      participant_id: assignment?.participant_id || participantId,
      assignment_mode: assignment?.mode || 'unknown',
      group_index: assignment?.group_index ?? null,
      anchor_ids: (assignment?.anchors || cfg.anchorTrials || []).map(a => a.id),
      started_at: startedAt,
      submitted_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      results
    };
  }

  function csvEscape(v) {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.classList.toggle('active', key === name);
    });
  }

  function setProgressVisible(visible) {
    progressContainer.classList.toggle('hidden', !visible);
  }

  function updateProgress(current, total) {
    progressText.textContent = `${current} / ${total}`;
    const pct = total > 0 ? (current / total) * 100 : 0;
    progressFill.style.width = `${pct}%`;
  }

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function hashString(input) {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0);
  }

  function createParticipantId() {
    const rand = crypto.getRandomValues(new Uint32Array(2));
    return `p_${Date.now().toString(36)}_${rand[0].toString(36)}${rand[1].toString(36)}`;
  }
})();
