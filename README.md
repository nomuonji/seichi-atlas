# Seichi Atlas — アニメ聖地の構造化データベース（英語圏向け）

> **このファイルが入口です。** 実装者はここを読んでから `docs/` に進んでください。
> 現状：**Phase 0 のサイト一式・154地点のシードデータ構築済み。**

---

## デプロイ（GitHub → Cloudflare Pages）

サイトは `site/`（Astro）にあり、データは `data/*.yaml` → ビルド時に `site/src/data/*.json` へ変換される。

### GitHub 連携の設定（Cloudflare ダッシュボード）

リポジトリ: `nomuonji/seichi-atlas`（public、デフォルトブランチ `main`）

Cloudflare Pages で「Create project → Connect to Git → nomuonji/seichi-atlas」を選び、以下を設定:

| 項目 | 値 |
|---|---|
| **Production branch** | `main` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `site` |

- `npm ci`（Astro 5 + maplibre-gl + fuse.js + js-yaml + sharp）がビルド時に自動実行される
- ビルドスクリプトは `node ../scripts/build-data.mjs && astro build`。`root directory: site` なので `../scripts/` はリポジトリの `scripts/` を指し、データ変換 → 静的生成が走る
- 出力は `site/dist` → `dist` を指定
- ローカルで `cd site && npm run build` が通ることを確認済み（195ページ生成）

### カスタムドメイン（任意）

`seichiatlas.com` を Pages プロジェクトに追加し、DNS CNAME を `seichiatlas.com -> <project>.pages.dev`（または `sub -> <project>.pages.dev`）にする。`robots.txt`・sitemap・canonical は `site: https://seichiatlas.com` を参照済み。

### オフライン / PWA

`public/sw.js` が Service Worker、`public/manifest.webmanifest` が PWA マニフェスト。ビルド時に `dist/` へコピーされる。

---

## 一行で

日本語ブログ・自治体サイトに散らばっているアニメ聖地（seichi / anime pilgrimage）の情報を、
**座標・アクセス時間・訪問可否・確度**まで構造化し、英語圏とアジア圏の旅行者が
**「東京から日帰りで行ける、実際に入れる聖地」を3クリックで絞り込める**データベースにする。

## なぜこれをやるのか（企画の根拠）

| 事実 | 出所 |
|---|---|
| アニメ関連旅行の検索が**前年比 +195%**（2026年） | Trip.com調査 |
| AnimeJapan 2026 の海外チケット販売が**前年比 +697%**、82の国・地域から | Trip.com |
| 需要の主力は香港・台湾・インドネシア・フィリピン・韓国・中国本土・シンガポールのGen Z/ミレニアル | 同上 |
| 一方、訪日客の**総量は頭打ち**（2026年上半期 -2%、5年ぶり減） | traveldailynews / Mori Trust |

→ **賭けるのは「訪日総量」ではなく「訪日客の構成の変化」**。
聖地巡礼は総量が横ばいでも伸びており、しかも地方に金を落とすので自治体側も歓迎する。

**なぜ今まで誰もやっていないか**：日本語の一次情報（個人の舞台探訪ブログ、自治体特設ページ、
アニメツーリズム協会）を読める英語圏の作り手がいない。逆に英語で書ける日本人も少ない。
**この非対称性が唯一の堀**であり、それ以外に守るものはない。

## 何が既存と違うのか

英語圏の既存は全て「有名20箇所のリスティクル記事」。作品名で引いても座標が出ない。
日本語側には厚いデータがあるが、構造化も英語化もされていない。

差別化は**多軸フィルタ**そのもの。軸が1つならLLMが答えて終わる。軸が5つあるとき初めてUIに価値が出る。

- 作品 × 都道府県/市区町村 × **東京駅からの所要時間** × **訪問可否** × カテゴリ × **最終検証日**
- 出力：**1日ルート生成** / GPX・KML・Googleマイマップ出力 / オフラインPDF

LLMが最も外すのは「座標」「アクセス経路」「今も行けるのか」。**そこだけを正確に持つ。**

## ディレクトリ構成（予定）

```
seichi-atlas/
├── README.md          ← いまここ
├── docs/
│   ├── 00_goal.md         ゴール・成功指標・非目標
│   ├── 10_requirements.md 要件定義（機能・非機能）
│   ├── 20_data.md         データモデル・データ源・収集方針
│   ├── 30_architecture.md 技術選定・構成
│   ├── 40_legal.md        権利と倫理の線引き【最重要・必読】
│   ├── 50_monetization.md 収益設計
│   ├── 60_roadmap.md      マイルストーンと撤退基準
│   └── 70_open_questions.md 未決事項
├── config/            収集対象の定義（YAML）
├── data/              構造化データ（YAML/JSON、Git管理）
├── pipeline/          収集・正規化・検証スクリプト（Python）
├── site/              静的サイト（Astro）
└── .github/workflows/ 定期実行
```

## 実装者へ：最初に読む順番

1. **`docs/40_legal.md`** — ここを踏み外すと全部が無駄になる。着手前に必読
2. `docs/00_goal.md` — 何をもって成功/撤退とするか
3. `docs/60_roadmap.md` — Phase 0 の範囲（**2週間・実費のみ**）
4. `docs/20_data.md` — データモデル
5. `docs/30_architecture.md` — 技術選定

## 現在地

- [x] 市場調査・機会の特定
- [x] 設計・要件定義（このドキュメント群）
- [x] **Phase 0 のサイト一式を構築**（2026-08-13）
  - Astro 静的サイト `site/`（地図＋フィルタ＋作品/場所/都道府県ページ）
  - シードデータ `data/`（**13作品・154地点・172 appearance**、座標は Nominatim で裏取り）
  - 153地点にライセンス済み Commons 写真（CC0/CC BY/CC BY-SA/PD、帰属表記つき）
  - Export route（メール収集）・About / Sources / Contact / Legal / Privacy / 404
  - sitemap / robots / ライト＋ダーク対応のデザインシステム / Service Worker / PWA
- [x] **GitHub リポジトリ公開**（`nomuonji/seichi-atlas`、main ブランチ、195ページビルド確認済み）
- [ ] Cloudflare Pages へのデプロイ（GitHub 連携、設定値は上記「デプロイ」欄）
- [ ] Phase 0 ゲート判定（コミュニティ投下・クリック計測）
- [ ] Phase 1 以降

**次のアクション**：Cloudflare Pages ダッシュボードで GitHub 連携デプロイ（README の「デプロイ」欄参照）→ カスタムドメイン設定 → コミュニティ投下。
