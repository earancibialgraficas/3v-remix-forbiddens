import type { SVGProps } from "react";

export function InventoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 9.5h16v9.25c0 .69-.56 1.25-1.25 1.25H5.25C4.56 20 4 19.44 4 18.75V9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M6.25 6.25h11.5L20 9.5H4l2.25-3.25Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 6.25V20" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.25 12h5.5v3.75h-5.5V12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10.4 13.85h3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
