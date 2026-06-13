# 利用者苦情対応の支援・教育ソフト — 引継書 v0.0.4 (2025-06-13)

| 項目 | 内容 |
|---|---|
| 正式名称 | 利用者苦情対応の支援・教育ソフト |
| バージョン | v0.0.4 |
| 開発者 | 篠永安秀 |
| 運用 | 保育所さうだーで |
| リポジトリ | https://github.com/sctv2025/CustomerHarrasment-Meter |
| ブランチ | `main` |
| 前回バージョン | v0.0.3（ELYZA+Tanuki 二段トリアージ統合） |
| 推奨アクセス URL | **http://localhost:8787/index.html** |
| ローカル LLM | Ollama `http://localhost:11434` |
| 推論モデル | `elyza8b:latest` |
| 翻訳・教育 | `tanuki8b:latest` |
| フォールバック | `gemma4:26b-a4b-it-qat` |

---

## 1. セッション総括

v0.0.3「カスハラ・インジケータ」を正式名称 **「利用者苦情対応の支援・教育ソフト」** に改称し、根拠リソースの一元化・常時アクセス基盤・Tanuki 教育シミュレーターの骨格を実装した。

### 完了

- [x] UI / プロンプト / メタ情報の改称（v0.0.4）
- [x] 開発者・運用表記（篠永安秀 / 保育所さうだーで）
- [x] `js/reference-resources.js` — 判断ツリー・AI 回答の根拠リソース一元管理
- [x] 根拠パネル UI（画面下部）+ ELYZA / Gemma プロンプトへの注入
- [x] `scripts/serve.sh` — ローカル HTTP サーバー起動（ポート 8787）
- [x] `scripts/install-launchd.sh` — macOS ログイン時自動起動（`com.souda.complaint-support`）
- [x] `file://` 警告バナー・接続ヒントの更新
- [x] `js/education-engine.js` + 教育シミュレーター UI（Tanuki 保護者役 / ELYZA 採点）
- [x] 評価モード ↔ 教育モードのタブ切替

### 未完了（次セッション）

- [ ] Tanuki ケアメッセージ品質の継続チューニング（v0.0.3 からの継続）
- [ ] 教育シミュレーター: SSE ストリーミング、難易度段階、終了時総合レポート
- [ ] Tanuki 保護者ロールの few-shot 強化
- [ ] ブラウザ E2E（教育モード通し）

---

## 2. 名称・クレジット

| 項目 | 値 |
|---|---|
| 旧名称 | カスハラ・インジケータ / カスハラメーター |
| 新名称 | 利用者苦情対応の支援・教育ソフト |
| 開発 | 篠永安秀 |
| 運用 | 保育所さうだーで |

---

## 3. 根拠リソース（`js/reference-resources.js`）

プログラムと UI の両方に記載。漏れ防止のためこのファイルが Single Source of Truth。

### 公的文献・法令

| ID | 文献 | 用途 |
|---|---|---|
| mhlw-manual | カスタマーハラスメント対策企業マニュアル | AI 提案・3原則 |
| mhlw-guideline | カスタマーハラスメント対策のための指針 | 構造化評価5類型 |
| cfa-hoiku | 保育所保育指針 | 保育文脈・公平な保育 |
| jido-fukushi | 児童福祉法第3条 | 倫理設計（最善の利益） |
| facility-rules | 施設運営規程・重要事項説明書 | 境界線・退園規定 |

### 判断構造

| レイヤ | 内容 |
|---|---|
| 構造化評価 | 厚労省5類型準拠の5カテゴリ（`ScoringEngine`） |
| トリアージ | 6次元内部推論 → complexity_factor 倫理マスキング（`TriageEngine`） |
| 対応フェーズ | support_phase Phase 1〜4 |
| 倫理3原則 | 確証バイアス防止 / 児童最善 / 説明責任 |
| 厚労省3原則 | 組織的対応 / 記録保全 / 毅然とした態度 |

---

## 4. 常時アクセス（運用手順）

### 必須条件

