import { describe, expect, it } from "vite-plus/test";
import { collectMarkdownAssetCandidates, contentTypeForPath } from "../src/deck/assets";
import { createDeckPaths } from "../src/server/paths";

describe("Code Scanning regressions", () => {
  it("collects supported asset references without regex backtracking", () => {
    const markdown = `
background: './assets/cover.png'
SRC: https://cdn.example.com/hero.webp
![diagram](./assets/diagram.svg "Architecture")
<img src="./assets/photo.jpg" />
`;

    expect(collectMarkdownAssetCandidates(markdown)).toEqual([
      "./assets/cover.png",
      "https://cdn.example.com/hero.webp",
      "./assets/diagram.svg",
      "./assets/photo.jpg",
    ]);

    const adversarial = `${"![".repeat(20_000)}not-an-image`;
    expect(collectMarkdownAssetCandidates(adversarial)).toEqual([]);
  });

  it("detects content types after query and fragment suffixes", () => {
    expect(contentTypeForPath("photo.PNG?size=2#preview")).toBe("image/png");
    expect(contentTypeForPath("photo.jpeg#preview")).toBe("image/jpeg");
    expect(contentTypeForPath("icon.svg?theme=dark")).toBe("image/svg+xml");
    expect(contentTypeForPath(`${"asset.webp#".repeat(20_000)}invalid`)).toBe("image/webp");
  });

  it("normalizes slash-heavy mount paths deterministically", () => {
    expect(createDeckPaths(`${"/".repeat(20_000)}slides${"/".repeat(20_000)}`, "intro").viewer).toBe(
      "/slides/intro",
    );
  });
});
