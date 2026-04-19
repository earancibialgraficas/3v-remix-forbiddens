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
  signature_font_size?: number | null;
  signature_image_offset?: number | null; // 🔥 Nuevo: Desplazamiento vertical
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
  const vOffset = profile.signature_image_offset ?? 50; // Valor por defecto: centro (50%)
  const overImage = !!profile.signature_text_over_image && !!sigImage && !!sigText;
  
  const customFontSize = profile.signature_font_size || fontSize;

  const renderText = () => {
    if (!sigText) return null;

    const baseStyle: React.CSSProperties = {
      fontFamily: `"${fontFamily}", sans-serif`,
      color,
      fontWeight: isBold ? 700 : 400,
      fontStyle: isItalic ? "italic" : "normal",
      textAlign,
      fontSize: `${customFontSize}px`,
      lineHeight: 1.3,
      wordBreak: "break-word",
    };

    if (strokeColor && strokeWidth > 0) {
      if (strokePosition === "inside") {
        return (
          <svg
            width="100%"
            height={customFontSize * 1.6}
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
                fontSize: `${customFontSize}px`,
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
    return (
      <div
        className="rounded overflow-hidden border border-border/30 transition-all duration-300"
        style={{
          height: 110,
          // 🔥 FIX: Aplicamos el ancho seleccionado y centramos según la alineación
          width: `${imageWidth}%`,
          margin: imageAlign === "center" ? "0 auto" : imageAlign === "right" ? "0 0 0 auto" : "0 auto 0 0",
          backgroundImage: `url("${sigImage}")`,
          backgroundSize: "cover",
          // 🔥 FIX: Aplicamos el offset vertical (eje Y)
          backgroundPosition: `${imageAlign} ${vOffset}%`,
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