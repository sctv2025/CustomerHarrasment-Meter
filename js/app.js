/**
 * カスハラ・インジケータ — Main Application
 *
 * ステップナビゲーション、フォーム状態管理、UI制御
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ============================================================
  // DOM References
  // ============================================================
  const DOM = {
    // Steps
    steps: [
      document.getElementById('step1'),
      document.getElementById('step2'),
      document.getElementById('step3'),
    ],
    stepDots: document.querySelectorAll('.step-dot'),
    stepLines: document.querySelectorAll('.step-line'),

    // Step 1 inputs
    initialLast: document.getElementById('initialLast'),
    initialFirst: document.getElementById('initialFirst'),
    birthYear: document.getElementById('birthYear'),
    birthMonth: document.getElementById('birthMonth'),

    // Buttons
    toStep2Btn: document.getElementById('toStep2Btn'),
    backToStep1Btn: document.getElementById('backToStep1Btn'),
    toStep3Btn: document.getElementById('toStep3Btn'),
    newAssessmentBtn: document.getElementById('newAssessmentBtn'),
    printBtn: document.getElementById('printBtn'),

    // Step 2 inputs
    staffMemo: document.getElementById('staffMemo'),

    // Step 3 triage elements
    supportPhaseBadge: document.getElementById('supportPhaseBadge'),
    supportPhaseIcon: document.getElementById('supportPhaseIcon'),
    supportPhaseLabel: document.getElementById('supportPhaseLabel'),
    staffCareMessage: document.getElementById('staffCareMessage'),
    complexityFactors: document.getElementById('complexityFactors'),
    recommendedActionText: document.getElementById('recommendedActionText'),

    // Step 3 report elements
    gaugeFill: document.getElementById('gaugeFill'),
    gaugeScore: document.getElementById('gaugeScore'),
    riskBadge: document.getElementById('riskBadge'),
    riskBadgeIcon: document.getElementById('riskBadgeIcon'),
    riskBadgeText: document.getElementById('riskBadgeText'),
    subjectInfoBar: document.getElementById('subjectInfoBar'),
    analysisOverview: document.getElementById('analysisOverview'),
    reportCards: document.getElementById('reportCards'),

    // Loading
    loadingOverlay: document.getElementById('loadingOverlay'),

    // Settings
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    apiStatusDot: document.getElementById('apiStatusDot'),
    apiStatusText: document.getElementById('apiStatusText'),
    connectionHint: document.getElementById('connectionHint'),
    modalReconnectBtn: document.getElementById('modalReconnectBtn'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
  };

  let currentStep = 1;

  // ============================================================
  // Initialization
  // ============================================================
  async function init() {
    populateBirthYears();
    setupEventListeners();
    await updateConnectionStatus();
  }

  /**
   * 誕生年プルダウンを生成（現在年から10年前まで）
   */
  function populateBirthYears() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 10; year--) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = `${year}年`;
      DOM.birthYear.appendChild(option);
    }
  }

  // ============================================================
  // Event Listeners
  // ============================================================
  function setupEventListeners() {
    // Navigation
    DOM.toStep2Btn.addEventListener('click', handleToStep2);
    DOM.backToStep1Btn.addEventListener('click', () => goToStep(1));
    DOM.toStep3Btn.addEventListener('click', handleToStep3);
    DOM.newAssessmentBtn.addEventListener('click', handleNewAssessment);
    DOM.printBtn.addEventListener('click', () => window.print());

    // Settings modal
    DOM.settingsBtn.addEventListener('click', openSettingsModal);
    DOM.modalCloseBtn.addEventListener('click', closeSettingsModal);
    DOM.modalReconnectBtn.addEventListener('click', handleReconnect);
    DOM.settingsModal.addEventListener('click', (e) => {
      if (e.target === DOM.settingsModal) closeSettingsModal();
    });

    // Keyboard: Escape closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && DOM.settingsModal.classList.contains('active')) {
        closeSettingsModal();
      }
    });
  }

  // ============================================================
  // Step Navigation
  // ============================================================
  function goToStep(stepNum) {
    // Hide all steps
    DOM.steps.forEach(s => s.classList.remove('active'));

    // Show target step
    DOM.steps[stepNum - 1].classList.add('active');

    // Update indicator dots
    DOM.stepDots.forEach(dot => {
      const dotStep = parseInt(dot.dataset.step, 10);
      dot.classList.remove('active', 'completed');

      if (dotStep === stepNum) {
        dot.classList.add('active');
      } else if (dotStep < stepNum) {
        dot.classList.add('completed');
      }
    });

    // Update connector lines
    DOM.stepLines.forEach(line => {
      const lineIdx = parseInt(line.dataset.line, 10);
      if (lineIdx < stepNum) {
        line.classList.add('filled');
      } else {
        line.classList.remove('filled');
      }
    });

    currentStep = stepNum;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============================================================
  // Step 1 → 2 Validation
  // ============================================================
  function handleToStep2() {
    let isValid = true;

    // Validate initials
    const fieldInitials = document.getElementById('fieldInitials');
    if (!DOM.initialLast.value || !DOM.initialFirst.value) {
      fieldInitials.classList.add('error');
      isValid = false;
    } else {
      fieldInitials.classList.remove('error');
    }

    // Validate gender
    const fieldGender = document.getElementById('fieldGender');
    if (!document.querySelector('input[name="gender"]:checked')) {
      fieldGender.classList.add('error');
      isValid = false;
    } else {
      fieldGender.classList.remove('error');
    }

    // Validate birth year/month
    const fieldBirth = document.getElementById('fieldBirth');
    if (!DOM.birthYear.value || !DOM.birthMonth.value) {
      fieldBirth.classList.add('error');
      isValid = false;
    } else {
      fieldBirth.classList.remove('error');
    }

    // Validate visitor
    const fieldVisitor = document.getElementById('fieldVisitor');
    if (!document.querySelector('input[name="visitor"]:checked')) {
      fieldVisitor.classList.add('error');
      isValid = false;
    } else {
      fieldVisitor.classList.remove('error');
    }

    // Validate accompany
    const fieldAccompany = document.getElementById('fieldAccompany');
    if (!document.querySelector('input[name="accompany"]:checked')) {
      fieldAccompany.classList.add('error');
      isValid = false;
    } else {
      fieldAccompany.classList.remove('error');
    }

    if (isValid) {
      goToStep(2);
    } else {
      // Scroll to first error
      const firstError = document.querySelector('.field-group.error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  // ============================================================
  // Step 2 → 3: Scoring + AI Report
  // ============================================================
  async function handleToStep3() {
    // Validate all questions answered
    if (!ScoringEngine.validateAllAnswered()) {
      const unanswered = ScoringEngine.getUnansweredQuestions();
      // Highlight unanswered categories
      unanswered.forEach(qName => {
        const categoryNum = qName.split('_')[0].replace('q', '');
        const module = document.getElementById(`category${categoryNum}`);
        if (module) {
          module.style.borderColor = 'var(--risk-red)';
          module.style.boxShadow = '0 0 12px rgba(248, 113, 113, 0.15)';
          setTimeout(() => {
            module.style.borderColor = '';
            module.style.boxShadow = '';
          }, 3000);
        }
      });

      // Scroll to first unanswered
      if (unanswered.length > 0) {
        const categoryNum = unanswered[0].split('_')[0].replace('q', '');
        const module = document.getElementById(`category${categoryNum}`);
        if (module) module.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Show loading
    DOM.loadingOverlay.classList.add('active');

    // Calculate scores
    const scoreData = ScoringEngine.calculateScores();
    const riskLevel = ScoringEngine.getRiskLevel(scoreData.totalScore);

    // Gather subject info
    const subjectInfo = getSubjectInfo();

    // Build staff memo (use textarea or synthesize from scores)
    const staffMemo = buildStaffMemo();

    // Run triage pipeline (ELYZA + Tanuki) and legacy report in parallel
    const [triageResult, report] = await Promise.all([
      TriageEngine.analyzeAndTranslateMemo(staffMemo, scoreData),
      AIEngine.generateReport(subjectInfo, scoreData, riskLevel),
    ]);

    // Render report
    renderReport(subjectInfo, scoreData, riskLevel, report, triageResult);

    // Hide loading
    DOM.loadingOverlay.classList.remove('active');

    // Navigate to step 3
    goToStep(3);
  }

  /**
   * 職員メモを構築（テキストエリア優先、空なら構造化評価から合成）
   */
  function buildStaffMemo() {
    const memo = DOM.staffMemo?.value?.trim();
    if (memo) return memo;

    const scoreData = ScoringEngine.calculateScores();
    const highlights = ScoringEngine.detectHighlightCategories(scoreData.categories);
    if (highlights.length === 0) {
      return '初対面時の特記事項なし。構造化評価のみ実施。';
    }

    return highlights.map(cat => {
      const items = cat.questions.map((qName, i) => {
        const selected = document.querySelector(`input[name="${qName}"]:checked`);
        const val = selected ? parseInt(selected.value, 10) : 0;
        if (val === 0) return null;
        const label = document.querySelector(`label[for="${qName}_${val}"]`)?.textContent?.trim();
        return label ? `${cat.shortName}関連: 評価${val}（${label}）` : null;
      }).filter(Boolean);
      return items.join('。');
    }).filter(Boolean).join('。') || '構造化評価に基づく自動生成メモ';
  }

  // ============================================================
  // Gather Subject Info
  // ============================================================
  function getSubjectInfo() {
    return {
      initials: `${DOM.initialLast.value}.${DOM.initialFirst.value}`,
      gender: document.querySelector('input[name="gender"]:checked')?.value || '',
      birthYear: DOM.birthYear.value,
      birthMonth: DOM.birthMonth.value,
      visitor: document.querySelector('input[name="visitor"]:checked')?.value || '',
      accompany: document.querySelector('input[name="accompany"]:checked')?.value || '',
    };
  }

  // ============================================================
  // Render Report (Step 3)
  // ============================================================
  function renderReport(subjectInfo, scoreData, riskLevel, report, triageResult) {
    // --- Gauge Animation ---
    const circumference = 2 * Math.PI * 80; // r=80
    const offset = circumference - (scoreData.percentage / 100) * circumference;
    DOM.gaugeFill.style.stroke = riskLevel.color;
    // Trigger animation after a frame
    requestAnimationFrame(() => {
      DOM.gaugeFill.style.strokeDashoffset = offset;
    });

    // Score counter animation
    animateCounter(DOM.gaugeScore, scoreData.totalScore, 1200);

    // Risk badge
    DOM.riskBadge.className = `risk-badge ${riskLevel.id}`;
    DOM.riskBadgeIcon.textContent = riskLevel.icon;
    DOM.riskBadgeText.textContent = riskLevel.label;

    // Subject info tags
    DOM.subjectInfoBar.innerHTML = `
      <span class="subject-info-tag">👶 児童 <span class="highlight">[${subjectInfo.initials}]</span></span>
      <span class="subject-info-tag">${subjectInfo.gender === '男' ? '👦' : subjectInfo.gender === '女' ? '👧' : '—'} ${subjectInfo.gender}</span>
      <span class="subject-info-tag">📅 ${subjectInfo.birthYear}年${subjectInfo.birthMonth}月生</span>
      <span class="subject-info-tag">⚠️ 評価対象: <span class="highlight">${subjectInfo.visitor}</span></span>
      <span class="subject-info-tag">👥 ${subjectInfo.accompany}</span>
    `;

    // Category breakdown bars
    const barColors = ['#f87171', '#fbbf24', '#fb923c', '#8b5cf6', '#6366f1'];
    scoreData.categories.forEach((cat, i) => {
      const bar = document.getElementById(`bar${i + 1}`);
      const scoreEl = document.getElementById(`catScore${i + 1}`);
      if (bar) {
        bar.style.background = barColors[i];
        // Animate bar width
        requestAnimationFrame(() => {
          bar.style.width = `${cat.percentage}%`;
        });
      }
      if (scoreEl) {
        scoreEl.textContent = `${cat.score}/${cat.maxScore}`;
        scoreEl.style.color = cat.score >= 3 ? barColors[i] : '';
      }
    });

    // Triage results (primary output)
    if (triageResult) {
      renderTriage(triageResult);
    }

    // AI Analysis (supplementary)
    if (report) {
      DOM.analysisOverview.textContent = report.overview;

      // Report Cards
      DOM.reportCards.innerHTML = report.proposals.map((proposal, idx) => `
        <div class="report-card open" id="reportCard${idx}">
          <div class="report-card-header" onclick="toggleReportCard(${idx})">
            <span class="report-card-number">提案${idx + 1}</span>
            <span class="report-card-title">💡 ${proposal.title}<br><small style="color:var(--text-tertiary);font-weight:500;">${proposal.subtitle}</small></span>
            <span class="report-card-toggle" aria-hidden="true">▼</span>
          </div>
          <div class="report-card-body">
            <div class="report-card-content">
              ${proposal.items.map(item => `
                <div class="report-item">
                  <div class="report-item-title">▸ ${item.title}</div>
                  <div class="report-item-body">${item.body}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  /**
   * トリアージ結果の描画
   */
  function renderTriage(triageResult) {
    const { raw_triage_data: triage, staff_feedback: careMessage, phase_info: phase } = triageResult;

    DOM.supportPhaseBadge.style.background = phase.bg;
    DOM.supportPhaseBadge.style.borderColor = phase.color;
    DOM.supportPhaseIcon.textContent = phase.icon;
    DOM.supportPhaseLabel.textContent = phase.label;
    DOM.supportPhaseLabel.style.color = phase.color;

    DOM.staffCareMessage.textContent = careMessage;

    DOM.complexityFactors.innerHTML = triage.complexity_factors.map(f => `
      <div class="complexity-factor-item">
        <div class="complexity-factor-name">${escapeHtml(f.factor_name)}</div>
        <div class="complexity-factor-reason">${escapeHtml(f.reason)}</div>
      </div>
    `).join('');

    DOM.recommendedActionText.textContent = triage.recommended_action || '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 数値カウンターアニメーション
   */
  function animateCounter(element, target, duration) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out expo
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);

      element.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // ============================================================
  // New Assessment
  // ============================================================
  function handleNewAssessment() {
    // Reset all forms
    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
    if (DOM.staffMemo) DOM.staffMemo.value = '';

    // Reset error states
    document.querySelectorAll('.field-group.error').forEach(f => f.classList.remove('error'));

    // Reset gauge
    DOM.gaugeFill.style.strokeDashoffset = 502.65;
    DOM.gaugeScore.textContent = '0';

    // Reset bars
    for (let i = 1; i <= 5; i++) {
      const bar = document.getElementById(`bar${i}`);
      if (bar) bar.style.width = '0%';
    }

    // Go to step 1
    goToStep(1);
  }

  // ============================================================
  // Settings Modal (Ollama Connection Status)
  // ============================================================
  function openSettingsModal() {
    DOM.settingsModal.classList.add('active');
    updateConnectionStatus();
  }

  function closeSettingsModal() {
    DOM.settingsModal.classList.remove('active');
  }

  function isFileProtocol() {
    return window.location.protocol === 'file:';
  }

  function getRecommendedAppUrl() {
    return 'http://localhost:8787/index.html';
  }

  async function handleReconnect() {
    DOM.modalReconnectBtn.disabled = true;
    DOM.modalReconnectBtn.textContent = '接続確認中...';
    const connected = await updateConnectionStatus();
    DOM.modalReconnectBtn.disabled = false;
    DOM.modalReconnectBtn.textContent = connected ? '✅ 接続済み' : '🔄 再接続';
    if (!connected) {
      setTimeout(() => {
        DOM.modalReconnectBtn.textContent = '🔄 再接続';
      }, 2500);
    }
  }

  async function updateConnectionStatus() {
    if (isFileProtocol()) {
      DOM.apiStatusDot.classList.remove('connected');
      DOM.apiStatusText.textContent = 'file:// では Ollama に接続できません';
      if (DOM.connectionHint) {
        DOM.connectionHint.hidden = false;
        DOM.connectionHint.textContent =
          `ブラウザの制限により、HTML を直接開くと AI 接続は常に失敗します。ターミナルで python3 -m http.server 8787 を実行し、${getRecommendedAppUrl()} で開いてください。（8765 は別アプリが使用中のことがあります）`;
      }
      return false;
    }

    const triageConnected = await TriageEngine.checkConnection();
    const aiConnected = await AIEngine.checkConnection();
    const connected = triageConnected || aiConnected;
    DOM.apiStatusDot.classList.toggle('connected', connected);
    DOM.apiStatusText.textContent = connected
      ? 'Ollama接続済み — 二段エージェント解析モード'
      : 'Ollama未接続 — ルールベースモード';
    if (DOM.connectionHint) {
      DOM.connectionHint.hidden = connected;
      if (!connected) {
        DOM.connectionHint.textContent =
          `Ollama（http://localhost:11434）が起動しているか確認してください。アプリは ${getRecommendedAppUrl()} から開いてください。`;
      }
    }
    return connected;
  }

  // ============================================================
  // Start
  // ============================================================
  init();
});

/**
 * Report card toggle (global for inline onclick)
 */
function toggleReportCard(idx) {
  const card = document.getElementById(`reportCard${idx}`);
  if (card) card.classList.toggle('open');
}