1. **`file://` 禁止** — 必ず HTTP 経由
2. **Ollama 起動** — ⚙️ で接続確認
3. **v0.0.4** — ヘッダーバッジで確認

### 起動方法

```bash
cd /Users/yasuhideshinonaga/Antigravity/CustomerHarrasment-Meter

# 手動（即時）
./scripts/serve.sh

# ログイン時自動（macOS launchd）
./scripts/install-launchd.sh

# ブラウザ
open http://localhost:8787/index.html
```

### launchd

| 項目 | 値 |
|---|---|
| ラベル | `com.souda.complaint-support` |
| ポート | 8787（127.0.0.1） |
| ログ | `/tmp/complaint-support-server.log` |
| 解除 | `launchctl bootout gui/$(id -u)/com.souda.complaint-support` |

---

## 5. アーキテクチャ（v0.0.4）

```
┌─────────────────────────────────────────────────────────┐
│  評価・解析モード          │  教育シミュレーターモード      │
│  Step1→2→3               │  Tanuki（保護者）↔ 職員       │
│  ELYZA→Tanuki + Gemma    │  ELYZA（採点）                │
└─────────────────────────────────────────────────────────┘
         │                              │
         └────────── Ollama ────────────┘
              elyza8b / tanuki8b / gemma4
```

### 新規ファイル

| ファイル | 役割 |
|---|---|
| `js/reference-resources.js` | 根拠リソース定義・UI生成・プロンプト文脈 |
| `js/education-engine.js` | ロールプレイ（Tanuki）+ 採点（ELYZA） |
| `scripts/serve.sh` | HTTP サーバー起動 |
| `scripts/install-launchd.sh` | 常時起動登録 |

### 変更ファイル

| ファイル | 変更概要 |
|---|---|
| `index.html` | 改称、モードタブ、教育UI、根拠パネル、バナー |
| `js/app.js` | モード切替、教育フロー、根拠描画 |
| `js/triage-engine.js` | 根拠注入、改称 |
| `js/ai-engine.js` | 根拠注入、改称 |
| `js/scoring.js` | 根拠コメント |
| `css/style.css` | バナー、タブ、根拠、教育チャット |

---

## 6. 教育シミュレーター（着手済み）

### シナリオ（3種）

| ID | タイトル |
|---|---|
| special-treatment | 特別扱いの要求 |
| privacy-probe | プライバシー詮索 |
| past-grievance | 前園不満・期待過多 |

### 採点軸（ELYZA / 各0〜2点）

- boundary（境界線・ルール維持）
- empathy_separation（共感と拒絶の分離）
- official_route（公式窓口誘導）
- privacy_protection（プライバシー保護）
- no_escalation（感情的エスカレーション回避）
- documentation_hint（記録・共有の示唆）

### 次セッション推奨

1. Tanuki 保護者プロンプトに few-shot 追加
2. 会話 SSE ストリーミング
3. Phase 連動のエスカレーション難易度
4. セッション終了時の総合フィードバック JSON

---

## 7. 既知の課題（継続）

### Tanuki（トリアージ Phase 2）

- 保護者手紙形式になることがある → プロンプト・後処理で改善中
- factor 取りこぼし（年齢詮索等）→ ELYZA プロンプト継続監視

### 教育モード

- Ollama 未接続時はルールベース採点のみ
- 保護者返答の口調ブレ → few-shot 要

---

## 8. 検証コマンド

```bash
# サーバー確認
curl -sI http://127.0.0.1:8787/index.html | head -3

# Ollama モデル
curl -s http://localhost:11434/api/tags | python3 -c "import sys,json; [print(m['name']) for m in json.load(sys.stdin).get('models',[])]"

# launchd 状態
launchctl print "gui/$(id -u)/com.souda.complaint-support" 2>/dev/null | head -5
```

---

## 9. Git

```bash
git clone https://github.com/sctv2025/CustomerHarrasment-Meter.git
cd CustomerHarrasment-Meter
./scripts/serve.sh   # または install-launchd.sh
open http://localhost:8787/index.html
```

---

*作成: 2025-06-13 / 利用者苦情対応の支援・教育ソフト 開発セッション*
