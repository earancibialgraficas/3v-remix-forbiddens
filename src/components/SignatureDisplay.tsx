interface SignatureProfile {
  signature?: string | null;
  signature_color?: string | null;
  signature_stroke_color?: string | null;
  signature_stroke_width?: number | null;
  signature_stroke_position?: string | null;
  signature_font?: string | null;
  signature_font_family?: string | null;
  signature_text_align?: string | null;
  signature_image_url?: string | null;
  signature_image_align?: string | null;
  signature_image_width?: number | null;
  signature_text_over_image?: boolean | null;
  color_staff_role?: string | null;
}

interface Props {
  /** Optional snapshot text saved with the post; falls back to profile.signature */
  text?: string | null;
  profile?: SignatureProfile | null;
  className?: string;
  /** Base font size in px */
  fontSize?: number;
}

/**
 * Renders a user's custom signature with full styling:
 * font family, fill color, stroke (outside/middle/inside) with adjustable width,
 * text alignment, optional image, and text-over-image overlay.
 */
export default function SignatureDisplay({ text, profile, className = "", fontSize = 12 }: Props) {
  if (!profile) return null;
  const sigText = (text ?? profile.signature ?? "").trim();
  const sigImage = profile.signature_image_url || "";
  if (!sigText && !sigImage) return null;

  const fontFamily = profile.signature_font_family || "Inter";
  const color = profile.signature_color || profile.color_staff_role || "#facc15";
  const strokeColor = profile.signature_stroke_color || "";
  const strokeWidth = Math.max(0, profile.signature_stroke_width ?? 1);
  const strokePosition = profile.signature_stroke_position || "middle";
  const fontStyleStr = profile.signature_font || "normal";
  const isBold = fontStyleStr.includes("bold");
  const isItalic = fontStyleStr.includes("italic");
  const textAlign = (profile.signature_text_align || "center") as "left" | "center" | "right";
  const imageAlign = profile.signature_image_align || "center";
  const imageWidth = profile.signature_image_width ?? 100;
  const overImage = !!profile.signature_text_over_image && !!sigImage && !!sigText;

  // Build the styled text node (CSS approach for outside/middle, SVG for inside)
  const renderText = () => {
    if (!sigText) return null;

    const baseStyle: React.CSSProperties = {
      fontFamily: `"${fontFamily}", sans-serif`,
      color,
      fontWeight: isBold ? 700 : 400,
      fontStyle: isItalic ? "italic" : "normal",
      textAlign,
      fontSize: `${fontSize}px`,
      lineHeight: 1.3,
      wordBreak: "break-word",
    };

    if (strokeColor && strokeWidth > 0) {
      if (strokePosition === "inside") {
        // Inside stroke: SVG text with paint-order so fill paints over stroke,
        // then clip stroke to text shape (default). Doubling stroke width and
        // letting fill cover the outer half yields an inner-stroke effect.
        return (
          <svg
            width="100%"
            height={fontSize * 1.6}
            style={{ overflow: "visible", display: "block" }}
            aria-label={sigText}
          >
            <text
              x={textAlign === "left" ? "0%" : textAlign === "right" ? "100%" : "50%"}
              y="50%"
              dominantBaseline="middle"
              textAnchor={textAlign === "left" ? "start" : textAlign === "right" ? "end" : "middle"}
              fill={color}
              stroke={strokeColor}
              strokeWidth={strokeWidth * 2}
              style={{
                fontFamily: `"${fontFamily}", sans-serif`,
                fontSize: `${fontSize}px`,
                fontWeight: isBold ? 700 : 400,
                fontStyle: isItalic ? "italic" : "normal",
                paintOrder: "stroke fill",
              }}
            >
              {sigText}
            </text>
          </svg>
        );
      }
      // outside or middle via CSS
      const paintOrder = strokePosition === "outside" ? "stroke fill" : "fill stroke";
      return (
        <p
          style={{
            ...baseStyle,
            WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
            paintOrder,
          } as React.CSSProperties}
        >
          {sigText}
        </p>
      );
    }

    return <p style={baseStyle}>{sigText}</p>;
  };

  const renderImage = () => {
    if (!sigImage) return null;
    const justify =
      imageAlign === "left" ? "flex-start" : imageAlign === "right" ? "flex-end" : "center";
    return (
      <div style={{ display: "flex", justifyContent: justify }}>
        <img
          src={sigImage}
          alt=""
          style={{ width: `${imageWidth}%`, maxHeight: 125, objectFit: "contain" }}
          className="rounded"
        />
      </div>
    );
  };

  if (overImage) {
    return (
      <div className={`relative inline-block w-full ${className}`}>
        {renderImage()}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-2">
          <div className="w-full">{renderText()}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {renderText()}
      {renderImage()}
    </div>
  );
}
