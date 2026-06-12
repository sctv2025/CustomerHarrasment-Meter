# カスハラ・インジケータ — 引継書 v0.0.3 ブラウザ検証セッション (2025-06-12)

| 項目 | 内容 |
|---|---|
| バージョン | v0.0.3 |
| HEAD（コミット済み） | `d3ccdcc` |
| 作業ツリー | **未コミット変更あり**（本セッション分・下記参照） |
| リポジトリ | https://github.com/sctv2025/CustomerHarrasment-Meter |
| ブランチ | `main`（`origin/main` 追跡済み） |
| 前回引継書 | `docs/handover_v0.0.3_20250612.md` |
| ローカル LLM | Ollama `http://localhost:11434` |
| 推論モデル | `elyza8b:latest` |
| 翻訳モデル | `tanuki8b:latest` |
| フォールバック | `gemma4:26b-a4b-it-qat` |
| **推奨アプリ URL** | **`http://localhost:8787/index.html`** |

---

## 1. セッション総括

前セッションで実装した ELYZA + Tanuki 二段パイプラインについて、ユーザーがブラウザで Step 2→3 を試した際に「工程表が止まる」「トリアージが見えない」「再接続が効かない」という報告があった。原因調査・ブラウザ E2E 検証・運用手順の確定を実施した。

### 完了

- [x] ブラウザ E2E の根本原因特定（`file://`・ポート競合・v0.0.2 混在）
- [x] `http://localhost:8787` 経由での動作確認（Ollama CORS OK、Step 3 トリアージ表示 OK）
- [x] ポート 8765 が別アプリ（Speech Generator）占有であることを確認
- [x] 設定モーダルに `file://` 検知と接続ヒント UI を追加（**未コミット**）
- [x] 「再接続」ボタンに視覚的フィードバックを追加（**未コミット**）

### 未完了（次セッション）

- [ ] 本セッションの UX 修正（`app.js` / `index.html` / `style.css`）のコミット
- [ ] Tanuki（Phase 2）出力品質改善（前回引継書の継続タスク）
- [ ] 解析完了後にトリアージセクションへ自動スクロール（任意 UX 改善）
- [ ] ローディング中の ELYZA / Tanuki 段階表示（任意 UX 改善）
- [ ] 教育シミュレーター — 未着手

---

## 2. ユーザー報告と原因（重要）

### 症状

| 報告 | 実際の原因 |
|---|---|
| Step 3 の工程表がハイライトせず止まる | 解析中（数十秒〜数分）は Step 2 のまま＋ローディング表示。完了後 Step 3 に遷移する |
| 「対応難易度トリアージ」が見当たらない | v0.0.2 では未実装。v0.0.3 でも **「構造化評価 — 補足提案」の上** にあり、スクロールが必要 |
| 構造化評価 — 補足提案しかない | `file://` または Ollama 未接続でフォールバック動作。トリアージは簡易版または見落とし |
| 再接続ボタンが死んでいる | `file://` では Ollama が常に 403。ボタンは動くが状態が変わらない |
| `localhost:8765/index.html` がない | **8765 は別アプリ**（Speech Generator）。`{"error":"not found"}` を返す |
| v0.0.2 が表示された | ブラウザキャッシュ or 古いタブ。ハードリセットで v0.0.3 に更新済み |

### 3つの必須条件（トリアージ本番動作）

1. **v0.0.3** を開く（ヘッダーバッジで確認）
2. **`file://` 禁止** — ローカル HTTP サーバー経由で開く
3. **Ollama 起動** — ⚙️ で「Ollama接続済み — 二段エージェント解析モード」

---

## 3. 正しい起動手順（運用マニュアル）

```bash
# 1. Ollama が起動していること（別ターミナル）
curl -s http://localhost:11434/api/tags | head

# 2. アプリを HTTP サーバーで配信
cd /Users/yasuhideshinonaga/Antigravity/CustomerHarrasment-Meter
python3 -m http.server 8787

# 3. ブラウザで開く（file:// は使わない）
open http://localhost:8787/index.html
```

### ポートについて

| ポート | 状態 | 備考 |
|---|---|---|
| **8787** | **推奨** | 本アプリ用。本セッションで動作確認済み |
| 8765 | 他アプリ占有 | Speech Generator が応答。カスハラ・インジケータではない |
| 11434 | Ollama | AI 推論用（アプリ配信とは別） |

