/**
 * 利用者苦情対応の支援・教育ソフト — 根拠リソース定義
 *
 * 判断ツリー（構造化評価・トリアージ）および AI 回答生成の根拠となる
 * 公的指針・法令・本ソフト独自設計を一元管理する。
 */

const ReferenceResources = (() => {
  'use strict';

  const APP = {
    formalName: '利用者苦情対応の支援・教育ソフト',
    shortName: '苦情対応支援・教育',
    version: 'v0.0.4',
    developer: '篠永安秀',
    operator: '保育所さうだーで',
    defaultPort: 8787,
    appUrl: `http://localhost:8787/index.html`,
  };

  /** 厚労省カスハラ5類型に準拠した構造化評価カテゴリの根拠 */
  const SCORING_CATEGORIES = [
    {
      id: 1,
      name: '精神的な攻撃の予兆',
      shortName: '威圧・暴言',
      legalBasis: '厚生労働省「カスタマーハラスメント対策のための指針」類型1 — 精神的な攻撃',
      manualRef: 'カスタマーハラスメント対策企業マニュアル 第2章（精神的な攻撃）',
    },
    {
      id: 2,
      name: '不当・過大な要求の予兆',
      shortName: '特別扱い',
      legalBasis: '厚生労働省「カスタマーハラスメント対策のための指針」類型2 — 不当な要求',
      manualRef: 'カスタマーハラスメント対策企業マニュアル 第2章（不当な要求）',
    },
    {
      id: 3,
      name: '執拗な言動・拘束的な行動の予兆',
      shortName: '不退去・リピート',
      legalBasis: '厚生労働省「カスタマーハラスメント対策のための指針」類型3 — 身体的な範囲を超える行為（執拗性・不退去を含む）',
      manualRef: 'カスタマーハラスメント対策企業マニュアル 第2章（身体的な範囲を超える行為）',
    },
    {
      id: 4,
      name: '従業員個人への攻撃の予兆',
      shortName: 'プライバシー侵害',
      legalBasis: '厚生労働省「カスタマーハラスメント対策のための指針」類型4 — 従業員の人格を否定する言動',
      manualRef: 'カスタマーハラスメント対策企業マニュアル 第2章（人格否定・個人攻撃）',
    },
    {
      id: 5,
      name: '権威主義・脅迫的な言動の予兆',
      shortName: '権威・脅迫',
      legalBasis: '厚生労働省「カスタマーハラスメント対策のための指針」類型5 — 従業員の属性を差別する言動、および脅迫・地位の誇示',
      manualRef: 'カスタマーハラスメント対策企業マニュアル 第2章（差別・脅迫）',
    },
  ];

  /** トリアージ6次元（内部推論）の根拠 */
  const TRIAGE_DIMENSIONS = [
    {
      id: 1,
      internalName: '他罰・被害者意識',
      outputFactor: '期待値調整の難易度高（過去の不満から、当施設への要求が過大になりやすい状況）',
      basis: '厚労省マニュアル「不当な要求」「精神的な攻撃」の予兆分析、こども家庭庁指針（保護者支援・期待値調整）',
    },
    {
      id: 2,
      internalName: 'ルールの微小侵犯',
      outputFactor: '境界線（バウンダリー）維持の必要性（ルールの再確認が必要な状況）',
      basis: '厚労省マニュアル3原則「毅然とした態度」、保育所運営規程・重要事項説明書',
    },
    {
      id: 3,
      internalName: '個人領域への介入',
      outputFactor: '専門的距離感の確保（スタッフの心理的負担が高い状況）',
      basis: '厚労省指針類型4（人格否定・個人攻撃）、個人情報保護・職員のプライバシー',
    },
    {
      id: 4,
      internalName: '特権の要求',
      outputFactor: '公平性維持の難易度（特別対応を求められやすく、他児との公平な保育が難しくなる状況）',
      basis: '厚労省指針類型2（不当な要求）、こども家庭庁「保育所保育指針」（公平な保育）',
    },
    {
      id: 5,
      internalName: '通信・境界の侵害',
      outputFactor: '公式ルートへの誘導必須（個人宛の連絡リスクがあり、組織対応が急務な状況）',
      basis: '厚労省マニュアル3原則「組織的対応」、園の連絡窓口規程',
    },
    {
      id: 6,
      internalName: '権力勾配の乱用',
      outputFactor: '心理的安全性リスク（威圧的態度により、スタッフが萎縮しやすい状況）',
      basis: '厚労省指針類型1・5（精神的攻撃・脅迫）、マニュアル3原則「組織的対応」',
    },
  ];

  /** 公的・法的根拠文献 */
  const LEGAL_REFERENCES = [
    {
      id: 'mhlw-manual',
      title: 'カスタマーハラスメント対策企業マニュアル',
      issuer: '厚生労働省',
      year: '2023（令和5年6月改訂）',
      url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/kurashi/manua.html',
      usage: 'AI補足提案・フォールバック対応策。5類型・3原則（組織的対応・記録保全・毅然とした態度）',
    },
    {
      id: 'mhlw-guideline',
      title: 'カスタマーハラスメント対策のための指針',
      issuer: '厚生労働省',
      year: '2022（令和4年）',
      url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/kurashi/kasuhara.html',
      usage: '構造化評価5カテゴリの類型定義の直接根拠',
    },
    {
      id: 'cfa-hoiku',
      title: '保育所保育指針',
      issuer: 'こども家庭庁（旧こども家庭庁）',
      year: '2023（令和5年）',
      url: 'https://www.cfa.go.jp/policies/hoiku/hoikusho',
      usage: '保育文脈での接遇・保護者支援・公平な保育の原則',
    },
    {
      id: 'jido-fukushi',
      title: '児童福祉法 第3条（児童の最善の利益）',
      issuer: '法律',
      year: '現行法',
      url: 'https://elaws.e-gov.go.jp/document?lawid=407AC0000000164',
      usage: '倫理設計 — 保護者排除ではなく支援体制提示。児童の最善の利益との両立',
    },
    {
      id: 'facility-rules',
      title: '施設運営規程・重要事項説明書',
      issuer: '各保育施設（保育所さうだー）',
      year: '園内規定',
      url: null,
      usage: '境界線維持・退園規定・提供サービスの限界の説明根拠',
    },
  ];

  /** 本ソフト独自の設計根拠（ユーザー提供仕様） */
  const DESIGN_PRINCIPLES = [
    {
      id: 'ethics-1',
      title: '確証バイアス・レッテル貼りの防止',
      detail: '「危険人物」ではなく support_phase と状況の難易度（complexity_factor）で出力',
    },
    {
      id: 'ethics-2',
      title: '児童の最善の利益との両立',
      detail: '排除ではなく「組織として必要な支援体制」として提示（児童福祉法第3条）',
    },
    {
      id: 'ethics-3',
      title: '説明責任（アカウンタビリティ）',
      detail: 'complexity_factors.reason に客観的根拠を記録。外部説明は業務管理言語で行う',
    },
  ];

  const SUPPORT_PHASES = [
    {
      id: 'phase1',
      key: 'Phase_1_Standard',
      label: 'Phase 1 — 通常対応',
      basis: '本ソフト設計 — 顕著な複雑性因子なし。経過観察と記録習慣',
    },
    {
      id: 'phase2',
      key: 'Phase_2_Careful',
      label: 'Phase 2 — 注意深い傾聴と記録',
      basis: '厚労省3原則「記録保全」、オーバートリアージ方針（見逃し防止）',
    },
    {
      id: 'phase3',
      key: 'Phase_3_Pair_Response',
      label: 'Phase 3 — 複数名での対応必須',
      basis: '厚労省3原則「組織的対応」、マニュアル複数名対応の推奨',
    },
    {
      id: 'phase4',
      key: 'Phase_4_Manager_Escalation',
      label: 'Phase 4 — 管理者介入・引継ぎ',
      basis: '厚労省マニュアル エスカレーション・管理者関与、園内危機管理規程',
    },
  ];

  const MHLW_THREE_PRINCIPLES = [
    '組織的対応（個人に任せず組織として対応する）',
    '記録保全（事実ベースで記録し証拠を残す）',
    '毅然とした態度（ルールを毅然として守る）',
  ];

  /**
   * AI プロンプト用の根拠テキスト（短縮版）
   */
  function getPromptContext() {
    const refs = LEGAL_REFERENCES.filter(r => r.url || r.id === 'facility-rules')
      .map(r => `- ${r.title}（${r.issuer}）: ${r.usage}`)
      .join('\n');
    const principles = MHLW_THREE_PRINCIPLES.map(p => `・${p}`).join('\n');
    return `【根拠文献・指針】
${refs}

【厚労省マニュアル3原則】
${principles}

【倫理設計】
${DESIGN_PRINCIPLES.map(p => `・${p.title}: ${p.detail}`).join('\n')}`;
  }

  /**
   * UI 表示用 HTML 生成
   */
  function renderReferencesHtml() {
    const legalItems = LEGAL_REFERENCES.map(r => {
      const link = r.url
        ? `<a href="${r.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a>`
        : escapeHtml(r.title);
      return `<li class="ref-item">
        <div class="ref-item-title">${link}</div>
        <div class="ref-item-meta">${escapeHtml(r.issuer)} / ${escapeHtml(r.year)}</div>
        <div class="ref-item-usage">${escapeHtml(r.usage)}</div>
      </li>`;
    }).join('');

    const categoryItems = SCORING_CATEGORIES.map(c =>
      `<li class="ref-item compact">
        <strong>${escapeHtml(c.shortName)}</strong> — ${escapeHtml(c.legalBasis)}
      </li>`,
    ).join('');

    const triageItems = TRIAGE_DIMENSIONS.map(d =>
      `<li class="ref-item compact">
        <strong>次元${d.id}</strong> ${escapeHtml(d.internalName)} → ${escapeHtml(d.outputFactor.split('（')[0])}
        <span class="ref-basis-note">（${escapeHtml(d.basis)}）</span>
      </li>`,
    ).join('');

    const phaseItems = SUPPORT_PHASES.map(p =>
      `<li class="ref-item compact"><strong>${escapeHtml(p.label)}</strong> — ${escapeHtml(p.basis)}</li>`,
    ).join('');

    return `
      <section class="references-panel" aria-labelledby="refsTitle">
        <h3 class="references-title" id="refsTitle">📚 判断・AI回答の根拠リソース</h3>
        <p class="references-lead">
          本ソフトの構造化評価・トリアージ・AI提案は、以下の公的指針と独自設計に基づきます。
          保護者の人格否定・ラベリングは行いません。
        </p>
        <details class="ref-details" open>
          <summary>公的文献・法令</summary>
          <ul class="ref-list">${legalItems}</ul>
        </details>
        <details class="ref-details">
          <summary>構造化評価5カテゴリ（厚労省5類型準拠）</summary>
          <ul class="ref-list">${categoryItems}</ul>
        </details>
        <details class="ref-details">
          <summary>トリアージ6次元 → 状況の難易度</summary>
          <ul class="ref-list">${triageItems}</ul>
        </details>
        <details class="ref-details">
          <summary>対応フェーズ（support_phase）定義</summary>
          <ul class="ref-list">${phaseItems}</ul>
        </details>
        <details class="ref-details">
          <summary>倫理設計3原則（本ソフト独自）</summary>
          <ul class="ref-list">
            ${DESIGN_PRINCIPLES.map(p =>
              `<li class="ref-item compact"><strong>${escapeHtml(p.title)}</strong> — ${escapeHtml(p.detail)}</li>`,
            ).join('')}
          </ul>
        </details>
      </section>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    APP,
    SCORING_CATEGORIES,
    TRIAGE_DIMENSIONS,
    LEGAL_REFERENCES,
    DESIGN_PRINCIPLES,
    SUPPORT_PHASES,
    MHLW_THREE_PRINCIPLES,
    getPromptContext,
    renderReferencesHtml,
  };
})();
