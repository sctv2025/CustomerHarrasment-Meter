/**
 * 教育シミュレーター — Tanuki（保護者ロール）+ ELYZA（採点）
 *
 * 対話型ロールプレイ訓練。Tanuki が要求をエスカレートする保護者役、
 * ELYZA が職員の返答を6次元・3原則で採点する。
 */

const EducationEngine = (() => {
  'use strict';

  const OLLAMA_BASE_URL = 'http://localhost:11434';
  const TANUKI_MODEL = 'tanuki8b:latest';
  const ELYZA_MODEL = 'elyza8b:latest';

  const SCENARIOS = [
    {
      id: 'special-treatment',
      title: '特別扱いの要求',
      description: '延長保育だけ例外で認めてほしいと主張する保護者',
      opening: '見学お疲れさまでした。うちの子だけ延長保育を特別に18時まで預かってほしいんですけど、他の園ではやってくれたんですよ。',
      escalationHints: ['他園との比較', 'SNS投稿の示唆', '個人LINEへの連絡要求'],
    },
    {
      id: 'privacy-probe',
      title: 'プライバシー詮索',
      description: '職員の年齢・経歴を執拗に聞く保護者',
      opening: '先生、失礼ですが何歳なんですか？若い先生だと心配で。結婚は？保育の経験年数も教えてください。',
      escalationHints: ['特定スタッフの拒否', '個人的な評価', '直接連絡先の要求'],
    },
    {
      id: 'past-grievance',
      title: '前園不満・期待過多',
      description: '前の園の悪口を繰り返し、当園への過剰な期待を示す保護者',
      opening: '前の園は最悪でした。先生がバカみたいに扱うんです。だから御園は期待してるんですけど、うちの子だけ特別に見てもらえますよね？',
      escalationHints: ['前園の詳細な悪口', '園長への直接要求', 'ルールの例外要求'],
    },
  ];

  const TANUKI_PARENT_PROMPT = `あなたは保育園の見学・入園相談に来た保護者です。対話型ロールプレイの「練習相手」として、徐々に要求をエスカレートさせてください。

役割:
- 最初は比較的穏やかだが、職員が断ると執拗になる
- 特別扱い、個人情報の詮索、前園との比較、SNS示唆などを段階的に使用
- 1回の返答は80〜150字程度。自然な口語

禁止:
- 暴力的・差別的な extreme な表現
- 職員への人格攻撃の直接的な暴言（予兆レベルに留める）
- 「ロールプレイです」等のメタ発言
- Markdown記号

必須:
- シナリオの opening に沿った人物像を維持
- 職員が境界線を守ったら、別角度から再度要求（エスカレート）`;

  const ELYZA_SCORING_PROMPT = `あなたは保育職員の接遇訓練の採点官です。職員の返答を評価し、JSONのみ出力してください。

${ReferenceResources.getPromptContext()}

採点基準（各0〜2点）:
- boundary: 境界線・ルールの維持（組織主語、毅然とした態度）
- empathy_separation: 共感と拒絶の分離（共感→断り）
- official_route: 公式窓口・組織対応への誘導
- privacy_protection: 個人情報・職員プライバシーの保護
- no_escalation: 職員側の感情的エスカレーション回避
- documentation_hint: 記録・共有の示唆（該当時）

出力形式:
{
  "total_score": 0-10,
  "scores": {
    "boundary": 0-2,
    "empathy_separation": 0-2,
    "official_route": 0-2,
    "privacy_protection": 0-2,
    "no_escalation": 0-2,
    "documentation_hint": 0-2
  },
  "strengths": ["良かった点を1〜2文"],
  "improvements": ["改善点を1〜2文"],
  "model_answer_hint": "より良い返答の方向性を1文"
}`;

  async function getAvailableModels() {
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map(m => m.name || m.model || '');
    } catch {
      return [];
    }
  }

  async function callOllama(model, messages, { temperature = 0.7, jsonMode = false } = {}) {
    const body = {
      model,
      messages,
      stream: false,
      options: { temperature, num_predict: jsonMode ? 1024 : 512 },
    };
    if (jsonMode) body.format = 'json';

    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    return data.message?.content?.trim() || '';
  }

  function resolveModel(preferred, available, aliases) {
    if (available.includes(preferred)) return preferred;
    for (const alias of aliases) {
      const match = available.find(m => m.startsWith(alias));
      if (match) return match;
    }
    return available[0] || null;
  }

  /**
   * 保護者（Tanuki）の次の発言を生成
   */
  async function generateParentReply(scenario, conversationHistory, staffReply) {
    const available = await getAvailableModels();
    const model = resolveModel(TANUKI_MODEL, available, ['tanuki8b', 'tanuki']);

    if (!model) {
      return fallbackParentReply(scenario, conversationHistory.length);
    }

    const historyText = conversationHistory
      .map(turn => `${turn.role === 'parent' ? '保護者' : '職員'}: ${turn.text}`)
      .join('\n');

    const userContent = `【シナリオ】${scenario.title}: ${scenario.description}
【これまでの会話】
${historyText}
職員: ${staffReply}

職員の返答に対し、保護者として次の発言を1つだけ生成してください。要求を少しエスカレートさせてください。`;

    try {
      return await callOllama(model, [
        { role: 'system', content: TANUKI_PARENT_PROMPT },
        { role: 'user', content: userContent },
      ], { temperature: 0.75 });
    } catch {
      return fallbackParentReply(scenario, conversationHistory.length);
    }
  }

  function fallbackParentReply(scenario, turnCount) {
    const hints = scenario.escalationHints || [];
    const hint = hints[Math.min(turnCount, hints.length - 1)] || 'もう一度同じ要求';
    return `えっ、そんな対応なんですか？${hint}について、もう少し柔軟に考えてもらえませんか？`;
  }

  /**
   * 職員返答を採点（ELYZA）
   */
  async function scoreStaffReply(scenario, parentMessage, staffReply, conversationHistory) {
    const available = await getAvailableModels();
    const model = resolveModel(ELYZA_MODEL, available, ['elyza8b', 'elyza']);

    if (!model) {
      return fallbackScore(staffReply);
    }

    const context = conversationHistory
      .slice(-4)
      .map(t => `${t.role === 'parent' ? '保護者' : '職員'}: ${t.text}`)
      .join('\n');

    const userContent = `【シナリオ】${scenario.title}
【直前の保護者発言】${parentMessage}
【職員の返答】${staffReply}
【会話文脈】
${context}

上記の職員返答を採点してください。`;

    try {
      const raw = await callOllama(model, [
        { role: 'system', content: ELYZA_SCORING_PROMPT },
        { role: 'user', content: userContent },
      ], { temperature: 0.1, jsonMode: true });

      let cleaned = raw.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
      }
      return { source: 'ai', ...JSON.parse(cleaned) };
    } catch {
      return fallbackScore(staffReply);
    }
  }

  function fallbackScore(staffReply) {
    const text = staffReply.toLowerCase();
    let boundary = text.includes('ルール') || text.includes('園') || text.includes('決まり') ? 2 : 1;
    let empathy = text.includes('お察し') || text.includes('気持ち') ? 2 : 1;
    let privacy = text.includes('個人') || text.includes('お答え') ? 2 : 0;
    const total = boundary + empathy + privacy + 2;

    return {
      source: 'fallback',
      total_score: Math.min(total, 10),
      scores: {
        boundary,
        empathy_separation: empathy,
        official_route: 1,
        privacy_protection: privacy,
        no_escalation: 1,
        documentation_hint: 0,
      },
      strengths: ['返答を記録できました。Ollama接続時はより詳細な採点が可能です。'],
      improvements: ['「園のルールとして」「個人情報についてはお答えしかねます」等、組織主語と境界線を明示してください。'],
      model_answer_hint: '共感の一文の後に、組織としてのルール説明と毅然とした断りを続けると効果的です。',
    };
  }

  return {
    SCENARIOS,
    generateParentReply,
    scoreStaffReply,
  };
})();
