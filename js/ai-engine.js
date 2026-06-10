/**
 * カスハラ・インジケータ — AI Engine
 *
 * Ollama (Gemma 4: 26b-a4b-it-qat) ローカルLLM連携 + フォールバックレポート生成
 */

const AIEngine = (() => {
  'use strict';

  // --- Ollama Configuration ---
  const OLLAMA_BASE_URL = 'http://localhost:11434';
  const OLLAMA_MODEL = 'gemma4:26b-a4b-it-qat';

  /**
   * Ollamaサーバーの接続確認
   * @returns {Promise<boolean>}
   */
  async function checkConnection() {
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return false;
      const data = await res.json();
      // モデルが存在するかチェック
      const models = (data.models || []).map(m => m.name || m.model || '');
      return models.some(name => name.startsWith('gemma4:26b'));
    } catch {
      return false;
    }
  }

  /**
   * レポートを生成（Ollama or フォールバック）
   * @param {Object} subjectInfo - 児童・来園者情報
   * @param {Object} scoreData - スコアリング結果
   * @param {Object} riskLevel - リスクレベル
   * @returns {Promise<Object>} AI生成レポート
   */
  async function generateReport(subjectInfo, scoreData, riskLevel) {
    const connected = await checkConnection();

    if (!connected) {
      console.warn('Ollama not available, using fallback report');
      return generateFallbackReport(subjectInfo, scoreData, riskLevel);
    }

    try {
      const prompt = buildPrompt(subjectInfo, scoreData, riskLevel);
      const response = await callOllamaAPI(prompt);
      const parsed = parseAIResponse(response);
      if (parsed) return parsed;
      // パース失敗時はフォールバック
      return generateFallbackReport(subjectInfo, scoreData, riskLevel);
    } catch (error) {
      console.warn('Ollama API error, falling back to rule-based report:', error);
      return generateFallbackReport(subjectInfo, scoreData, riskLevel);
    }
  }

  /**
   * プロンプト構築
   */
  function buildPrompt(subjectInfo, scoreData, riskLevel) {
    const categoryDetails = scoreData.categories.map(cat => {
      const levelText = cat.score === 0 ? '予兆なし' :
                        cat.score <= 1 ? '軽微な予兆' :
                        cat.score <= 2 ? '注意すべき予兆' :
                        cat.score <= 3 ? '明確な予兆' : '強い予兆';
      return `- ${cat.name}（${cat.shortName}）: ${cat.score}/${cat.maxScore}点 → ${levelText}`;
    }).join('\n');

    const highlightCats = ScoringEngine.detectHighlightCategories(scoreData.categories);
    const highlightText = highlightCats.length > 0
      ? `\n\n【突出カテゴリ】以下のカテゴリでスコアが特に高い：\n${highlightCats.map(c => `- ${c.shortName}: ${c.score}/${c.maxScore}点`).join('\n')}`
      : '';

    return `あなたは保育施設におけるカスタマーハラスメント（カスハラ）対策の専門AIアドバイザーです。
厚生労働省「カスタマーハラスメント対策企業マニュアル」および、こども家庭庁の保育所運営指針に精通しています。

以下のリスク評価データに基づき、保育施設の現場スタッフ向けに具体的な対応策レポートを生成してください。

【評価対象情報】
- 児童イニシャル: ${subjectInfo.initials}
- 児童性別: ${subjectInfo.gender}
- 児童誕生年月: ${subjectInfo.birthYear}年${subjectInfo.birthMonth}月
- 評価対象保護者: ${subjectInfo.visitor}
- 同席状況: ${subjectInfo.accompany}

【リスクスコア】
- 合計: ${scoreData.totalScore} / ${scoreData.maxScore}点
- リスク判定: ${riskLevel.label}

【カテゴリ別スコア】
${categoryDetails}
${highlightText}

【出力形式】
以下のJSON形式で厳密に出力してください。他のテキストは一切含めないでください。

{
  "overview": "（3〜4文で、全体的な分析所見を記述。どのカテゴリが高リスクか、入園後にどのようなトラブルが想定されるかを具体的に）",
  "proposals": [
    {
      "title": "現場スタッフの初期対応",
      "subtitle": "心理的負担軽減と接遇",
      "items": [
        {
          "title": "（具体的な対応策のタイトル）",
          "body": "（200字程度で、厚労省指針やこども家庭庁指針に基づく具体的行動を記述。「〜してください」という語尾で）"
        },
        {
          "title": "（2つ目の対応策タイトル）",
          "body": "（同上）"
        }
      ]
    },
    {
      "title": "組織・チームとしての防衛体制",
      "subtitle": "エスカレーション防止",
      "items": [
        {
          "title": "（具体的な対応策のタイトル）",
          "body": "（同上）"
        },
        {
          "title": "（2つ目の対応策タイトル）",
          "body": "（同上）"
        }
      ]
    },
    {
      "title": "入園手続き時の牽制と記録保全",
      "subtitle": "法的・制度的備え",
      "items": [
        {
          "title": "（具体的な対応策のタイトル）",
          "body": "（同上）"
        },
        {
          "title": "（2つ目の対応策タイトル）",
          "body": "（同上）"
        }
      ]
    }
  ]
}

重要な注意事項:
- 保育施設の文脈に沿った実践的な内容にすること
- 厚労省指針の「組織的対応」「記録保全」「毅然とした態度」の3原則を反映すること
- スコアが低い場合は「安心材料」も提示しつつ、最低限の備えを提案すること
- JSON以外の出力は絶対に行わないこと`;
  }

  /**
   * Ollama API呼び出し（OpenAI互換エンドポイント）
   */
  async function callOllamaAPI(prompt) {
    const url = `${OLLAMA_BASE_URL}/api/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: 'あなたは保育施設のカスタマーハラスメント対策専門AIです。指示されたJSON形式のみで回答してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        format: 'json',
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const text = data.message?.content;

    if (!text) {
      throw new Error('Empty response from Ollama');
    }

    return text;
  }

  /**
   * AIレスポンスのパース
   */
  function parseAIResponse(responseText) {
    try {
      // Clean potential markdown code fences
      let cleaned = responseText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
      }
      const parsed = JSON.parse(cleaned);

      // Validate structure
      if (!parsed.overview || !Array.isArray(parsed.proposals)) {
        throw new Error('Invalid response structure');
      }

      return {
        source: 'ai',
        overview: parsed.overview,
        proposals: parsed.proposals,
      };
    } catch (e) {
      console.warn('Failed to parse AI response:', e);
      return null; // Will trigger fallback
    }
  }

  /**
   * フォールバック: ルールベースのレポート生成
   */
  function generateFallbackReport(subjectInfo, scoreData, riskLevel) {
    const highlightCats = ScoringEngine.detectHighlightCategories(scoreData.categories);
    const highCatNames = highlightCats.map(c => `「${c.shortName}」`).join('・');

    // Overview generation based on risk level
    let overview;
    if (riskLevel.id === 'green') {
      overview = `児童 [${subjectInfo.initials}] の ${subjectInfo.visitor} について、リスク評価を実施しました。合計スコアは ${scoreData.totalScore}/${scoreData.maxScore}点で、現時点では顕著なカスハラ予兆は検出されていません。通常の保育対応で問題ないと判断されますが、入園後の経過観察は引き続き行ってください。`;
    } else if (riskLevel.id === 'yellow') {
      overview = `児童 [${subjectInfo.initials}] の ${subjectInfo.visitor} について、リスク評価を実施しました。合計スコアは ${scoreData.totalScore}/${scoreData.maxScore}点で、${highCatNames || '一部の項目'}において軽度の予兆が検出されました。現時点で深刻なリスクとは言えませんが、入園後にエスカレートする可能性を念頭に、チーム内での情報共有と経過観察を推奨します。`;
    } else if (riskLevel.id === 'orange') {
      overview = `児童 [${subjectInfo.initials}] の ⚠️ ${subjectInfo.visitor} について、リスク評価を実施しました。合計スコアは ${scoreData.totalScore}/${scoreData.maxScore}点で、${highCatNames || '複数のカテゴリ'}において中〜高度のリスク予兆が検出されました。入園後に要求がエスカレートするリスクに備え、公的指針に基づく以下の対応策を推奨します。`;
    } else {
      overview = `児童 [${subjectInfo.initials}] の 🚨 ${subjectInfo.visitor} について、リスク評価を実施しました。合計スコアは ${scoreData.totalScore}/${scoreData.maxScore}点で、${highCatNames || '複数のカテゴリ'}において高いリスクスコアが検出されました。入園受入前に園長・主任を交えた緊急対策会議を開催し、以下の対応策を組織全体で確認・実行することを強く推奨します。`;
    }

    // Build proposals based on score patterns
    const proposals = buildFallbackProposals(scoreData, riskLevel, highlightCats);

    return {
      source: 'fallback',
      overview,
      proposals,
    };
  }

  /**
   * フォールバック提案の構築
   */
  function buildFallbackProposals(scoreData, riskLevel, highlightCats) {
    const isHighRisk = riskLevel.id === 'orange' || riskLevel.id === 'red';
    const catScores = {};
    scoreData.categories.forEach(c => { catScores[c.id] = c.score; });

    // Proposal 1: 現場スタッフの初期対応
    const proposal1Items = [];
    if (catScores[1] >= 2) {
      proposal1Items.push({
        title: '「組織主語」でのバウンダリー（境界線）設定',
        body: '威圧的な態度や命令口調に対しては、「私はお答えできません」ではなく「園の統一ルールでお答えできない決まりです」と組織を主語にして即答を避け、個人のターゲット化を回避してください。1対1の状況を作らず、必ず他のスタッフが見える場所で対応してください。',
      });
    }
    if (catScores[4] >= 2) {
      proposal1Items.push({
        title: 'プライベート詮索への毅然とした対応',
        body: 'スタッフの個人情報（年齢・既婚・経験年数等）への質問には「個人情報についてはお答えしかねます」と一貫して対応してください。特定スタッフへの評価や拒絶があった場合は「職員の配置は園の判断で行います」と組織として対応してください。',
      });
    }
    if (proposal1Items.length === 0) {
      proposal1Items.push({
        title: '共感と拒絶の分離',
        body: '保護者の要望に対しては「ご心配なお気持ちはお察しします」と共感を示した直後に、「ですが園のルールとして個別対応は承りかねます」とキッパリ断るアンガーマネジメントを徹底してください。感情的にならず、常に冷静で丁寧な言葉遣いを心がけましょう。',
      });
      proposal1Items.push({
        title: 'セルフケアの意識',
        body: '対応後は一人で抱え込まず、同僚や上司に報告・相談してください。「自分の対応が悪かったのでは」と自責する必要はありません。保護者の不適切な言動は保護者自身の問題であり、あなた個人の責任ではないことを忘れないでください。',
      });
    }

    // Proposal 2: 組織・チームとしての防衛体制
    const proposal2Items = [];
    if (isHighRisk) {
      proposal2Items.push({
        title: '複数名対応の原則適用（ワンマン対応の禁止）',
        body: '厚労省の「組織的対応」指針に基づき、今後当該保護者の来園・電話対応時は、絶対に現場スタッフ1人（特に若手）に任せず、必ず園長や主任を含む「複数名（2名以上）」での対応体制を組んでください。シフト表にも対応者2名を明記してください。',
      });
    }
    proposal2Items.push({
      title: '評価結果のチーム内共有',
      body: `本リスク評価の結果を朝礼等で共有し、${isHighRisk ? '「ルールの特例を求め、スタッフの力量を測る傾向がある」という客観的事実を周知。誰が対応しても毅然と対応できるようスタンスを統一してください。' : '全スタッフが同じ情報を共有した上で、統一的な対応方針を確認してください。特定の保護者について気になる点があれば、些細なことでも記録・共有する文化を醸成しましょう。'}`,
    });
    if (catScores[3] >= 2) {
      proposal2Items.push({
        title: '面談時間の明確な設定',
        body: '来園・面談時には「本日は○時○分までのお時間です」と事前に所要時間を明示してください。終了時刻になったら「お時間となりましたので、続きは後日改めて」と切り上げるルールを全職員で統一してください。',
      });
    }

    // Proposal 3: 入園手続き時の牽制と記録保全
    const proposal3Items = [
      {
        title: '重要事項説明書による牽制',
        body: `入園契約時、「提供できないサービス（個別対応の限界）」や「迷惑行為があった場合の退園規定」をあえて時間をかけて読み合わせ、必ず「同意の署名」を取得し法的防波堤を構築してください。${isHighRisk ? '特に退園規定については具体的なケースを挙げながら丁寧に説明し、抑止力としてください。' : ''}`,
      },
      {
        title: '事実ベースのインシデント記録',
        body: '「言った・言わない」のトラブルを防ぐため、主観を交えず「いつ・誰が・何を要求し・どう回答したか」を事実ベースで記録簿に残す習慣をつけてください。これが将来的なエスカレーション時の強力な証拠となります。記録はできるだけその日のうちに作成してください。',
      },
    ];

    if (catScores[5] >= 3) {
      proposal3Items.push({
        title: '自治体・弁護士への事前相談ルート確保',
        body: '脅迫的な言動の予兆が高いため、事態がエスカレートした場合に備え、自治体の保育課への相談ルートと、顧問弁護士等の法的アドバイザーへの連絡体制を事前に確認しておいてください。',
      });
    }

    return [
      {
        title: '現場スタッフの初期対応',
        subtitle: '心理的負担軽減と接遇',
        items: proposal1Items,
      },
      {
        title: '組織・チームとしての防衛体制',
        subtitle: 'エスカレーション防止',
        items: proposal2Items,
      },
      {
        title: '入園手続き時の牽制と記録保全',
        subtitle: '法的・制度的備え',
        items: proposal3Items,
      },
    ];
  }

  // Public API
  return {
    checkConnection,
    generateReport,
  };
})();
