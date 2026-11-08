// Add each new UI message to DeckMessages and both catalogs; use templates for dynamic values.
// Pass resolved messages to renderers and serialize only the values needed by their runtimes.
export interface DeckMessages {
  details: string;
  externalLink: string;
  home: string;
  heroImage: string;
  openLink: string;
  link: string;
  openX: string;
  openProvider: string;
  openSocial: string;
  openEmbed: string;
  embeddedContent: string;
  remoteTitle: string;
  remotePrevious: string;
  remoteNext: string;
  remoteCurrent: string;
  remoteNextSlide: string;
  remoteNoNext: string;
  remoteNotes: string;
  remoteNoNotes: string;
  remoteLive: string;
  remoteFollow: string;
  remoteStop: string;
  remoteConnecting: string;
  remoteConnected: string;
  remoteDisconnected: string;
  remoteQr: string;
  remoteQrHint: string;
  remoteOpenHere: string;
  remoteCopy: string;
  remoteCopied: string;
  remoteSlides: string;
  remoteNotStarted: string;

  timerTitle: string;
  timerElapsed: string;
  timerClock: string;
  timerRemaining: string;
  timerStart: string;
  timerPause: string;
  timerResume: string;
  timerReset: string;
  timerOnPace: string;
  timerAhead: string;
  timerBehind: string;
  timerOver: string;
  timerShortcut: string;
  timerTarget: string;
  timerMinutes: string;
  timerTargetDefault: string;
  timerDisplay: string;
  timerSettings: string;
  timerPaceLabel: string;
  timerOvertimeLabel: string;
  timerAppendix: string;

  viewerToc: string;
  viewerClose: string;
  viewerShortcuts: string;
  viewerNext: string;
  viewerPrevious: string;
  viewerFirstLast: string;
  viewerJump: string;
  viewerOverview: string;
  viewerToggleToc: string;
  viewerFullscreen: string;
  viewerPrint: string;
  viewerHelp: string;

  toc: string;
  deckList: string;
  viewer: string;
  presenter: string;
  projection: string;
  previous: string;
  next: string;
  fullscreen: string;
  overview: string;
  print: string;
  exportPdf: string;
  exportPng: string;
  viewerControls: string;
  slideNavigation: string;
  slideProgress: string;
  slidePosition: string;
  progressText: string;
  slide: string;
  slideCount: string;
  slideCountOne: string;
  overviewTitle: string;
  presenterTitle: string;
  openViewer: string;
  currentSlide: string;
  presenterControls: string;
  presenterPanel: string;
  nextPreview: string;
  noNext: string;
  notes: string;
  noNotes: string;
  connected: string;
  warnings: string;
  indexTitle: string;
}

