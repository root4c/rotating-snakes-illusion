window.EXPERIMENT_CONFIG = {
  title: "Rotating Snakes Motion Survey",
  requireDesktop: true,
  desktopMinWidth: 900,
  introImage: "stimuli/A4_B4_C1.jpg",

  anchorTrials: [
    {
      id: "ANCHOR_LOW",
      file: "stimuli/A1_B1_C4.jpg",
      kind: "anchor_low",
      prompt: "약한 기준 이미지입니다. 얼마나 움직이는 것처럼 느껴지는지 응답하세요."
    },
    {
      id: "ANCHOR_HIGH",
      file: "stimuli/A4_B4_C1.jpg",
      kind: "anchor_high",
      prompt: "강한 기준 이미지입니다. 얼마나 움직이는 것처럼 느껴지는지 응답하세요."
    }
  ],

  assignment: {
    mode: "remote_first",
    endpoint: "https://rotating-snakes-submit.root4c.workers.dev/assign",
    localSetStrategy: "participant_hash_mod_8"
  },

  saving: {
    autoPostEndpoint: "https://rotating-snakes-submit.root4c.workers.dev/submit",
    endpointMethod: "POST"
  },

  rating: {
    min: 1,
    max: 7,
    labels: {
      1: "전혀 느껴지지 않음",
      7: "매우 강하게 느껴짐"
    }
  },

  ui: {
    minViewMs: 1200,
    introText: [
      "이 설문은 정지된 원형 이미지가 얼마나 움직이는 것처럼 느껴지는지 평가하는 실험입니다.",
      "총 26문항입니다. 기준 이미지 2개와 실험 이미지 24개가 제시됩니다.",
      "오래 분석하지 말고, 실제로 느껴진 정도를 1점부터 7점까지 선택하세요.",
      "모바일은 차단되며, 노트북 또는 데스크톱에서만 참여할 수 있습니다."
    ]
  },

  stimuli: {
    buildStimulusPath(id) {
      return `stimuli/${id}.jpg`;
    },

    allIds: Array.from({ length: 4 }, (_, ai) => ai + 1).flatMap(a =>
      Array.from({ length: 4 }, (_, bi) => bi + 1).flatMap(b =>
        Array.from({ length: 4 }, (_, ci) => ci + 1).map(c => `A${a}_B${b}_C${c}`)
      )
    ),

    groups: [
      [
        "A1_B1_C2",
        "A1_B2_C1",
        "A1_B2_C3",
        "A1_B3_C3",
        "A1_B3_C4",
        "A1_B4_C2",
        "A2_B1_C1",
        "A2_B1_C4",
        "A2_B2_C3",
        "A2_B2_C4",
        "A2_B3_C1",
        "A2_B4_C3",
        "A3_B1_C2",
        "A3_B1_C3",
        "A3_B2_C4",
        "A3_B3_C2",
        "A3_B3_C4",
        "A3_B4_C1",
        "A4_B1_C1",
        "A4_B2_C2",
        "A4_B3_C1",
        "A4_B4_C2",
        "A4_B4_C3",
        "A4_B4_C4"
      ],
      [
        "A1_B1_C2",
        "A1_B1_C3",
        "A1_B1_C4",
        "A1_B2_C4",
        "A1_B3_C2",
        "A1_B3_C3",
        "A2_B1_C2",
        "A2_B2_C1",
        "A2_B2_C3",
        "A2_B3_C3",
        "A2_B4_C1",
        "A2_B4_C4",
        "A3_B1_C2",
        "A3_B1_C4",
        "A3_B2_C2",
        "A3_B3_C1",
        "A3_B4_C1",
        "A3_B4_C3",
        "A4_B2_C3",
        "A4_B2_C4",
        "A4_B3_C1",
        "A4_B3_C2",
        "A4_B4_C1",
        "A4_B4_C4"
      ],
      [
        "A1_B1_C1",
        "A1_B2_C1",
        "A1_B3_C3",
        "A1_B4_C1",
        "A1_B4_C2",
        "A1_B4_C4",
        "A2_B1_C2",
        "A2_B1_C3",
        "A2_B2_C1",
        "A2_B2_C2",
        "A2_B2_C4",
        "A2_B3_C1",
        "A3_B1_C1",
        "A3_B1_C4",
        "A3_B3_C3",
        "A3_B3_C4",
        "A3_B4_C2",
        "A3_B4_C4",
        "A4_B1_C2",
        "A4_B2_C3",
        "A4_B2_C4",
        "A4_B3_C2",
        "A4_B3_C3",
        "A4_B4_C3"
      ],
      [
        "A1_B1_C1",
        "A1_B1_C2",
        "A1_B2_C3",
        "A1_B3_C2",
        "A1_B3_C4",
        "A1_B4_C1",
        "A2_B1_C3",
        "A2_B3_C1",
        "A2_B3_C4",
        "A2_B4_C1",
        "A2_B4_C2",
        "A2_B4_C3",
        "A3_B1_C4",
        "A3_B2_C2",
        "A3_B2_C3",
        "A3_B2_C4",
        "A3_B3_C3",
        "A3_B4_C3",
        "A4_B1_C2",
        "A4_B1_C4",
        "A4_B2_C1",
        "A4_B2_C2",
        "A4_B3_C4",
        "A4_B4_C1"
      ],
      [
        "A1_B1_C4",
        "A1_B2_C1",
        "A1_B2_C4",
        "A1_B3_C1",
        "A1_B4_C2",
        "A1_B4_C3",
        "A2_B1_C1",
        "A2_B1_C2",
        "A2_B3_C2",
        "A2_B3_C3",
        "A2_B3_C4",
        "A2_B4_C3",
        "A3_B2_C1",
        "A3_B2_C2",
        "A3_B2_C3",
        "A3_B3_C1",
        "A3_B3_C2",
        "A3_B4_C4",
        "A4_B1_C2",
        "A4_B1_C3",
        "A4_B1_C4",
        "A4_B2_C1",
        "A4_B4_C3",
        "A4_B4_C4"
      ],
      [
        "A1_B1_C3",
        "A1_B2_C2",
        "A1_B2_C3",
        "A1_B3_C1",
        "A1_B4_C1",
        "A1_B4_C4",
        "A2_B2_C1",
        "A2_B2_C3",
        "A2_B2_C4",
        "A2_B3_C4",
        "A2_B4_C2",
        "A2_B4_C4",
        "A3_B1_C1",
        "A3_B1_C2",
        "A3_B1_C3",
        "A3_B3_C1",
        "A3_B3_C2",
        "A3_B4_C2",
        "A4_B1_C3",
        "A4_B1_C4",
        "A4_B2_C1",
        "A4_B3_C3",
        "A4_B3_C4",
        "A4_B4_C2"
      ],
      [
        "A1_B1_C3",
        "A1_B1_C4",
        "A1_B2_C2",
        "A1_B3_C1",
        "A1_B4_C3",
        "A1_B4_C4",
        "A2_B1_C3",
        "A2_B1_C4",
        "A2_B2_C2",
        "A2_B3_C2",
        "A2_B4_C1",
        "A2_B4_C2",
        "A3_B2_C1",
        "A3_B2_C3",
        "A3_B2_C4",
        "A3_B3_C3",
        "A3_B3_C4",
        "A3_B4_C1",
        "A4_B1_C1",
        "A4_B1_C3",
        "A4_B2_C4",
        "A4_B3_C1",
        "A4_B3_C2",
        "A4_B4_C2"
      ],
      [
        "A1_B1_C1",
        "A1_B2_C2",
        "A1_B2_C4",
        "A1_B3_C2",
        "A1_B3_C4",
        "A1_B4_C3",
        "A2_B1_C1",
        "A2_B1_C4",
        "A2_B2_C2",
        "A2_B3_C2",
        "A2_B3_C3",
        "A2_B4_C4",
        "A3_B1_C1",
        "A3_B1_C3",
        "A3_B2_C1",
        "A3_B4_C2",
        "A3_B4_C3",
        "A3_B4_C4",
        "A4_B1_C1",
        "A4_B2_C2",
        "A4_B2_C3",
        "A4_B3_C3",
        "A4_B3_C4",
        "A4_B4_C1"
      ]
    ]
  }
};
