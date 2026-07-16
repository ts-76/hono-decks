---
target: docs
total_score: 26
p0_count: 0
p1_count: 2
timestamp: 2026-07-14T03-27-34Z
slug: docs-app-routes-index-tsx
---
# HonoX documentation site critique

Method: dual-agent (A: critique_design_a · B: critique_evidence_b)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | Desktopのcurrent-page表示は明確だが、mobile menuにはcurrent stateがなく、狭幅では長文pageの現在位置も失われる。 |
| 2 | Match Between System and Real World | 3/4 | Honoの語彙は正確だが、日本語・英語ラベルの切替規則と汎用的なTOC名が翻訳負荷を生む。 |
| 3 | User Control and Freedom | 3/4 | Home・guide・API・skip navigationは予測可能だが、mobileではsection-levelのmapがない。 |
| 4 | Consistency and Standards | 3/4 | Visual systemは一貫している一方、TOCラベルと実見出しが一致せず、mobile menuだけactive stateがない。 |
| 5 | Error Prevention | 2/4 | Runtime/build境界の警告は有効だが、setupに前提条件・期待結果・verificationがない。 |
| 6 | Recognition Rather Than Recall | 2/4 | Desktopでは認識を助けるが、mobileでTOCが消え、API symbolにはanchor・import signatureがない。 |
| 7 | Flexibility and Efficiency of Use | 2/4 | Keyboard navigationは使えるが、search・code copy・symbol deep link・mobile API treatmentがない。 |
| 8 | Aesthetic and Minimalist Design | 3/4 | 抑制された構成だが、mobileの二重navigationと定型的なterminal heroが残る。 |
| 9 | Error Recovery | 2/4 | Getting Startedに想定出力、失敗症状、回復手段への導線がない。 |
| 10 | Help and Documentation | 3/4 | Task-orientedなguide構成は良いが、文脈的navigationとsymbol-levelのhelpが不足する。 |
| **Total** |  | **26/40** | **Acceptable — 強いvisual foundationに対してreference UXの改善が必要。** |

## Anti-Patterns Verdict

### LLM assessment

**Pass。ただしdeveloper-tool templateの残り香がある。** 実際のHono route、generated route list、build/runtime boundary、公開exportをvisual artifactとして見せているため、genericなAI landing pageには落ちていない。Hono orange・near-black・off-whiteのsystemも一貫している。

一方、巨大なgrotesk hero＋dark terminal、peachのoffset shadow、full-width dark process band、decorative terminal dotsは、developer tool siteで頻出するvisual grammarである。具体的な内容が救っているが、見た目単体の固有性はまだ高くない。gradient text、glass card grid、fake metric、意味のないnumberingは避けられている。01–03は実際のcompile flowなので妥当。

### Deterministic scan

- Static CLI scan: `docs/app`を対象に**0件**。
- Live DOM scan: 3 routesで延べ11件。
  - `cramped-padding`: 3件
  - `hero-eyebrow-chip`: 2件
  - `line-length`: 6件
- 11件すべてfalse positiveと判定。
  - `.table-wrap`はpadding-bearing cardではなく、semantic tableの横スクロールwrapperとleading rule。
  - `.path-label`はdecorative pillではなく現在のroute path locatorで、border/background/radiusを持たない。
  - `line-length`は72ch制約済みのCJK/mixed-script本文をLatin文字幅で推定した誤検出。

Detectorが検出しなかった実問題として、mobile API table内の400px contentが339px wrapperで横スクロールすること、mobile page内navigationが消えること、touch targetの不足がある。

### Visual overlays

Mutable injectionとoverlay表示は`/`、`/docs/getting-started`、`/api`の全routeで成功した。Overlay screenshotとconsole evidenceを取得済み。評価終了時にlive helperとbrowserを停止したため、overlayは現在表示されていない。

## Overall Impression

Homepageは自信があり、Honoが所有するroute-kit境界を短時間で伝えられる。Desktop docs shellは落ち着いて読みやすい。最大の機会は、polished brochureからproduction referenceへ進化させること。具体的にはcontextual section navigation、responsive API entries、deep links、copy actions、setupの検証可能な完了状態が必要。

## What's Working

1. **Product boundaryが見える。** Route artifact、Author/Compile/Routeの3段階、Worker-safe copyがproduct purposeと一致している。
2. **Design systemが抑制され、長文を読みやすい。** Spacing、type scale、orange emphasis、dark code surface、focus ring、contrastが安定している。
3. **Navigation categoryがdeveloper intentに合う。** 「はじめる / 書く / 組み込む / 守る / API」は短く、securityもfirst-classに扱われている。

