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
  text?: string | null;
  profile?: SignatureProfile | null;
  className?: string;
  fontSize?: number;
}

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
    // 🔥 FIX: Eliminado backgroundAttachment: "fixed" para quitar el Parallax
    return (
      <div
        className="w-full rounded overflow-hidden border border-border/30"
        style={{
          height: 110,
          backgroundImage: `url("${sigImage}")`,
          backgroundSize: "cover",
          backgroundPosition: `${imageAlign} center`,
          backgroundRepeat: "no-repeat",
        }}
        role="img"
        aria-label="Firma del usuario"
      />
    );
  };

  if (overImage) {
    return (
      <div className={`relative w-full ${className}`}>
        {renderImage()}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-3">
          <div className="w-full">{renderText()}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-1 w-full ${className}`}>
      {renderText()}
      {renderImage()}
    </div>
  );
}