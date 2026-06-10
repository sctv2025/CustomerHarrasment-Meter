/**
 * カスハラ・インジケータ — Scoring Engine
 * 
 * カテゴリ別スコア集計・リスクレベル判定・偏り分析
 */

const ScoringEngine = (() => {
  'use strict';

  /**
   * カテゴリ定義
   */
  const CATEGORIES = [
    {
      id: 1,
      name: '精神的な攻撃の予兆',
      shortName: '威圧・暴言',
      icon: '⚡',
      questions: ['q1_1', 'q1_2'],
      maxScore: 4,
    },
    {
      id: 2,
      name: '不当・過大な要求の予兆',
      shortName: '特別扱い',
      icon: '👑',
      questions: ['q2_1', 'q2_2'],
      maxScore: 4,
    },
    {
      id: 3,
      name: '執拗な言動・拘束的な行動の予兆',
      shortName: '不退去・リピート',
      icon: '🔄',
      questions: ['q3_1', 'q3_2'],
      maxScore: 4,
    },
    {
      id: 4,
      name: '従業員個人への攻撃の予兆',
      shortName: 'プライバシー侵害',
      icon: '🔍',
      questions: ['q4_1', 'q4_2'],
      maxScore: 4,
    },
    {
      id: 5,
      name: '権威主義・脅迫的な言動の予兆',
      shortName: '権威・脅迫',
      icon: '⚠️',
      questions: ['q5_1', 'q5_2'],
      maxScore: 4,
    },
  ];

  /**
   * リスクレベル定義
   */
  const RISK_LEVELS = [
    {
      id: 'green',
      label: '低リスク（グリーン）',
      icon: '🟢',
      min: 0,
      max: 4,
      color: '#34d399',
      description: '現時点では特段のリスク予兆は検出されませんでした。通常の保育対応で問題ありません。',
    },
    {
      id: 'yellow',
      label: '要注意（イエロー）',
      icon: '🟡',
      min: 5,
      max: 9,
      color: '#fbbf24',
      description: '一部の項目でリスク予兆が検出されました。入園後の経過観察と、チーム内での情報共有を推奨します。',
    },
    {
      id: 'orange',
      label: '警戒（オレンジ）',
      icon: '🟠',
      min: 10,
      max: 14,
      color: '#fb923c',
      description: '複数の項目で中〜高度のリスク予兆が検出されました。組織的な防衛体制の構築を強く推奨します。',
    },
    {
      id: 'red',
      label: '高リスク（レッド）',
      icon: '🔴',
      min: 15,
      max: 20,
      color: '#f87171',
      description: '複数のカテゴリで高いリスクスコアが検出されました。入園受入前に園長・主任を交えた緊急対策会議を推奨します。',
    },
  ];

  /**
   * 各カテゴリのスコアを集計する
   * @returns {Object} { categories: [...], totalScore, maxScore }
   */
  function calculateScores() {
    const results = CATEGORIES.map(cat => {
      let score = 0;
      const questionScores = [];

      cat.questions.forEach(qName => {
        const selected = document.querySelector(`input[name="${qName}"]:checked`);
        const val = selected ? parseInt(selected.value, 10) : 0;
        score += val;
        questionScores.push(val);
      });

      return {
        ...cat,
        score,
        questionScores,
        percentage: (score / cat.maxScore) * 100,
      };
    });

    const totalScore = results.reduce((sum, cat) => sum + cat.score, 0);
    const maxScore = results.reduce((sum, cat) => sum + cat.maxScore, 0);

    return {
      categories: results,
      totalScore,
      maxScore,
      percentage: (totalScore / maxScore) * 100,
    };
  }

  /**
   * トータルスコアからリスクレベルを判定
   * @param {number} totalScore
   * @returns {Object} risk level object
   */
  function getRiskLevel(totalScore) {
    for (const level of RISK_LEVELS) {
      if (totalScore >= level.min && totalScore <= level.max) {
        return level;
      }
    }
    return RISK_LEVELS[RISK_LEVELS.length - 1]; // fallback to highest
  }

  /**
   * 突出しているカテゴリを検出（偏り分析）
   * @param {Array} categories - calculateScores().categories
   * @returns {Array} 突出カテゴリのリスト
   */
  function detectHighlightCategories(categories) {
    return categories
      .filter(cat => cat.score >= 3)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * STEP2のバリデーション: 全質問が回答済みか
   * @returns {boolean}
   */
  function validateAllAnswered() {
    const allQuestions = CATEGORIES.flatMap(cat => cat.questions);
    return allQuestions.every(qName => {
      return document.querySelector(`input[name="${qName}"]:checked`) !== null;
    });
  }

  /**
   * 未回答の質問名リストを返す
   * @returns {string[]}
   */
  function getUnansweredQuestions() {
    const allQuestions = CATEGORIES.flatMap(cat => cat.questions);
    return allQuestions.filter(qName => {
      return document.querySelector(`input[name="${qName}"]:checked`) === null;
    });
  }

  // Public API
  return {
    CATEGORIES,
    RISK_LEVELS,
    calculateScores,
    getRiskLevel,
    detectHighlightCategories,
    validateAllAnswered,
    getUnansweredQuestions,
  };
})();
