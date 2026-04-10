window.EXPERIMENT_CONFIG = {
  title: "Rotating Snakes Experiment",
  requireDesktop: true,
  introImage: "stimuli/intro_example.png",
  timings: {
    preMessageMs: 450,
    minViewMsAC: 1200,
    minViewMsB: 1800
  },
  randomization: {
    maxSameFactorInRow: 2,
    maxBInRow: 1
  },
  bDot: {
    sizePx: 14,
    horizontalAmplitudeRatio: 0.20,
    circularRadiusRatio: 0.16,
    speedCyclesPerSecond: 0.16
  },
  saving: {
    autoPostEndpoint: "https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev/submit",
    endpointMethod: "POST"
  },
  demo: {
    defaultImage: "stimuli/check_base.png"
  },
  trials: [
    { id: "A_01", factor: "A", level: "1", kind: "ac", file: "stimuli/A_01.png" },
    { id: "A_02", factor: "A", level: "2", kind: "ac", file: "stimuli/A_02.png" },
    { id: "A_03", factor: "A", level: "3", kind: "ac", file: "stimuli/A_03.png" },
    { id: "A_04", factor: "A", level: "4", kind: "ac", file: "stimuli/A_04.png" },

    { id: "C_02", factor: "C", level: "2", kind: "ac", file: "stimuli/C_02.png" },
    { id: "C_03", factor: "C", level: "3", kind: "ac", file: "stimuli/C_03.png" },
    { id: "C_04", factor: "C", level: "4", kind: "ac", file: "stimuli/C_04.png" },
    { id: "C_05", factor: "C", level: "5", kind: "ac", file: "stimuli/C_05.png" },
    { id: "C_06", factor: "C", level: "6", kind: "ac", file: "stimuli/C_06.png" },

    { id: "B_FREE", factor: "B", level: "free", kind: "b", file: "stimuli/check_base.png", dotMode: "free" },
    { id: "B_CENTER", factor: "B", level: "center", kind: "b", file: "stimuli/check_base.png", dotMode: "center" },
    { id: "B_HORIZONTAL", factor: "B", level: "horizontal", kind: "b", file: "stimuli/check_base.png", dotMode: "horizontal" },
    { id: "B_CIRCULAR", factor: "B", level: "circular", kind: "b", file: "stimuli/check_base.png", dotMode: "circular" }
  ],
  rating: {
    min: 1,
    max: 7,
    labels: {
      1: "전혀 느껴지지 않음",
      7: "매우 강하게 느껴짐"
    }
  }
};
