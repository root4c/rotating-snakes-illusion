(function () {
  const cfg = window.EXPERIMENT_CONFIG;
  if (!cfg) {
    alert('config.js를 찾을 수 없습니다.');
    return;
  }

  const screens = {
    start: document.getElementById('screen-start'),
    demo: document.getElementById('screen-demo'),
    phase: document.getElementById('screen-phase'),
    rating: document.getElementById('screen-rating'),
    finish: document.getElementById('screen-finish')
  };
  const warningEl = document.getElementById('device-warning');
  const progressContainer = document.getElementById('progress-container');
  const progressText = document.getElementById('progress-text');
  const progressFill = document.getElementById('progress-bar-fill');
  const introImage = document.getElementById('intro-image');
  const introImageMissing = document.getElementById('intro-image-missing');
  const agreePc = document.getElementById('agree-pc');
  const agreeFullscreen = document.getElementById('agree-fullscreen');
  const agreeReady = document.getElementById('agree-ready');
  const btnStart = document.getElementById('btn-start');
  const btnDemo = document.getElementById('btn-demo');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const phaseMessage = document.getElementById('phase-message');
  const stage = document.getElementById('stimulus-stage');
  const stimulusImage = document.getElementById('stimulus-image');
  const redDot = document.getElementById('red-dot');
  const btnGoRating = document.getElementById('btn-go-rating');
  const trialCounter = document.getElementById('trial-counter');
  const ratingButtons = document.getElementById('rating-buttons');
  const btnDownloadJson = document.getElementById('btn-download-json');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnRestart = document.getElementById('btn-restart');
  const saveStatus = document.getElementById('save-status');

  const demoModeSelect = document.getElementById('demo-mode-select');
  const demoMessage = document.getElementById('demo-message');
  const demoStage = document.getElementById('demo-stage');
  const demoImage = document.getElementById('demo-image');
  const demoRedDot = document.getElementById('demo-red-dot');
  const btnDemoPlay = document.getElementById('btn-demo-play');
  const btnDemoStop = document.getElementById('btn-demo-stop');
  const btnDemoClose = document.getElementById('btn-demo-close');

  let trialOrder = [];
  let trialIndex = -1;
  let currentTrial = null;
  let ratingStartTs = 0;
  let trialStimStartTs = 0;
  let results = [];
  let participantId = createParticipantId();
  let startedAt = null;
  let stageStartTs = 0;
  let currentMinViewMs = 0;
  let stageAdvanceArmed = false;
  let stageAnimationFrame = null;
  let demoAnimationFrame = null;

  buildRatingButtons();
  setupIntroImage();
  updateDesktopGate();
  setProgressVisible(false);

  window.addEventListener('resize', updateDesktopGate);
  window.addEventListener('orientationchange', updateDesktopGate);

  btnFullscreen.addEventListener('click', async () => {
    try { await document.documentElement.requestFullscreen(); } catch (e) { console.warn(e); }
  });

  btnDemo.addEventListener('click', openDemo);
  btnDemoPlay.addEventListener('click', playDemo);
  btnDemoStop.addEventListener('click', stopDemo);
  btnDemoClose.addEventListener('click', () => {
    stopDemo();
    setProgressVisible(false);
    showScreen('start');
  });

  btnStart.addEventListener('click', async () => {
    if (cfg.requireDesktop && !isDesktopLike()) {
      alert('모바일/태블릿에서는 시작할 수 없습니다. 노트북 또는 데스크톱에서 다시 접속하세요.');
      updateDesktopGate();
      return;
    }
    if (!agreeReady.checked) {
      alert('안내를 읽고 진행 방법을 이해했다는 항목을 확인하세요.');
      return;
    }
    if (agreeFullscreen.checked && !document.fullscreenElement) {
      try { await document.documentElement.requestFullscreen(); } catch (e) {}
    }
    startExperiment();
  });

  btnGoRating.addEventListener('click', () => {
    if (!stageAdvanceArmed) return;
    stopStageAnimation();
    redDot.classList.add('hidden');
    showRating();
  });

  btnDownloadJson.addEventListener('click', downloadJson);
  btnDownloadCsv.addEventListener('click', downloadCsv);
  btnRestart.addEventListener('click', () => window.location.reload());

  function setupIntroImage() {
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

  function setProgressVisible(visible) {
    progressContainer.classList.toggle('hidden', !visible);
  }

  function updateProgress(current, total) {
    progressText.textContent = `${current} / ${total}`;
    const pct = total > 0 ? (current / total) * 100 : 0;
    progressFill.style.width = `${pct}%`;
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

  function updateDesktopGate() {
    if (!cfg.requireDesktop) {
      warningEl.classList.add('hidden');
      btnStart.disabled = false;
      agreePc.checked = true;
      agreePc.disabled = true;
      return;
    }

    const desktop = isDesktopLike();
    agreePc.checked = desktop;
    agreePc.disabled = true;
    btnStart.disabled = !desktop;
    btnDemo.disabled = !desktop;
    btnFullscreen.disabled = !desktop;

    if (desktop) {
      warningEl.classList.add('hidden');
    } else {
      warningEl.textContent = '이 실험은 모바일/태블릿에서 시작할 수 없습니다. 노트북 또는 데스크톱에서 접속하세요.';
      warningEl.classList.remove('hidden');
    }
  }

  function isDesktopLike() {
    const ua = navigator.userAgent || '';
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
    const smallViewport = Math.min(window.innerWidth, window.innerHeight) < 700;
    const touchOnly = (navigator.maxTouchPoints || 0) > 0 && coarse && smallViewport;
    return !mobile && !touchOnly;
  }

  function openDemo() {
    if (cfg.requireDesktop && !isDesktopLike()) return;
    setProgressVisible(false);
    showScreen('demo');
    demoImage.src = cfg.demo.defaultImage;
    demoMessage.textContent = '미리보기 조건을 고르고 재생을 누르세요.';
  }

  function playDemo() {
    stopDemo();
    const mode = demoModeSelect.value;
    demoImage.src = cfg.demo.defaultImage;
    demoMessage.textContent = mode === 'ac' ? 'A/C 문항 예시: 자유롭게 본 뒤 평가합니다.' : getBInstruction(mode);
    if (mode === 'ac') {
      demoRedDot.classList.add('hidden');
      return;
    }
    demoRedDot.classList.remove('hidden');
    const start = performance.now();
    const tick = now => {
      updateDot(mode, now - start, demoStage.getBoundingClientRect(), demoRedDot);
      demoAnimationFrame = requestAnimationFrame(tick);
    };
    demoAnimationFrame = requestAnimationFrame(tick);
  }

  function stopDemo() {
    cancelAnimationFrame(demoAnimationFrame);
    demoAnimationFrame = null;
    demoRedDot.classList.add('hidden');
  }

  function startExperiment() {
    participantId = createParticipantId();
    startedAt = new Date().toISOString();
    results = [];
    setProgressVisible(true);
    updateProgress(0, cfg.trials.length);
    trialOrder = buildTrialOrder(cfg.trials.slice());
    trialIndex = -1;
    nextTrial();
  }

  function nextTrial() {
    trialIndex += 1;
    stopStageAnimation();
    redDot.classList.add('hidden');
    if (trialIndex >= trialOrder.length) {
      finishExperiment();
      return;
    }
    currentTrial = trialOrder[trialIndex];
    updateProgress(trialIndex + 1, trialOrder.length);
    runTrial(currentTrial);
  }

  async function runTrial(trial) {
    showScreen('phase');
    phaseMessage.textContent = trial.kind === 'b' ? getBInstruction(trial.dotMode) : '이미지를 자연스럽게 충분히 본 뒤 평가하기를 누르세요.';
    await setImage(trial.file);
    await wait(cfg.timings.preMessageMs);
    trialStimStartTs = performance.now();
    stageStartTs = performance.now();
    currentMinViewMs = trial.kind === 'b' ? cfg.timings.minViewMsB : cfg.timings.minViewMsAC;
    stageAdvanceArmed = false;
    btnGoRating.disabled = true;
    btnGoRating.textContent = '평가하기';

    if (trial.kind === 'b') {
      startStageAnimation(trial.dotMode || 'free');
    } else {
      redDot.classList.add('hidden');
    }

    armAdvanceButtonLater();
  }

  function armAdvanceButtonLater() {
    const loop = () => {
      const elapsed = performance.now() - stageStartTs;
      if (elapsed >= currentMinViewMs) {
        stageAdvanceArmed = true;
        btnGoRating.disabled = false;
        btnGoRating.textContent = '평가하기';
        return;
      }
      const remain = Math.max(0, Math.ceil((currentMinViewMs - elapsed) / 1000));
      btnGoRating.textContent = `평가하기 (${remain})`;
      stageAnimationFrame = requestAnimationFrame(loop);
    };
    stageAnimationFrame = requestAnimationFrame(loop);
  }

  function startStageAnimation(mode) {
    if (mode === 'free') {
      redDot.classList.add('hidden');
      return;
    }
    redDot.classList.remove('hidden');
    const start = performance.now();
    const tick = now => {
      updateDot(mode, now - start, stage.getBoundingClientRect(), redDot);
      stageAnimationFrame = requestAnimationFrame(tick);
    };
    stageAnimationFrame = requestAnimationFrame(tick);
  }

  function stopStageAnimation() {
    cancelAnimationFrame(stageAnimationFrame);
    stageAnimationFrame = null;
  }

  function showRating() {
    showScreen('rating');
    trialCounter.textContent = `${trialIndex + 1} / ${trialOrder.length} · ${currentTrial.factor}-${currentTrial.level}`;
    ratingStartTs = performance.now();
  }

  function submitRating(score) {
    const ratingRt = Math.round(performance.now() - ratingStartTs);
    const viewDuration = Math.round(performance.now() - trialStimStartTs);
    results.push({
      participant_id: participantId,
      experiment_started_at: startedAt,
      timestamp: new Date().toISOString(),
      order_index: trialIndex + 1,
      trial_id: currentTrial.id,
      factor: currentTrial.factor,
      level: currentTrial.level,
      kind: currentTrial.kind,
      file: currentTrial.file,
      dot_mode: currentTrial.dotMode || '',
      score,
      rating_response_time_ms: ratingRt,
      viewing_duration_ms: viewDuration,
      user_agent: navigator.userAgent,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      fullscreen: !!document.fullscreenElement,
      screen_w: window.screen.width,
      screen_h: window.screen.height,
      pixel_ratio: window.devicePixelRatio || 1
    });
    nextTrial();
  }

  function updateDot(mode, elapsedMs, rect, targetDot) {
    const t = elapsedMs / 1000;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const ampX = rect.width * cfg.bDot.horizontalAmplitudeRatio;
    const radius = Math.min(rect.width, rect.height) * cfg.bDot.circularRadiusRatio;
    const omega = 2 * Math.PI * cfg.bDot.speedCyclesPerSecond;

    let x = cx;
    let y = cy;

    if (mode === 'center') {
      x = cx;
      y = cy;
    } else if (mode === 'horizontal') {
      x = cx + ampX * Math.sin(omega * t);
      y = cy;
    } else if (mode === 'circular') {
      x = cx + radius * Math.cos(omega * t);
      y = cy + radius * Math.sin(omega * t);
    }

    targetDot.style.left = `${x}px`;
    targetDot.style.top = `${y}px`;
  }

  function getBInstruction(mode) {
    if (mode === 'center') return '빨간 점을 가능한 한 중앙에서 유지하며 충분히 본 뒤 평가하세요.';
    if (mode === 'horizontal') return '빨간 점의 좌우 움직임을 따라가며 충분히 본 뒤 평가하세요.';
    if (mode === 'circular') return '빨간 점의 원형 움직임을 따라가며 충분히 본 뒤 평가하세요.';
    return '이미지를 자연스럽게 충분히 본 뒤 평가하세요.';
  }

  function buildTrialOrder(trials) {
    const maxSameFactorInRow = cfg.randomization.maxSameFactorInRow || 2;
    const maxBInRow = cfg.randomization.maxBInRow || 1;

    for (let attempt = 0; attempt < 5000; attempt++) {
      const arr = shuffle(trials.slice());
      let ok = true;
      for (let i = 0; i < arr.length; i++) {
        if (i >= maxSameFactorInRow) {
          let sameFactor = true;
          for (let j = 1; j <= maxSameFactorInRow; j++) {
            if (arr[i - j].factor !== arr[i].factor) {
              sameFactor = false;
              break;
            }
          }
          if (sameFactor) { ok = false; break; }
        }
        if (arr[i].factor === 'B' && i >= maxBInRow) {
          let sameB = true;
          for (let j = 1; j <= maxBInRow; j++) {
            if (arr[i - j].factor !== 'B') {
              sameB = false;
              break;
            }
          }
          if (sameB) { ok = false; break; }
        }
      }
      if (ok) return arr;
    }
    return shuffle(trials.slice());
  }

  async function setImage(src) {
    return new Promise((resolve, reject) => {
      stimulusImage.onload = () => resolve();
      stimulusImage.onerror = () => reject(new Error(`이미지 로드 실패: ${src}`));
      stimulusImage.src = src;
    }).catch(err => {
      alert(err.message);
      throw err;
    });
  }

  function finishExperiment() {
    updateProgress(trialOrder.length, trialOrder.length);
    setProgressVisible(false);
    showScreen('finish');
    downloadJson();
    downloadCsv();
    maybePostResults();
  }

  async function maybePostResults() {
    if (!cfg.saving.autoPostEndpoint) {
      saveStatus.textContent = '현재는 로컬 저장 모드입니다. 온라인 저장을 쓰려면 config.js의 autoPostEndpoint를 설정하세요.';
      return;
    }
    try {
      const payload = {
        participant_id: participantId,
        experiment_started_at: startedAt,
        submitted_at: new Date().toISOString(),
        results
      };
      const res = await fetch(cfg.saving.autoPostEndpoint, {
        method: cfg.saving.endpointMethod || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      saveStatus.textContent = '응답이 서버에도 저장되었습니다.';
    } catch (err) {
      console.error(err);
      saveStatus.textContent = '서버 저장은 실패했고, 로컬 파일 다운로드는 완료되었습니다.';
    }
  }

  function downloadJson() {
    const payload = {
      participant_id: participantId,
      experiment_started_at: startedAt,
      downloaded_at: new Date().toISOString(),
      results
    };
    saveBlob(`${participantId}_responses.json`, JSON.stringify(payload, null, 2), 'application/json');
  }

  function downloadCsv() {
    if (!results.length) return;
    const keys = Object.keys(results[0]);
    const lines = [keys.join(',')];
    for (const row of results) {
      lines.push(keys.map(k => csvEscape(row[k])).join(','));
    }
    saveBlob(`${participantId}_responses.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  }

  function saveBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function csvEscape(value) {
    const s = String(value ?? '');
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function showScreen(name) {
    Object.values(screens).forEach(el => el.classList.remove('active'));
    screens[name].classList.add('active');
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function createParticipantId() {
    return 'p_' + Math.random().toString(36).slice(2, 10);
  }
})();
