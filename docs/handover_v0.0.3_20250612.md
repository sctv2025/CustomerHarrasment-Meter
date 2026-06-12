# カスハラ・インジケータ — 引継書 v0.0.3 (2025-06-12)

| 項目 | 内容 |
|---|---|
| バージョン | v0.0.3 |
| HEAD | `faad942` |
| リポジトリ | https://github.com/sctv2025/CustomerHarrasment-Meter |
| ブランチ | `main`（`origin/main` 追跡済み） |
| 前回バージョン | v0.0.2（Gemma 4 単体 + 構造化評価のみ） |
| ローカル LLM | Ollama `http://localhost:11434` |
| 推論モデル | `elyza8b:latest` |
| 翻訳モデル | `tanuki8b:latest` |
| フォールバック | `gemma4:26b-a4b-it-qat` |

---

## 1. セッション総括

保育現場向け「対応難易度・トリアージエンジン」を既存のカスハラ・インジケータ（v0.0.2）に統合した。倫理的マスキング（保護者ラベリング回避）を設計思想の中心に据え、**ELYZA（JSON推論）→ Tanuki（職員向けケアメッセージ）** の二段パイプラインを実装・Ollama 上で動作確認済み。

### 完了

- [x] `js/triage-engine.js` 新規作成（6次元推論・倫理マスキング・フォールバック）
- [x] Step 2 に「初対面メモ」入力欄追加
- [x] Step 3 にトリアージ結果 UI（support_phase / complexity_factors / recommended_action / ケアメッセージ）
- [x] `app.js` でトリアージと既存 Gemma レポートを `Promise.all` 並列実行
- [x] Ollama 実モデル名（`elyza8b:latest` / `tanuki8b:latest`）への対応
- [x] ターミナルから Phase 1（ELYZA）→ Phase 2（Tanuki）の実行検証

### 未完了（次セッション）

- [ ] **Phase 2（Tanuki）の品質改善** — 下記「既知の課題」参照
- [ ] 教育シミュレーター（ロールプレイ + ELYZA 採点）— 設計のみ、未着手
- [ ] ブラウザ E2E での Step 2→3 通しテスト
- [x] Git remote 設定・push 完了（`origin` → GitHub）

---

## 2. アーキテクチャ

```
職員メモ（textarea）+ 構造化評価スコア（任意補足）
        │
        ├─► TriageEngine.analyzeAndTranslateMemo()
        │         │
        │         ├─ Phase 1: ELYZA ──► JSON (support_phase, complexity_factors, recommended_action)
        │         └─ Phase 2: Tanuki ──► staff_feedback（職員向けケアメッセージ）
        │
        └─► AIEngine.generateReport() ──► Gemma 4 補足提案（従来どおり）
                    │
                    ▼
              Step 3 UI（トリアージが主、構造化評価は補足）
```

### 倫理設計の3原則（実装方針）

| リスク | 対策 |
|---|---|
| 確証バイアス・レッテル貼り | `support_phase` + 状況の難易度で出力。人格否定禁止 |
| 児童の最善の利益とのコンフリクト | 「排除」ではなく「組織として必要な支援体制」として提示 |
| ブラックボックス・説明責任 | `complexity_factors.reason` に客観的根拠を記録 |

### 6次元 → complexity_factor 変換ルール

| 内部指標 | 出力 factor_name |
|---|---|
| 1. 他罰・被害者意識 | 期待値調整の難易度高（…） |
| 2. ルール微小侵犯 | 境界線（バウンダリー）維持の必要性（…） |
| 3. 個人領域介入 | 専門的距離感の確保（…） |
| 4. 特権要求 | 公平性維持の難易度（…） |
| 5. 通信・境界侵害 | 公式ルートへの誘導必須（…） |
| 6. 権力勾配乱用 | 心理的安全性リスク（…） |

---

## 3. 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `js/triage-engine.js` | **新規** — 二段エージェント・プロンプト・フォールバック |
| `js/app.js` | メモ構築、並列解析、トリアージ UI 描画 |
| `index.html` | メモ入力、トリアージセクション、モデル名表示 v0.0.3 |
| `css/style.css` | メモ入力・トリアージセクションのスタイル |
| `docs/handover_v0.0.3_20250612.md` | 本引継書 |

---

## 4. Ollama 動作確認結果（検証用メモ）

**入力:**
> 見学の時、前の園の悪口をずっと言っていた。私の年齢もしつこく聞かれた。

