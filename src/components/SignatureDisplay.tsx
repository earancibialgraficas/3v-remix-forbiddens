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
  signature_image_offset?: number | null; 
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
  const strokePosition = profile.signature_stroke_position || "outside";
  const fontStyleStr = profile.signature_font || "normal";
  const isBold = fontStyleStr.includes("bold");
  const isItalic = fontStyleStr.includes("italic");
  const textAlign = (profile.signature_text_align || "center") as "left" | "center" | "right";
  const imageAlign = profile.signature_image_align || "center";
  const imageWidth = profile.signature_image_width ?? 100;
  const vOffset = profile.signature_image_offset ?? 50; 
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
      whiteSpace: "pre-wrap", 
    };

    if (strokeColor && strokeWidth > 0) {
      let paintOrder = "stroke fill"; 
      let finalStrokeWidth = strokeWidth;

      if (strokePosition === "outside") {
        paintOrder = "stroke fill"; 
        finalStrokeWidth = strokeWidth * 2; 
      } else {
        // Todo lo demás (middle o si quedó algún residuo) será Medio
        paintOrder = "normal"; 
        finalStrokeWidth = strokeWidth;
      }

      return (
        <p
          style={{
            ...baseStyle,
            WebkitTextStroke: `${finalStrokeWidth}px ${strokeColor}`,
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
          width: `${imageWidth}%`,
          margin: imageAlign === "center" ? "0 auto" : imageAlign === "right" ? "0 0 0 auto" : "0 auto 0 0",
          backgroundImage: `url("${sigImage}")`,
          backgroundSize: "cover",
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