## Priority Issues

### [P1] Desktopのページ内navigationが汎用的で、狭幅では完全に消える

**Why it matters:** 「概要 / 実装例 / 注意点」はguideやAPIの実際の見出しを表していない。Mobile/tabletではrail自体が消えるため、長いreference pageの現在位置と移動手段を失う。

**Fix:** Page固有のsection metadataまたは実H2からTOCを生成し、実際の見出し名・active sectionを表示する。1050px以下ではcompactなsticky “On this page” disclosureに変換する。

**Suggested command:** `$impeccable adapt`

### [P1] API pageがinventoryのままで、実用的なpublic referenceになっていない

**Why it matters:** 390pxでは両tableが339px wrapper内で400px横スクロールし、継続方向のcueもない。Exportにはstable anchor、import entry、signature、source/example link、copy actionがなく、symbol名から動くcodeへ到達しにくい。

**Fix:** 各exportをresponsiveなanchored definition rowへ変更し、symbol、import entry、簡潔なsignature、役割、関連guide/sourceを表示する。狭幅ではlabel/valueを縦積みにし、codeにはcopy actionを付ける。

**Suggested command:** `$impeccable harden`

### [P2] Mobile navigationが重複し、Menuのtouch targetが小さい

**Why it matters:** `summary`の実測は約37×16pxで、44×44pxの意図するtouch targetを満たさない。開くと6 linksが、直下の5-item documentation indexと重複し、最初のviewportをnavigationが占有する。

**Fix:** Summaryに最低44×44pxのinteraction box、open/closed state、current-page stateを追加する。Mobile sidebarはcompactなguide switcherへ変えるか、global menuへ統合する。

**Suggested command:** `$impeccable adapt`

### [P2] 「5分で始める」に検証可能な完了・回復状態がない

**Why it matters:** Commandをコピーしても、生成されるfile、開くURL、成功状態、compile/mount errorからの回復方法が分からない。強いCTAが約束するclosureを提供できていない。

**Fix:** Prerequisites、copy button、generated file expectation、run/visit verification、expected output、主要な失敗2–3件へのtroubleshooting linkを追加する。最後を具体的な成功状態と次guideで閉じる。

**Suggested command:** `$impeccable onboard`

## Persona Red Flags

**Jordan（first-timer）:** 「app-owned facade」「generated entry」「surface」「mount」が前提説明なしに現れる。最後のcode block後に成功確認もfailure pathもなく、compile後に何を開くか分からない地点が離脱点になる。

**Sam（screen-reader / keyboard / low-vision）:** Heading order、table semantics、skip link、reduced motion、focus ringは強い。Mobile Menuが37×16px、mobile menuにcurrent-page announcementがなく、狭幅でpage内navigationが失われるため、section traversalが非効率になる。

**Casey（distracted mobile user）:** 390pxでarticleの前に5-item guide indexがあり、さらに6-item menuを開ける。API tableは継続cueなしで横dragが必要で、復帰時にlocal mapもない。

**Hono integrator:** Architecture storyは信頼できるが、API pageが「どのentryからimportするか、signatureは何か、動くexampleはどこか」に答えない。Version/source linkとsymbol anchorの不足でpackage sourceへ戻る必要がある。

## Minor Observations

- Code captionのdecorative `•••`は機能を持たない。Copy buttonに置き換えるとspaceを正当化できる。
- Mobile menuはopen時も“Menu”のまま。Close labelまたはstateful chevronが必要。
- Homepageの終点がroute table＋generic footerで、context-awareなnext actionがない。
- 日本語・英語混在にはnavigationは一言語、code/domain termは英語などの明文化された規則が必要。
- Warm off-whiteはcream/SaaS clichéになるほど強くなく、Hono orangeがidentityを担っている。

## Questions to Consider

1. Public exportsがsource of truthなら、なぜ個別exportをlink・copy・verifyできないのか。
2. Homepageはconfidenceを売るのか、documentationへroutingするのか。現在の4つの大sectionは両方に必要か。
3. 「5分」を証明する画面・URL・出力は何か。
4. 390px screenの最初のviewportをnavigationが二重に占めるべきか、それとも現在のtaskが占めるべきか。
5. 各guideの最後を説明の終了ではなく「次に何をするか」で閉じられないか。
