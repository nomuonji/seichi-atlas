# 20. データモデル・データ源・収集方針

## データモデル

保存形式は **YAML（Git管理）**。ビルド時にJSONへ変換。
理由：件数が数千規模ならRDBは要らない。差分がGitで追え、誤りの混入を人間がレビューできる。

### work（作品）

```yaml
id: kimi-no-na-wa
title_en: "Your Name."
title_ja: "君の名は。"
title_romaji: "Kimi no Na wa."
aliases: ["Kimi no Nawa", "Your Name"]      # 検索の取りこぼし防止
type: film                                   # tv | film | ova | game
year: 2016
studio: "CoMix Wave Films"
mal_id: 32281                                # 外部ID。将来の連携用に持つだけ
anilist_id: 21519
official_url: "https://..."
```

### location（場所）

```yaml
id: yotsuya-suga-shrine-steps
name_en: "Suga Shrine Steps"
name_ja: "須賀神社 男坂"
lat: 35.6857
lng: 139.7215
address_ja: "東京都新宿区須賀町5"            # 現地で見せる用。必須
address_en: "5 Sugacho, Shinjuku-ku, Tokyo"
prefecture: tokyo
municipality: shinjuku
category: shrine                              # station|shrine|school|shotengai|shop|bridge|crossing|park|nature|other
visitability: public                          # public|limited|private|closed
visitability_note_en: "Public staircase. Residential area — keep quiet."
entry_fee: free                               # free|paid|unknown
car_required: false
nearest_station:
  name_en: "Yotsuya-sanchome Station"
  name_ja: "四谷三丁目駅"
  lines: ["Tokyo Metro Marunouchi"]
  walk_min: 7
travel_from:                                  # 起点別。Phase 0 は tokyo のみでよい
  tokyo:   { minutes: 18, transfers: 1, fare_jpy: 200 }
etiquette_en:                                 # マナー注意。差別化かつ炎上防止
  - "Residents live here. Do not block the stairs."
photos: []                                    # 権利のクリアなもののみ。docs/40_legal.md 必読
last_verified: 2026-08-08
```

### appearance（作品 × 場所）— 設計の核心

```yaml
work_id: kimi-no-na-wa
location_id: yotsuya-suga-shrine-steps
scene_note_en: "The final scene where the two pass each other."
scene_ref: "climax"                           # 任意。話数やタイムコードは【入れない】→ 40_legal.md
confidence: confirmed                         # confirmed|likely|disputed
sources:                                      # 1件以上必須
  - url: "https://..."
    type: official                            # official|municipal|news|fanblog|map
    lang: ja
    retrieved_at: 2026-08-08
```

### source（出典マスタ）

収集元サイトの一覧。robots.txt の可否、最終クロール日、レート制限を持つ。
**個人ブログは事実（地名・座標）のみ抽出し、文章は一切保存しない。**

---

## データ源（優先順）

**上ほど強く、上ほど安全。** 下に行くほど権利と品質の注意が要る。

| 順 | 源 | 性質 | 注意 |
|---|---|---|---|
| 1 | **自治体の聖地特設ページ・観光協会** | 一次情報。公開を歓迎している | PDFが多い。手作業も辞さない |
| 2 | **アニメツーリズム協会（訪れてみたい日本のアニメ聖地88）** | 公式に選定されたリスト | 「88選」自体の転載はせず、場所を自分のスキーマに落とす |
| 3 | **製作委員会・公式サイトのロケーションマップ** | 一次情報 | |
| 4 | **地元商工会・スタンプラリー企画** | 期間限定情報の宝庫 | 期限切れの扱いを設計に入れる |
| 5 | **OpenStreetMap / 国土地理院** | 座標・住所の正規化 | ODbL。帰属表示が必要 |
| 6 | **Wikipedia / Wikidata（日本語版）** | 作品メタデータ、著名地点 | CC BY-SA。帰属表示 |
| 7 | **個人の舞台探訪ブログ** | 最も情報が厚い | **事実のみ抽出。文章・写真は絶対に持ち込まない** |

**方針**：Phase 0 は **1〜4 と 6 だけ**で作る。7は Phase 1 以降、抽出ルールを固めてから。
最初から7に頼ると、権利と品質の両方で後戻りできなくなる。

---

## 収集パイプライン（`pipeline/`）

`rss-explorer` と同じ型で作る。GitHub Actions 週1回。

```
1. fetch.py      config/sources.yaml に従って取得。robots.txt を必ず確認。1req/2sec以上の間隔
2. extract.py    HTML/PDF → 場所名・住所・作品名の候補を抽出
3. geocode.py    住所 → 座標。国土地理院APIまたはNominatim（無料・要レート順守）
4. normalize.py  表記ゆれ吸収、既存データとの突合、id採番
5. review.py     差分を Markdown レポートに出力 → 【人間がレビューして初めて data/ に入る】
6. verify.py     既存レコードの死活監視（出典URLの404、営業情報の変化）→ フラグを立てる
7. build.py      data/*.yaml → site/ が読む JSON を生成
```

**5 を自動化してはいけない。** 誤データが1件出た時点で「正確さ」という唯一の売りが消える。

---

## 表記ゆれの扱い（実装で必ず詰まる箇所）

- 作品名：英題／原題／ローマ字／略称／海外配信時の別題（Netflix題とCrunchyroll題が違うことがある）
  → `aliases` に全部入れる。検索は正規化後に前方一致＋あいまい一致
- 地名：旧市町村名（平成の大合併）、駅の改称、施設のリニューアル改名
  → `former_names` を location に足してよい
- ローマ字：ヘボン式に統一。長音は省略形と両方を alias に入れる（Tokyo / Tōkyō / Toukyou）

---

## 収録範囲（Phase 0）

**東京起点で日帰り圏（東京・神奈川・埼玉・千葉）× 作品10本、目標 150〜300 location。**

この範囲にした理由：
- 「東京から日帰り」は主対象の実際の行動（多くは東京泊）に一致し、そのまま看板機能になる
- 鎌倉高校前（Slam Dunk）という海外訪問者が最も多い聖地を含むため、需要の反応が最速で読める
- 秩父・鷲宮など「地方分散」の事例も含み、地方展開の仮説も同時に検証できる

作品の選定基準：**海外での視聴可能性（Netflix/Crunchyroll配信の有無）× 実在ロケーションの多さ**。
日本国内の人気順で選ばない。ここを間違えると全部が空振りする。