### CORS 検証結果

| Origin | Ollama `/api/tags` |
|---|---|
| `file://`（`Origin: null`） | **403 Forbidden** → 常にルールベース |
| `http://localhost:8787` | **200 OK** + `Access-Control-Allow-Origin` |

---

## 4. Step 3 画面構成（v0.0.3）

上から順に表示される。ユーザーは④だけ見て「トリアージがない」と報告しがち。

1. ゲージ + リスクバッジ
2. 児童・来園者タグ
3. 5カテゴリ スコア棒グラフ
4. **🛡️ 対応難易度トリアージ**（ELYZA + Tanuki の主出力）
   - support_phase バッジ
   - 職員向けケアメッセージ（Tanuki）
   - complexity_factors
   - recommended_action
5. 🤖 構造化評価 — 補足提案（Gemma 4・従来機能）

**注意:** 「Phase 1→2 パイプライン」は内部エージェント名（ELYZA→Tanuki）。UI の Phase 1〜4 は判定**結果**（support_phase）であり別概念。

---

## 5. 本セッションのコード変更（未コミット）

| ファイル | 変更内容 |
|---|---|
| `js/app.js` | `isFileProtocol()` 追加。`file://` 時に設定モーダルへ明示メッセージ。再接続ボタンの状態フィードバック |
| `index.html` | `#connectionHint` 要素追加 |
| `css/style.css` | `.connection-hint` スタイル追加 |

### 推奨コミットメッセージ（次セッション）

```
fix: file:// 検知と Ollama 接続ヒントを設定モーダルに追加
```

---

## 6. 解析フロー・待ち時間（UX 注意）

「AI解析を実行」押下後:

```
[ローディング表示] Step 2 のまま（上部インジケータ）
        │
        ├─ TriageEngine: ELYZA → Tanuki（直列）
        └─ AIEngine: Gemma 26B レポート（並列）
        │
        ▼ Promise.all 完了後
Step 3 へ遷移 + 描画
```

- Gemma 26B が遅い場合、トリアージ完了後もローディングが続く
- ローディング中に Phase 1/2 の段階ハイライト UI は**未実装**

---

## 7. 既知の課題（継続）

### Tanuki 品質（前回から継続）

- 保護者向け手紙形式になることがある
- Markdown 見出し・冗長出力
- 年齢詮索 factor の独立出力漏れ

### インフラ・運用

- 引継書 v1 の `open index.html` 記載は **`file://` になり得るため非推奨**。必ず HTTP サーバー経由
- 8765 を案内しない（他アプリと競合）

---

## 8. 次セッション作業案

ユーザー意向: **Phase 2（Tanuki）品質改善を実装**

### 推奨タスク（優先順）

1. **本セッション UX 修正のコミット**（`connectionHint` 等）
2. **Tanuki プロンプト最終調整**（few-shot、後処理 regex）
3. **ブラウザ通しテストの定型化**
   - `http://localhost:8787/index.html`
   - 検証メモ: 「見学の時、前の園の悪口を…」
   - Step 3 で「対応難易度トリアージ」表示を確認
4. （任意）解析完了後の自動スクロール、ローディング段階表示

### 参照コード

- トリアージ: `js/triage-engine.js` — `analyzeAndTranslateMemo()`
- UI 統合: `js/app.js` — `handleToStep3()`, `renderTriage()`, `updateConnectionStatus()`
- 前回引継書: `docs/handover_v0.0.3_20250612.md`

---

## 9. Git

| コミット | メッセージ |
|---|---|
| `d3ccdcc` | docs: 引継書に GitHub URL と HEAD を追記 |
| `faad942` | feat: ELYZA+Tanuki 二段トリアージエンジン統合 (v0.0.3) |
| `d700e24` | v0.0.2: カスハラ・インジケータ初期実装 |

```bash
git clone https://github.com/sctv2025/CustomerHarrasment-Meter.git
cd CustomerHarrasment-Meter
python3 -m http.server 8787
# 別途 Ollama 起動 + elyza8b / tanuki8b が必要
open http://localhost:8787/index.html
```

**未コミット:** `css/style.css`, `index.html`, `js/app.js`（本セッション分）

---

*作成: 2025-06-12 / ブラウザ検証・運用トラブルシュートセッション*