**Phase 1（ELYZA）出力例（プロンプト改善後）:**
```json
{
  "support_phase": "Phase_2_Careful (注意深い傾聴と記録)",
  "complexity_factors": [
    {
      "factor_name": "期待値調整の難易度高",
      "reason": "前の園の悪口を繰り返し言っていたことから、当施設に対する過剰な期待や不満が既に存在している可能性が推測される。"
    }
  ],
  "recommended_action": "現場スタッフは、見学中の会話内容を記録し、管理者と共有して情報を整理し、必要に応じて事前準備や当日対応の調整を行うこと。"
}
```

**Phase 2（Tanuki）:** 職員向けケアメッセージを生成。初回は保護者手紙形式になったが、プロンプト修正で改善方向。

---

## 5. 既知の課題（次セッション Phase 2 実装の焦点）

### Tanuki（Phase 2）出力品質

1. **宛先の取り違え** — 保護者への手紙形式になることがある  
   → `triage-engine.js` の Tanuki system/user プロンプトで「職員への語りかけのみ」を強化済みだが、要継続チューニング
2. **冗長・構造化しすぎ** — Markdown 見出しや箇条書きが多い  
   → `num_predict` 制限、200〜400字の明示、後処理（「了解しました」等の前置き除去）を検討
3. **factor の取りこぼし** — 年齢詮索（指標3）が complexity_factors に独立して出ないことがある  
   → ELYZA プロンプトで「検知した指標はすべて factor 化」を強化

### ELYZA（Phase 1）

- 初回は `factor_name` に内部指標名（「他罰・被害者意識」）がそのまま出た  
  → プロンプトに「変換後文言を必ず使用」を追加済み。再現性の継続確認が必要

### インフラ

- GitHub: https://github.com/sctv2025/CustomerHarrasment-Meter（public、`main` push 済み）

---

## 6. 次セッション作業案 — Phase 2 実装

ユーザー意向: **次セッションで Phase 2 を実装**

ここでの「Phase 2」は **Tanuki による職員向けケアメッセージ生成の品質完成** を指す（パイプライン骨格は実装済み）。

### 推奨タスク（優先順）

1. **Tanuki プロンプト最終調整**
   - few-shot 例を system に1件追加（良い職員向けメッセージの模範）
   - temperature 0.5〜0.7 で A/B
   - 出力後処理: `了解しました` / `---` / `敬具` 等の除去 regex

2. **ブラウザ通しテスト**
   - `index.html` をローカルサーバー or file:// で開く
   - Step 2 メモ入力 → AI解析 → Step 3 でトリアージ + ケアメッセージ表示を確認
   - Ollama CORS: ブラウザから `localhost:11434` への fetch が通るか確認

3. **（任意）教育シミュレーター Phase 1 着手**
   - Tanuki を「エスカレートする保護者」ロールに反転
   - チャット UI + SSE ストリーミングの骨格

### 参照コード

- トリアージ本体: `js/triage-engine.js` — `analyzeAndTranslateMemo()`, `ELYZA_SYSTEM_PROMPT`, Tanuki messages
- UI 統合: `js/app.js` — `handleToStep3()`, `renderTriage()`
- 設計思想（ユーザー提供）: 倫理3原則、6次元、support_phase 定義

### 検証コマンド（ターミナル）

```bash
# モデル確認
curl -s http://localhost:11434/api/tags | python3 -c "import sys,json; [print(m['name']) for m in json.load(sys.stdin).get('models',[])]"

# Phase 1 のみ（手動）
curl -s http://localhost:11434/api/chat -d '{
  "model": "elyza8b:latest",
  "messages": [{"role":"user","content":"職員のメモ：見学の時、前の園の悪口をずっと言っていた。"}],
  "format": "json",
  "stream": false
}'
```

---

## 7. 制約・継続事項

- データはローカル完結（OLLM）。外部 API 送信なし
- 保護者の人格否定・ラベリングは出力禁止（プロンプト + UI 文言で担保）
- オーバートリアージ方針: 見逃しより過剰警戒を優先
- コミットは明示依頼時のみ（本セッションでユーザー依頼あり）

---

## 8. Git

| コミット | メッセージ |
|---|---|
| `faad942` | feat: ELYZA+Tanuki 二段トリアージエンジン統合 (v0.0.3) |
| `d700e24` | v0.0.2: カスハラ・インジケータ初期実装 |

```bash
git clone https://github.com/sctv2025/CustomerHarrasment-Meter.git
cd CustomerHarrasment-Meter
# Ollama 起動 + elyza8b / tanuki8b が必要
open index.html
```

---

*作成: 2025-06-12 / カスハラ・インジケータ 開発セッション*
