import type { SVGProps } from "react";

export function InventoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" {...props}>
      <path
        d="M13 16.5c0-3.6 2.9-6.5 6.5-6.5H51c-2.8 0-5 2.2-5 5v34c0 2.8-2.2 5-5 5H13V16.5Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M19.5 10H51c-2.8 0-5 2.2-5 5v34c0 2.8-2.2 5-5 5H13V16.5c0-3.6 2.9-6.5 6.5-6.5Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M13 18h25c2.2 0 4 1.8 4 4v32"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path
        d="M50.5 10c2.5 0 4.5 2 4.5 4.5S53 19 50.5 19H46v-4c0-2.8 2.2-5 5-5h-.5Z"
        fill="currentColor"
        opacity="0.28"
      />
      <path
        d="M50.5 10c2.5 0 4.5 2 4.5 4.5S53 19 50.5 19H46"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 27h14M21 35h13M21 43h9"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
