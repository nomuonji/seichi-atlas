# 30. 技術選定・構成

## 前提となる制約

1. **ランニングコスト月額 $0**（ドメイン代を除く）。有料APIは検証が終わるまで一切使わない
2. **サーバーを持たない。** 障害対応の責任を負わない＝静的配信のみ
3. **1人で保守できる。** 依存を増やさない

## 構成

```
[GitHub Actions（週1）]
   pipeline/*.py  収集・正規化
        ↓ 差分レポート（人間がレビュー）
   data/*.yaml   ← Git にコミット
        ↓
[Astro ビルド]
   site/  静的HTML + JSON  ← 作品ページ/場所ページ/都道府県ページを静的生成
        ↓
[Cloudflare Pages]  無料・CDN・独自ドメイン
```

## 選定

| 層 | 採用 | 理由 / 却下したもの |
|---|---|---|
| サイト生成 | **Astro** | 静的生成＋必要な箇所だけJSを載せられる（islands）。地図とフィルタだけをクライアント側にできる。既存の JapanNightlifeGuide で使用経験あり |
| 地図 | **MapLibre GL JS** | オープンソース。Mapbox（従量課金）とGoogle Maps API（従量課金）を却下 |
| 地図タイル | **OpenFreeMap** または **Protomaps**（自前ホスト） | どちらも無料。Protomaps は pmtiles を Cloudflare R2/Pages に置けば完全に自前で完結し、外部依存が消える。**日本だけならファイルサイズも現実的** |
| ジオコーディング | **国土地理院 地理院地図API** ＋ **Nominatim** | 無料。ただしレート制限厳守。バッチ処理時のみ使い、実行時には呼ばない（座標は事前計算してデータに固定） |
| 経路・所要時間 | **Phase 0-1 は事前計算した静的値** | 経路APIは全部有料。「東京駅から◯分」は収集時に一度調べて `travel_from` に焼き込む。実用上これで足りる |
| 検索・フィルタ | **クライアントサイド**（全データを1つのJSONで配る） | 数千件なら数百KBに収まる。検索サーバーは要らない。1万件を超えたら分割を検討 |
| あいまい検索 | Fuse.js（または自前の正規化＋部分一致） | 作品名の表記ゆれ対策 |
| ホスティング | **Cloudflare Pages** | 無料。既存プロジェクトと同じで学習コストゼロ |
| 計測 | **Cloudflare Web Analytics** | Cookieを使わない＝同意バナー不要＝GDPR対応の責任が激減する |
| メール | Buttondown もしくは既存の Substack | Phase 0 はメールアドレスを集めるだけ |
| 収集 | **Python**（requests / selectolax / pypdf） | `rss-explorer` と同じ構成にして流用する |
| CI | **GitHub Actions** | 週1のcron。`rss-explorer` の型をそのまま使う |

## 却下した選択肢と理由

- **Next.js + Vercel + DB**：サーバーとDBを持つと固定費と障害対応の責任が発生する。この企画の前提に反する
- **Google Maps JavaScript API**：表示回数課金。トラフィックが伸びるほど赤字が近づく設計は採らない
- **Algolia / Meilisearch**：数千件にサーチサービスは過剰
- **CMS（Contentful等）**：データの正が外部サービスになると、移行できなくなる。**正は必ず Git 上の YAML**

## URL設計（SEOの骨格）

絞り込み結果のURLが被リンク対象になるので、最初から決めておく。

```
/                               トップ（地図＋フィルタ）
/anime/{work-slug}/             作品別（静的生成・主戦場）
/anime/{work-slug}/day-trip/    「東京から日帰りで行ける◯◯の聖地」（狙って作る派生ページ）
/location/{location-slug}/      場所別（静的生成）
/prefecture/{pref-slug}/        都道府県別（静的生成）
/city/{city-slug}/              市区町村別（件数が一定以上の場合のみ生成）
/map/?works=a,b&max_min=60      動的フィルタ（noindex。共有用）
/about /sources /contact        信頼性の担保に必要
```

**注意**：フィルタの組み合わせページを大量自動生成しない。薄いページの量産は
2026年の検索評価では逆効果。生成するのは**件数が閾値を超えた軸だけ**。

## パフォーマンス方針

- 初期表示は「一覧＋静的な地図画像」、地図の本体はユーザー操作で遅延読み込み
- JSONは gzip/brotli 前提。作品別に分割し、必要な分だけ取る
- Service Worker で一度見たページをキャッシュ（オフライン耐性の要件）

## リポジトリ運用

- GitHub。**public でよい**（データのCC公開はむしろ被リンクと信頼を呼ぶ）
  ただし収集スクリプトの対象リストを公開すると先回りされるので、`config/sources.yaml` の
  扱いは Phase 1 で再検討する
- データのライセンスは `docs/40_legal.md` で決めた方針に従う
