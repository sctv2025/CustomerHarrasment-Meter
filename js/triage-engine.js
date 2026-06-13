/**
 * 利用者苦情対応の支援・教育ソフト — 対応難易度・トリアージエンジン
 *
 * Agent 1 (ELYZA): 厳格なJSON推論 — 倫理的マスキング付きトリアージ
 * Agent 2 (Tanuki): 職員向け温かいケアメッセージへの翻訳
 *
 * 根拠: js/reference-resources.js（厚労省5類型・6次元・倫理3原則）
 */

const TriageEngine = (() => {
  'use strict';

  const OLLAMA_BASE_URL = 'http://localhost:11434';
  const ELYZA_MODEL = 'elyza8b:latest';
  const TANUKI_MODEL = 'tanuki8b:latest';
  const FALLBACK_MODEL = 'gemma4:26b-a4b-it-qat';

  const MODEL_ALIASES = {
    elyza: ['elyza8b', 'elyza-8b'],
    tanuki: ['tanuki8b', 'tanuki-8x8b', 'tanuki8'],
  };

  const SUPPORT_PHASES = {
    Phase_1_Standard: {
      id: 'phase1',
      label: 'Phase 1 — 通常対応',
      shortLabel: '通常対応',
      color: 'var(--risk-green)',
      bg: 'var(--risk-green-bg)',
      icon: '🟢',
    },
    Phase_2_Careful: {
      id: 'phase2',
      label: 'Phase 2 — 注意深い傾聴と記録',
      shortLabel: '注意深い対応',
      color: 'var(--risk-yellow)',
      bg: 'var(--risk-yellow-bg)',
      icon: '🟡',
    },
    Phase_3_Pair_Response: {
      id: 'phase3',
      label: 'Phase 3 — 複数名での対応必須',
      shortLabel: '複数名対応',
      color: 'var(--risk-orange)',
      bg: 'var(--risk-orange-bg)',
      icon: '🟠',
    },
    Phase_4_Manager_Escalation: {
      id: 'phase4',
      label: 'Phase 4 — 管理者介入・引継ぎ',
      shortLabel: '管理者介入',
      color: 'var(--risk-red)',
      bg: 'var(--risk-red-bg)',
      icon: '🔴',
    },
  };

  const ELYZA_SYSTEM_PROMPT = `あなたは保育施設の職員の心理的安全性を守るための「対応難易度・トリアージエンジン」です。
「利用者苦情対応の支援・教育ソフト」の中核モジュールとして、職員が記録した初対面時（電話・見学など）のメモから、将来的なコミュニケーションの齟齬やスタッフへの心理的負荷リスクを推論し、JSON形式で出力してください。

${typeof ReferenceResources !== 'undefined' ? ReferenceResources.getPromptContext() : ''}

# 判定の基本方針（重要：オーバートリアージの徹底）
・スタッフの心理的保護が最優先です。わずかな違和感やルールの逸脱が見られる場合も、躊躇なく「対応フェーズ（負荷）」を高く設定してください（見逃しは重大なシステムエラーとみなします）。
・ただし、出力結果は保護者の人格を否定・ラベリングするものであってはなりません。あくまで「現在の状況の難易度」と「組織として必要な支援体制」に変換して出力してください。

# 内部評価指標（この6次元で内部的に厳しく推論を行うこと）
1. 他罰・被害者意識（過去の不満が強く、施設への期待が過剰になりやすいか）
2. ルールの微小侵犯（時間外要求など、ルールの枠組みをテストする行為）
3. 個人領域への介入（職員のプライバシーへの踏み込み）
4. 特権の要求（特別扱いを求めるアーリーマウント）
5. 通信・境界の侵害（公式窓口を迂回した個人への接触兆候）
6. 権力勾配の乱用（専門職を見下す、心理的な威圧）

# 出力への変換ルール（倫理的マスキング）
上記の内部推論で検知したリスクを、以下の「状況の難易度（complexity_factor）」に翻訳して出力してください。
・1の検知 → 「期待値調整の難易度高（過去の不満から、当施設への要求が過大になりやすい状況）」
・2の検知 → 「境界線（バウンダリー）維持の必要性（ルールの再確認が必要な状況）」
・3の検知 → 「専門的距離感の確保（スタッフの心理的負担が高い状況）」
・4の検知 → 「公平性維持の難易度（特別対応を求められやすく、他児との公平な保育が難しくなる状況）」
・5の検知 → 「公式ルートへの誘導必須（個人宛の連絡リスクがあり、組織対応が急務な状況）」
・6の検知 → 「心理的安全性リスク（威圧的態度により、スタッフが萎縮しやすい状況）」

重要: complexity_factors の factor_name には内部指標名（他罰・被害者意識等）を使わず、必ず上記の変換後の文言をそのまま使用すること。
メモから読み取れる兆候は、複数ある場合でも漏れなくすべて検知し、complexity_factorsの配列に個別オブジェクトとして追加してください。

# 出力形式（必ず以下のJSON形式のみを出力すること）
{
  "support_phase": "Phase_1_Standard (通常対応)" | "Phase_2_Careful (注意深い傾聴と記録)" | "Phase_3_Pair_Response (複数名での対応必須)" | "Phase_4_Manager_Escalation (管理者介入・引継ぎ)",
  "complexity_factors": [
    {
      "factor_name": "変換ルールに基づく状況の難易度",
      "reason": "入力メモのどの部分からその難易度を推論したかの客観的な根拠（保護者を批判する言葉を使わず、状況の描写に留めること）"
    }
  ],
  "recommended_action": "現場スタッフが直ちに行うべき自己防衛アクションを1つ提示"
}`;

  /**
   * 利用可能なモデル一覧を取得
   */
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

  /**
   * モデル名の解決（完全一致 → エイリアス → フォールバック）
   */
  function resolveModel(preferred, available, aliasKey) {
    if (available.includes(preferred)) return preferred;

    const base = preferred.split(':')[0];
    const exact = available.find(m => m === preferred || m.startsWith(`${base}:`));
    if (exact) return exact;

    if (aliasKey && MODEL_ALIASES[aliasKey]) {
      for (const alias of MODEL_ALIASES[aliasKey]) {
        const match = available.find(m => m.startsWith(alias));
        if (match) return match;
      }
    }

    if (available.some(m => m.startsWith('gemma4:26b'))) {
      return available.find(m => m.startsWith('gemma4:26b'));
    }
    return available[0] || null;
  }

  /**
   * Ollama接続確認
   */
  async function checkConnection() {
    const models = await getAvailableModels();
    return models.length > 0;
  }

  /**
   * Ollama chat API 呼び出し
   */
  async function callOllamaChat(model, messages, { temperature = 0.1, jsonMode = false } = {}) {
    const body = {
      model,
      messages,
      stream: false,
      options: {
        temperature,
        num_predict: 2048,
      },
    };
    if (jsonMode) body.format = 'json';

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const text = data.message?.content;
    if (!text) throw new Error('Empty response from Ollama');
    return text;
  }

  /**
   * トリアージJSONのパースと検証
   */
  function parseTriageJSON(responseText) {
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
    }
    const parsed = JSON.parse(cleaned);

    if (!parsed.support_phase || !Array.isArray(parsed.complexity_factors)) {
      throw new Error('Invalid triage structure');
    }

    return {
      support_phase: parsed.support_phase,
      complexity_factors: parsed.complexity_factors,
      recommended_action: parsed.recommended_action || '',
    };
  }

  /**
   * support_phase 文字列からフェーズ定義を取得
   */
  function getPhaseInfo(supportPhaseStr) {
    const key = Object.keys(SUPPORT_PHASES).find(k => supportPhaseStr.includes(k));
    return SUPPORT_PHASES[key] || SUPPORT_PHASES.Phase_1_Standard;
  }

  /**
   * 構造化評価スコアをメモ補足として整形
   */
  function buildScoreContext(scoreData) {
    if (!scoreData) return '';
    const lines = scoreData.categories.map(cat => {
      const level = cat.score === 0 ? '予兆なし' :
        cat.score <= 1 ? '軽微' : cat.score <= 2 ? '注意' : '明確';
      return `- ${cat.shortName}: ${cat.score}/${cat.maxScore}点 (${level})`;
    });
    return `\n\n【構造化評価の補足データ（参考）】\n合計: ${scoreData.totalScore}/${scoreData.maxScore}点\n${lines.join('\n')}`;
  }

  /**
   * ルールベースのフォールバックトリアージ
   */
  function generateFallbackTriage(staffInput, scoreData) {
    const text = staffInput.toLowerCase();
    const factors = [];

    const keywordMap = [
      {
        patterns: ['前の園', '前園', '転園', 'クレーム', '不満', '訴え'],
        factor: '期待値調整の難易度高（過去の不満から、当施設への要求が過大になりやすい状況）',
        reason: '過去の施設に関する不満や期待の言及が記録に含まれています',
      },
      {
        patterns: ['時間外', '延長', 'ルール', '例外', '特別に', 'だけ'],
        factor: '境界線（バウンダリー）維持の必要性（ルールの再確認が必要な状況）',
        reason: '運営ルールの枠組みに関する要求や確認が記録に含まれています',
      },
      {
        patterns: ['年齢', '結婚', '彼氏', '彼女', 'プライベート', '個人的', 'LINE', '連絡先'],
        factor: '専門的距離感の確保（スタッフの心理的負担が高い状況）',
        reason: '職員の個人的領域に踏み込む質問や接触の兆候が記録に含まれています',
      },
      {
        patterns: ['特別', '優先', '他の子', 'だけ', '面倒', '個別'],
        factor: '公平性維持の難易度（特別対応を求められやすく、他児との公平な保育が難しくなる状況）',
        reason: '個別対応や特別扱いに関する要求の兆候が記録に含まれています',
      },
      {
        patterns: ['個人', '直接', '私に', '携帯', '個人宛', 'SNS'],
        factor: '公式ルートへの誘導必須（個人宛の連絡リスクがあり、組織対応が急務な状況）',
        reason: '公式窓口を迂回した個人宛の連絡に関する兆候が記録に含まれています',
      },
      {
        patterns: ['見下', 'バカ', '無能', '怒鳴', '威圧', '命令', 'タメ口', '舌打ち'],
        factor: '心理的安全性リスク（威圧的態度により、スタッフが萎縮しやすい状況）',
        reason: '威圧的・不適切な言動の兆候が記録に含まれています',
      },
    ];

    keywordMap.forEach(({ patterns, factor, reason }) => {
      if (patterns.some(p => text.includes(p))) {
        factors.push({ factor_name: factor, reason });
      }
    });

    if (scoreData) {
      scoreData.categories.forEach(cat => {
        if (cat.score >= 2 && !factors.some(f => f.factor_name.includes(cat.shortName))) {
          const factorMap = {
            1: '心理的安全性リスク（威圧的態度により、スタッフが萎縮しやすい状況）',
            2: '公平性維持の難易度（特別対応を求められやすく、他児との公平な保育が難しくなる状況）',
            3: '境界線（バウンダリー）維持の必要性（ルールの再確認が必要な状況）',
            4: '専門的距離感の確保（スタッフの心理的負担が高い状況）',
            5: '心理的安全性リスク（威圧的態度により、スタッフが萎縮しやすい状況）',
          };
          const factorName = factorMap[cat.id];
          if (factorName && !factors.some(f => f.factor_name === factorName)) {
            factors.push({
              factor_name: factorName,
              reason: `構造化評価において「${cat.shortName}」カテゴリで${cat.score}/${cat.maxScore}点が記録されています`,
            });
          }
        }
      });
    }

    const totalScore = scoreData?.totalScore ?? 0;
    const factorCount = factors.length;

    let supportPhase;
    if (totalScore >= 14 || factorCount >= 4) {
      supportPhase = 'Phase_4_Manager_Escalation (管理者介入・引継ぎ)';
    } else if (totalScore >= 10 || factorCount >= 3) {
      supportPhase = 'Phase_3_Pair_Response (複数名での対応必須)';
    } else if (totalScore >= 5 || factorCount >= 1) {
      supportPhase = 'Phase_2_Careful (注意深い傾聴と記録)';
    } else {
      supportPhase = 'Phase_1_Standard (通常対応)';
    }

    const actionMap = {
      Phase_4: '園長・主任を交えた緊急打合せを本日設定し、以降の対応は必ず管理者同席の2名体制で行ってください',
      Phase_3: '次回の面談・電話対応は必ず主任と2名体制で設定し、個人用の連絡先は伝えないでください',
      Phase_2: '対応内容をその日のうちに事実ベースで記録し、チーム内で情報共有してください',
      Phase_1: '通常の対応を継続しつつ、些細な違和感も記録に残す習慣を続けてください',
    };

    const phaseKey = supportPhase.includes('Phase_4') ? 'Phase_4' :
      supportPhase.includes('Phase_3') ? 'Phase_3' :
      supportPhase.includes('Phase_2') ? 'Phase_2' : 'Phase_1';

    return {
      support_phase: supportPhase,
      complexity_factors: factors.length > 0 ? factors : [{
        factor_name: '現時点で顕著な複雑性因子は検出されていません',
        reason: '記録されたメモおよび構造化評価から、重大な対応難易度の上昇要因は限定的です',
      }],
      recommended_action: actionMap[phaseKey],
    };
  }

  /**
   * フォールバックのケアメッセージ（Tanuki不在時）
   */
  function generateFallbackCareMessage(triageData) {
    const phase = getPhaseInfo(triageData.support_phase);
    const factorSummary = triageData.complexity_factors
      .map(f => `・${f.factor_name}`)
      .join('\n');

    return `${phase.icon} お疲れさまです。初対面の記録、丁寧に残してくださってありがとうございます。

今回の状況は「${phase.shortLabel}」のフェーズと判断されました。これは保護者の方を「危険人物」と決めつけるものではなく、「組織としてどの程度の支援体制が必要か」を示すものです。

【状況のポイント】
${factorSummary}

【次に取るべきアクション】
${triageData.recommended_action}

一人で抱え込まないでください。気になることがあれば、いつでも主任や同僚に相談してください。あなたの対応が悪いのではなく、状況の難易度に応じた体制を整えることが大切です。`;
  }

  /**
   * メイン: トリアージ + ケアメッセージ生成
   * @param {string} staffInput - 職員メモ
   * @param {Object} [scoreData] - 構造化評価データ（任意）
   * @returns {Promise<Object>}
   */
  async function analyzeAndTranslateMemo(staffInput, scoreData) {
    const available = await getAvailableModels();
    if (available.length === 0) {
      const fallbackTriage = generateFallbackTriage(staffInput, scoreData);
      return {
        source: 'fallback',
        raw_triage_data: fallbackTriage,
        staff_feedback: generateFallbackCareMessage(fallbackTriage),
        phase_info: getPhaseInfo(fallbackTriage.support_phase),
      };
    }

    const elyzaModel = resolveModel(ELYZA_MODEL, available, 'elyza');
    const tanukiModel = resolveModel(TANUKI_MODEL, available, 'tanuki');
    const userContent = `職員のメモ：${staffInput}${buildScoreContext(scoreData)}`;

    let triageData;
    let triageDataStr;

    try {
      triageDataStr = await callOllamaChat(
        elyzaModel,
        [
          { role: 'system', content: ELYZA_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        { temperature: 0.1, jsonMode: true },
      );
      triageData = parseTriageJSON(triageDataStr);
    } catch (e) {
      console.warn('ELYZA triage failed, using fallback:', e);
      triageData = generateFallbackTriage(staffInput, scoreData);
      triageDataStr = JSON.stringify(triageData, null, 2);
    }

    let careMessage;
    try {
      careMessage = await callOllamaChat(
        tanukiModel,
        [
          {
            role: 'system',
            content: `あなたは保育施設のベテラン主任保育士です。
職員（メモを書いた現場スタッフ）にだけ向けて、温かく寄り添うメッセージを書いてください。

禁止事項:
- 保護者への手紙・メール形式にしない
- 「保護者の方へ」「敬具」等の文体を使わない
- 保護者を「危険人物」「クレーマー」とラベリングしない
- 「主任保育士からのメッセージ」などのメタ発言、ナレーション、挨拶文を前置きしない
- 箇条書きやMarkdownの記号（#や-や*など）を使用しない

必須:
- 「お疲れさまです」など職員への語りかけで始める
- 相手を否定せず、自分の身を守る具体的な次のアクションを提示
- recommended_action の内容を自然な言葉で含める

# 良い出力例 (Few-shot)
「〇〇先生、お疲れさまです。初対面での丁寧な記録をありがとうございます。前の園に対する不満などが聞かれたとのことで、今後は少し期待値調整に配慮が必要かもしれません。先生が一人で抱え込む必要はまったくありませんよ。まずは今日の見学での会話内容を事実ベースで記録し、私たち主任や園長と情報を共有しておきましょう。先生の丁寧な対応はとても心強いです。何かあればいつでも相談してくださいね。」`,
          },
          {
            role: 'user',
            content: `以下のトリアージ判定を読み、メモを書いた職員へのケアメッセージを200〜400字で作成してください。

【判定結果】
${triageDataStr}`,
          },
        ],
        { temperature: 0.6, jsonMode: false },
      );

      // 後処理: 不要なメタ発言や挨拶、Markdown記号などの除去
      careMessage = careMessage.trim();
      careMessage = careMessage.replace(/^(了解しました|承知いたしました|はい、了解しました|はい、承知いたしました|以下にメッセージを作成します|以下はベテラン主任保育士からのメッセージです|以下は主任保育士からのメッセージです)[：:、。]*\s*/i, '');
      careMessage = careMessage.replace(/^[#\-\*\s\n]+/, '');
      careMessage = careMessage.replace(/\n[-#\*=\s]{3,}\n/g, '\n');
      careMessage = careMessage.replace(/(敬具|以上|よろしくお願いいたします|宜しくお願い致します)[。]*$/g, '');
      careMessage = careMessage.trim();
    } catch (e) {
      console.warn('Tanuki translation failed, using fallback:', e);
      careMessage = generateFallbackCareMessage(triageData);
    }

    return {
      source: 'ai',
      raw_triage_data: triageData,
      staff_feedback: careMessage,
      phase_info: getPhaseInfo(triageData.support_phase),
    };
  }

  return {
    checkConnection,
    analyzeAndTranslateMemo,
    getPhaseInfo,
    SUPPORT_PHASES,
  };
})();