export const enMessages: DeckMessages = {
  details: "Details",
  externalLink: "Open link in new tab",
  home: "Home",
  heroImage: "Hero image",
  openLink: "Open link",
  link: "Link",
  openX: "Open post on X",
  openProvider: "Open on {provider}",
  openSocial: "Open social post",
  openEmbed: "Open embed",
  embeddedContent: "Embedded content",
  remoteTitle: "Remote control",
  remotePrevious: "Previous",
  remoteNext: "Next",
  remoteCurrent: "Current slide",
  remoteNextSlide: "Next slide",
  remoteNoNext: "No next slide",
  remoteNotes: "Speaker notes",
  remoteNoNotes: "No speaker notes",
  remoteLive: "Live",
  remoteFollow: "Follow",
  remoteStop: "Stop following",
  remoteConnecting: "Connecting",
  remoteConnected: "Connected",
  remoteDisconnected: "Disconnected",
  remoteQr: "Show remote control QR code",
  remoteQrHint: "Scan with your phone to open the remote control.",
  remoteOpenHere: "Open in this browser",
  remoteCopy: "Copy URL",
  remoteCopied: "Copied",
  remoteSlides: "Slides",
  remoteNotStarted: "Timer not started",

  timerTitle: "Talk timer",
  timerElapsed: "Elapsed",
  timerClock: "Clock",
  timerRemaining: "Remaining",
  timerStart: "Start",
  timerPause: "Pause",
  timerResume: "Resume",
  timerReset: "Reset",
  timerOnPace: "On pace",
  timerAhead: "Ahead",
  timerBehind: "Behind",
  timerOver: "Over",
  timerShortcut: "Start or pause timer (T)",
  timerTarget: "Target",
  timerMinutes: "min",
  timerTargetDefault: "Use default",
  timerDisplay: "Show",
  timerSettings: "Settings",
  timerPaceLabel: "Pace",
  timerOvertimeLabel: "Overtime",
  timerAppendix: "Appendix",

  viewerToc: "Table of contents",
  viewerClose: "Close",
  viewerShortcuts: "Keyboard shortcuts",
  viewerNext: "Next slide: Right arrow, Space, Page Down",
  viewerPrevious: "Previous slide: Left arrow, Shift + Space, Page Up",
  viewerFirstLast: "First / last slide: Home / End",
  viewerJump: "Jump to slide: type a number and press Enter; Escape clears it",
  viewerOverview: "Open overview: O",
  viewerToggleToc: "Toggle table of contents: T",
  viewerFullscreen: "Toggle fullscreen: F",
  viewerPrint: "Open print view: Ctrl / Cmd + P",
  viewerHelp: "Show shortcuts: ?",

  toc: "Table of contents",
  deckList: "Deck list",
  viewer: "Viewer",
  presenter: "Presenter",
  projection: "Projection",
  previous: "Previous slide",
  next: "Next slide",
  fullscreen: "Toggle fullscreen",
  overview: "Slide overview",
  print: "Print view",
  exportPdf: "Export PDF",
  exportPng: "Export PNG",
  viewerControls: "Viewer controls",
  slideNavigation: "Slide navigation",
  slideProgress: "Slide progress",
  slidePosition: "Slide {current} of {total}",
  progressText: "{current} / {total}",
  slide: "Slide {number}",
  slideCount: "{count} slides",
  slideCountOne: "{count} slide",
  overviewTitle: "{title} - Overview",
  presenterTitle: "{title} - Presenter",
  openViewer: "Open full viewer in new tab",
  currentSlide: "Current slide",
  presenterControls: "Presenter controls",
  presenterPanel: "Presenter panel",
  nextPreview: "Next slide preview",
  noNext: "No next slide",
  notes: "Speaker notes",
  noNotes: "No speaker notes.",
  connected: "Connected",
  warnings: "Deck warnings",
  indexTitle: "Hono Decks",
};
export const jaMessages: DeckMessages = {
  details: "詳細",
  externalLink: "リンクを新しいタブで開く",
  home: "ホーム",
  heroImage: "メイン画像",
  openLink: "リンクを開く",
  link: "リンク",
  openX: "Xで投稿を開く",
  openProvider: "{provider}で開く",
  openSocial: "投稿を開く",
  openEmbed: "埋め込みを開く",
  embeddedContent: "埋め込みコンテンツ",
  remoteTitle: "リモート操作",
  remotePrevious: "前へ",
  remoteNext: "次へ",
  remoteCurrent: "現在のスライド",
  remoteNextSlide: "次のスライド",
  remoteNoNext: "次のスライドはありません",
  remoteNotes: "発表者ノート",
  remoteNoNotes: "発表者ノートはありません",
  remoteLive: "ライブ",
  remoteFollow: "追従する",
  remoteStop: "追従を停止",
  remoteConnecting: "接続中",
  remoteConnected: "接続済み",
  remoteDisconnected: "切断",
  remoteQr: "リモート操作のQRコードを表示",
  remoteQrHint: "スマートフォンで読み取ると、リモート操作の画面が開きます。",
  remoteOpenHere: "このブラウザで開く",
  remoteCopy: "URLをコピー",
  remoteCopied: "コピーしました",
  remoteSlides: "スライド一覧",
  remoteNotStarted: "タイマー未開始",

  timerTitle: "発表タイマー",
  timerElapsed: "経過時間",
  timerClock: "現在時刻",
  timerRemaining: "残り時間",
  timerStart: "開始",
  timerPause: "一時停止",
  timerResume: "再開",
  timerReset: "リセット",
  timerOnPace: "予定どおり",
  timerAhead: "先行",
  timerBehind: "遅れ",
  timerOver: "超過",
  timerShortcut: "タイマーを開始 / 一時停止 (T)",
  timerTarget: "目標時間",
  timerMinutes: "分",
  timerTargetDefault: "既定に戻す",
  timerDisplay: "表示",
  timerSettings: "設定",
  timerPaceLabel: "ペース",
  timerOvertimeLabel: "超過時間",
  timerAppendix: "付録",

  viewerToc: "目次",
  viewerClose: "閉じる",
  viewerShortcuts: "キーボードショートカット",
  viewerNext: "次のスライド: →、Space、Page Down",
  viewerPrevious: "前のスライド: ←、Shift + Space、Page Up",
  viewerFirstLast: "最初 / 最後のスライド: Home / End",
  viewerJump: "スライドへ移動: 数字を入力して Enter、Escape で消去",
  viewerOverview: "スライド一覧を開く: O",
  viewerToggleToc: "目次を切り替える: T",
  viewerFullscreen: "全画面表示を切り替える: F",
  viewerPrint: "印刷画面を開く: Ctrl / Cmd + P",
  viewerHelp: "ショートカットを表示: ?",

  toc: "目次",
  deckList: "デッキ一覧",
  viewer: "ビューアー",
  presenter: "発表者画面",
  projection: "投影画面",
  previous: "前のスライド",
  next: "次のスライド",
  fullscreen: "全画面表示を切り替え",
  overview: "スライド一覧",
  print: "印刷画面",
  exportPdf: "PDFを書き出す",
  exportPng: "PNGを書き出す",
  viewerControls: "ビューアーの操作",
  slideNavigation: "スライドナビゲーション",
  slideProgress: "スライドの進行状況",
  slidePosition: "{total}枚中{current}枚目",
  progressText: "{current} / {total}",
  slide: "スライド {number}",
  slideCount: "{count}枚のスライド",
  slideCountOne: "{count}枚のスライド",
  overviewTitle: "{title} - スライド一覧",
  presenterTitle: "{title} - 発表者画面",
  openViewer: "ビューアーを新しいタブで開く",
  currentSlide: "現在のスライド",
  presenterControls: "発表者の操作",
  presenterPanel: "発表者パネル",
  nextPreview: "次のスライドのプレビュー",
  noNext: "次のスライドはありません",
  notes: "発表者ノート",
  noNotes: "発表者ノートはありません。",
  connected: "接続済み",
  warnings: "スライドの警告",
  indexTitle: "Hono Decks",
};
export type DeckMessageOverrides = Partial<Record<"en" | "ja", Partial<DeckMessages>>>;
export function resolveMessages(lang: string, overrides?: DeckMessageOverrides): DeckMessages {
  const locale = /^ja(?:-|$)/i.test(lang.trim()) ? "ja" : "en";
  return { ...(locale === "ja" ? jaMessages : enMessages), ...overrides?.[locale] };
}
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    values[key] === undefined ? match : String(values[key]),
  );
}
export function formatSlideCount(messages: DeckMessages, count: number): string {
  return formatMessage(count === 1 ? messages.slideCountOne : messages.slideCount, { count });
}

