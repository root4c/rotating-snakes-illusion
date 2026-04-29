(function () {
  const cfg = window.EXPERIMENT_CONFIG;
  if (!cfg) {
    alert('config.js를 찾을 수 없습니다.');
    return;
  }

  const screens = {
    start: document.getElementById('screen-start'),
    intro: document.getElementById('screen-intro'),
    trial: document.getElementById('screen-trial'),
    rating: document.getElementById('screen-rating'),
    finish: document.getElementById('screen-finish'),
    result: document.getElementById('screen-result')
  };

  const warningEl = document.getElementById('device-warning');
  const introText = document.getElementById('intro-text');
  const introImage = document.getElementById('intro-image');
  const introImageMissing = document.getElementById('intro-image-missing');
  const agreeDevice = document.getElementById('agree-device');
  const agreeReady = document.getElementById('agree-ready');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnStart = document.getElementById('btn-start');
const btnIntroConfirm = document.getElementById('btn-intro-confirm');
const btnIntroPrev = document.getElementById('btn-intro-prev');
const btnIntroNext = document.getElementById('btn-intro-next');
const introStepBadge = document.getElementById('intro-step-badge');
const introDots = document.getElementById('intro-dots');
const introSceneKicker = document.getElementById('intro-scene-kicker');
const introSceneTitle = document.getElementById('intro-scene-title');
const introSceneText = document.getElementById('intro-scene-text');
const introSceneImage = document.getElementById('intro-scene-image');
const introSceneCopy = document.getElementById('intro-scene-copy');
const introExtraLayer = document.getElementById('intro-extra-layer');
const introFinalCheckWrap = document.getElementById('intro-final-check-wrap');
const agreeIntroUnderstood = document.getElementById('agree-intro-understood');
  const trialMessage = document.getElementById('trial-message');
  const stimulusImage = document.getElementById('stimulus-image');
  const btnGoRating = document.getElementById('btn-go-rating');
  const trialCounter = document.getElementById('trial-counter');
  const ratingButtons = document.getElementById('rating-buttons');
  const saveStatus = document.getElementById('save-status');
  const btnDownloadJson = document.getElementById('btn-download-json');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnRestart = document.getElementById('btn-restart');
  const btnRetry = document.getElementById('btn-retry');
  const progressContainer = document.getElementById('progress-container');
  const progressText = document.getElementById('progress-text');
  const progressFill = document.getElementById('progress-bar-fill');
  const progressHint = document.getElementById('progress-hint');

  const resultStatus = document.getElementById('result-status');
  const resultGrade = document.getElementById('result-grade');
  const resultScore = document.getElementById('result-score');
  const resultRank = document.getElementById('result-rank');
  const resultCaption = document.getElementById('result-caption');
  const resultMeterFill = document.getElementById('result-meter-fill');
  const metricContrastText = document.getElementById('metric-contrast-text');
  const metricColorText = document.getElementById('metric-color-text');
  const metricStructureText = document.getElementById('metric-structure-text');
  const metricContrastFill = document.getElementById('metric-contrast-fill');
  const metricColorFill = document.getElementById('metric-color-fill');
  const metricStructureFill = document.getElementById('metric-structure-fill');
  const traitMain = document.getElementById('trait-main');
  const traitSpeed = document.getElementById('trait-speed');
  const traitStability = document.getElementById('trait-stability');
  const traitFocus = document.getElementById('trait-focus');
  const resultHistogram = document.getElementById('result-histogram');
  const distributionLabel = document.getElementById('distribution-label');
  const resultSummaryTitle = document.getElementById('result-summary-title');
  const resultSummary = document.getElementById('result-summary');

  let participantId = createParticipantId();
  let assignment = null;
  let trialOrder = [];
  let trialIndex = -1;
  let currentTrial = null;
  let results = [];
  let startedAt = null;
  let currentShownAt = 0;
  let introReady = false;
  let introSceneIndex = 0;

const introScenes = [
  {
    kicker: 'Scene 1',
    title: '이 설문은 무엇을 하나요?',
    text: '정지된 착시 이미지가 얼마나 움직이는 것처럼 느껴지는지 평가하는 설문입니다.',
    image: cfg.introImage || 'stimuli/A4_B1_C1.jpg',
    mode: 'illusion'
  },
  {
    kicker: 'Scene 2',
    title: '어떻게 응답하나요?',
    text: '각 이미지를 보고 움직이는 것처럼 느껴진 정도를 1점부터 7점까지 선택합니다.',
    image: 'stimuli/A1_B1_C4.jpg',
    mode: 'rating'
  },
  {
    kicker: 'Scene 3',
    title: '이미지는 어떻게 봐야 하나요?',
    text: '한 지점만 오래 응시하지 말고, 그림 전체를 천천히 훑어보듯이 봐주세요.',
    image: 'stimuli/A4_B1_C1.jpg',
    mode: 'scan'
  },
  {
    kicker: 'Scene 4',
    title: '응답할 때 주의할 점',
    text: '정답은 없습니다. 너무 오래 고민하지 말고, 처음 느껴진 정도에 가깝게 응답하면 됩니다. 응답이 끝나면 간단한 결과 화면이 표시됩니다.',
    image: 'stimuli/A4_B4_C4.jpg',
    mode: 'result'
  }
];

  buildRatingButtons();
  renderIntro();
  loadIntroImage();
  updateDesktopGate();
  setupIntroVideoGate();

  window.addEventListener('resize', updateDesktopGate);
  window.addEventListener('orientationchange', updateDesktopGate);

  btnFullscreen.addEventListener('click', async () => {
    try { await document.documentElement.requestFullscreen(); } catch (err) { console.warn(err); }
  });

  btnStart.addEventListener('click', () => {
    if (!validateStart()) return;
    showIntroVideoScreen();
  });

  btnIntroConfirm?.addEventListener('click', () => {
    if (!introReady) return;
    beginExperiment();
  });

  btnGoRating.addEventListener('click', () => {
    const elapsed = Date.now() - currentShownAt;
    if (elapsed < cfg.ui.minViewMs) return;
    showRating();
  });

  btnDownloadJson.addEventListener('click', downloadJson);
  btnDownloadCsv.addEventListener('click', downloadCsv);
  btnRestart.addEventListener('click', () => window.location.reload());
  btnRetry?.addEventListener('click', () => window.location.reload());

  function setupIntroVideoGate() {
    if (!introVideo || !btnIntroConfirm) return;
    btnIntroConfirm.disabled = true;

    introVideo.addEventListener('ended', unlockIntroConfirm);
    introVideo.addEventListener('timeupdate', () => {
      if (!introVideo.duration || Number.isNaN(introVideo.duration)) return;
      const watchedRatio = introVideo.currentTime / introVideo.duration;
      if (watchedRatio >= 0.85) unlockIntroConfirm();
    });
    introVideo.addEventListener('error', () => {
      introVideoStatus.textContent = 'intro.mp4를 찾지 못했습니다. 안내 확인 후 바로 시작할 수 있습니다.';
      unlockIntroConfirm();
    });
  }

  function unlockIntroConfirm() {
    introReady = true;
    btnIntroConfirm.disabled = false;
    if (introVideoStatus) introVideoStatus.textContent = '확인 완료. 이제 설문을 시작할 수 있습니다.';
  }

  function showIntroVideoScreen() {
    introReady = false;
    if (btnIntroConfirm) btnIntroConfirm.disabled = true;
    if (introVideoStatus) introVideoStatus.textContent = '영상을 끝까지 보면 시작 버튼이 활성화됩니다.';
    if (introVideo) {
      introVideo.currentTime = 0;
      introVideo.load();
    }
    showScreen('intro');
  }

  async function beginExperiment() {
    startedAt = new Date().toISOString();
    participantId = createParticipantId();
    results = [];
    trialIndex = -1;
    btnStart.disabled = true;
    btnIntroConfirm.disabled = true;

    try {
      assignment = await getAssignment();
      trialOrder = buildTrialOrderFromAssignment(assignment);
      setProgressVisible(true);
      updateProgress(0, trialOrder.length);
      nextTrial();
    } catch (err) {
      console.error(err);
      btnStart.disabled = false;
      btnIntroConfirm.disabled = false;
      alert('설문 배정을 불러오지 못했습니다. config.js 경로와 Worker 설정을 확인하세요.');
    }
  }

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
      trialMessage.textContent = '기준 이미지를 보고 빠르게 선택하세요.';
    } else if (currentTrial.kind === 'anchor_high') {
      trialMessage.textContent = '중간 체크포인트입니다. 거의 절반을 넘었습니다.';
    } else {
      trialMessage.textContent = '움직이는 것처럼 보이는 정도를 첫 느낌으로 선택하세요.';
    }

    btnGoRating.disabled = true;
    stimulusImage.classList.remove('loaded');
    stimulusImage.src = currentTrial.file;
    stimulusImage.onload = () => {
      currentShownAt = Date.now();
      stimulusImage.classList.add('loaded');
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
      showScreen('finish');
      return;
    }

    showResultScreen(results);
    showScreen('result');
  }

  function showResultScreen(results) {
    const filtered = results.filter(r => r.trial_kind === 'stimulus');
    const totalStimuli = Math.max(1, filtered.length);
    const avg = filtered.reduce((sum, row) => sum + Number(row.score || 0), 0) / totalStimuli;
    const sensitivity = Math.round((avg / cfg.rating.max) * 100);
    const detected = Math.round((avg / cfg.rating.max) * totalStimuli);
    const percentile = Math.max(1, Math.min(99, 100 - Math.round(sensitivity * 0.82)));

    const contrast = clamp(Math.round(sensitivity + pseudoOffset('contrast', -9, 9)), 8, 99);
    const color = clamp(Math.round(sensitivity + pseudoOffset('color', -14, 11)), 8, 99);
    const structure = clamp(Math.round(sensitivity + pseudoOffset('structure', -11, 13)), 8, 99);
    const stability = clamp(100 - responseDeviationScore(filtered), 12, 99);
    const avgResponseMs = filtered.reduce((sum, row) => sum + Number(row.response_ms || 0), 0) / totalStimuli;
    const speedScore = avgResponseMs < 2200 ? '빠름' : avgResponseMs < 4200 ? '보통' : '신중함';
    const focusScore = clamp(Math.round((sensitivity * 0.62) + (stability * 0.38)), 1, 99);
    const grade = getGrade(sensitivity);
    const mainTrait = getMainTrait({ contrast, color, structure });

    resultStatus.textContent = `총 ${totalStimuli}개 실험 이미지 응답 기준`;
    resultGrade.textContent = grade;
    resultScore.textContent = `${detected}개 감지`;
    resultRank.textContent = `착시 민감도 상위 ${percentile}%`;
    resultCaption.textContent = '점수가 높을수록 정지 이미지에서 움직임을 더 강하게 감지한 것으로 표시됩니다.';
    resultMeterFill.style.width = `${Math.max(8, sensitivity)}%`;

    setMetric(metricContrastText, metricContrastFill, contrast);
    setMetric(metricColorText, metricColorFill, color);
    setMetric(metricStructureText, metricStructureFill, structure);

    traitMain.textContent = mainTrait;
    traitSpeed.textContent = speedScore;
    traitStability.textContent = `${stability}%`;
    traitFocus.textContent = `${focusScore}%`;

    distributionLabel.textContent = percentile <= 15 ? '상위권' : percentile <= 45 ? '평균 이상' : '평균권';
    resultSummaryTitle.textContent = `${mainTrait} 반응형`;
    resultSummary.textContent = '이 결과지는 실제 진단이 아니라 설문 몰입을 위한 간단한 시각 반응 리포트입니다. 그래도 응답 패턴을 기준으로 상대적 민감도와 반응 유형을 요약해 보여줍니다.';
    drawHistogram(sensitivity);
  }

  function setMetric(textEl, fillEl, value) {
    textEl.textContent = `${value}%`;
    requestAnimationFrame(() => { fillEl.style.width = `${value}%`; });
  }

  function drawHistogram(sensitivity) {
    resultHistogram.innerHTML = '';
    const heights = [18, 26, 35, 48, 63, 78, 92, 100, 90, 76, 58, 42, 30, 22];
    const userIndex = clamp(Math.round((sensitivity / 100) * (heights.length - 1)), 0, heights.length - 1);
    heights.forEach((height, index) => {
      const bar = document.createElement('div');
      bar.className = index === userIndex ? 'histogram-bar user-bar' : 'histogram-bar';
      bar.style.setProperty('--h', `${height}%`);
      bar.style.animationDelay = `${index * 35}ms`;
      resultHistogram.appendChild(bar);
    });
  }

  function getGrade(score) {
    if (score >= 88) return 'S';
    if (score >= 75) return 'A';
    if (score >= 62) return 'B+';
    if (score >= 45) return 'B';
    if (score >= 30) return 'C';
    return 'D';
  }

  function getMainTrait(values) {
    const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
    if (entries[0][0] === 'contrast') return '명도 대비';
    if (entries[0][0] === 'color') return '색 배열';
    return '공간 구조';
  }

  function responseDeviationScore(rows) {
    if (!rows.length) return 45;
    const avg = rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length;
    const variance = rows.reduce((sum, row) => sum + Math.pow(Number(row.score || 0) - avg, 2), 0) / rows.length;
    return clamp(Math.round(Math.sqrt(variance) * 18), 0, 88);
  }

  function pseudoOffset(key, min, max) {
    const base = `${participantId}:${key}`;
    const n = hashString(base) % 1000;
    return min + (n / 999) * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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

    if (!progressHint) return;
    if (pct >= 100) progressHint.textContent = '완료. 결과를 계산하는 중입니다.';
    else if (pct >= 75) progressHint.textContent = '거의 끝났습니다.';
    else if (pct >= 50) progressHint.textContent = '절반을 넘었습니다.';
    else if (pct >= 25) progressHint.textContent = '좋습니다. 계속 진행하세요.';
    else progressHint.textContent = '첫 느낌으로 빠르게 선택하세요.';
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
