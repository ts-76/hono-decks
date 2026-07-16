/** @jsxRuntime automatic */
/** @jsxImportSource satori/jsx */

import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

export const OGP_WIDTH = 1200;
export const OGP_HEIGHT = 630;

export interface OgpCardInput {
  title: string;
  description?: string;
  author?: string;
  path: string;
  regularFont: Buffer;
  boldFont: Buffer;
}

export async function renderOgpCard(input: OgpCardInput): Promise<Uint8Array> {
  const titleSize = input.title.length > 36 ? 68 : 82;
  const svg = await satori(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#111216",
        color: "#f8f8f5",
        fontFamily: "Atkinson Hyperlegible",
        padding: "54px 68px 58px",
        borderTop: "12px solid #ff6b35",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", fontSize: 26, color: "#ff8b61", fontWeight: 700 }}>
        hono-decks
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 1040 }}>
        <div style={{ display: "flex", fontSize: titleSize, lineHeight: 1.02, letterSpacing: "-0.035em", fontWeight: 700 }}>
          {input.title}
        </div>
        {input.description ? (
          <div style={{ display: "flex", marginTop: 28, maxWidth: 940, fontSize: 32, lineHeight: 1.28, color: "#c7c8c2" }}>
            {input.description}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, color: "#91938d" }}>
        <div style={{ display: "flex" }}>{input.author ?? "hono-decks"}</div>
        <div style={{ display: "flex", color: "#c7c8c2" }}>{input.path}</div>
      </div>
    </div>,
    {
      width: OGP_WIDTH,
      height: OGP_HEIGHT,
      fonts: [
        { name: "Atkinson Hyperlegible", data: input.regularFont, weight: 400, style: "normal" },
        { name: "Atkinson Hyperlegible", data: input.boldFont, weight: 700, style: "normal" },
      ],
    },
  );

  return new Resvg(svg, { fitTo: { mode: "width", value: OGP_WIDTH } }).render().asPng();
}