export function viewerMessages(messages: DeckMessages) {
  return {
    toc: messages.viewerToc,
    close: messages.viewerClose,
    shortcuts: messages.viewerShortcuts,
    next: messages.viewerNext,
    previous: messages.viewerPrevious,
    firstLast: messages.viewerFirstLast,
    jump: messages.viewerJump,
    overview: messages.viewerOverview,
    toggleToc: messages.viewerToggleToc,
    fullscreen: messages.viewerFullscreen,
    print: messages.viewerPrint,
    help: messages.viewerHelp,
  };
}

export function timerMessages(messages: DeckMessages) {
  return {
    title: messages.timerTitle,
    elapsed: messages.timerElapsed,
    clock: messages.timerClock,
    remaining: messages.timerRemaining,
    start: messages.timerStart,
    pause: messages.timerPause,
    resume: messages.timerResume,
    reset: messages.timerReset,
    onPace: messages.timerOnPace,
    ahead: messages.timerAhead,
    behind: messages.timerBehind,
    over: messages.timerOver,
    shortcut: messages.timerShortcut,
    target: messages.timerTarget,
    minutes: messages.timerMinutes,
    targetDefault: messages.timerTargetDefault,
    display: messages.timerDisplay,
    settings: messages.timerSettings,
    paceLabel: messages.timerPaceLabel,
    overtimeLabel: messages.timerOvertimeLabel,
    appendix: messages.timerAppendix,
  };
}

export function remoteMessages(messages: DeckMessages) {
  return {
    title: messages.remoteTitle,
    previous: messages.remotePrevious,
    next: messages.remoteNext,
    current: messages.remoteCurrent,
    nextSlide: messages.remoteNextSlide,
    noNext: messages.remoteNoNext,
    notes: messages.remoteNotes,
    noNotes: messages.remoteNoNotes,
    live: messages.remoteLive,
    follow: messages.remoteFollow,
    stop: messages.remoteStop,
    connecting: messages.remoteConnecting,
    connected: messages.remoteConnected,
    disconnected: messages.remoteDisconnected,
    qr: messages.remoteQr,
    qrHint: messages.remoteQrHint,
    openHere: messages.remoteOpenHere,
    copy: messages.remoteCopy,
    copied: messages.remoteCopied,
    slides: messages.remoteSlides,
    close: messages.viewerClose,
    elapsed: messages.timerElapsed,
    remaining: messages.timerRemaining,
    notStarted: messages.remoteNotStarted,
    onPace: messages.timerOnPace,
    ahead: messages.timerAhead,
    behind: messages.timerBehind,
    over: messages.timerOver,
    appendix: messages.timerAppendix,
  };
}
