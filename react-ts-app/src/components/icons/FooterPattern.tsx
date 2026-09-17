// Ported from public/images/footer-pattern.svg (was a plain <img
// src="/images/..."> in Footer.tsx) into an inline component, matching how
// Logo.tsx (this same folder) already does the header's own logo mark.
interface FooterPatternProps {
  className?: string;
}

export function FooterPattern({ className }: FooterPatternProps) {
  return (
    <svg
      width="189px"
      height="74px"
      viewBox="0 0 189 74"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="footer-pattern"
    >
      <title>Triangles</title>
      <g stroke="none" strokeWidth={1} fill="none" fillRule="evenodd">
        <g transform="translate(0.000000, -1517.000000)">
          <g transform="translate(0.000000, 1517.000000)">
            <polygon fill="#88BC47" points="21.1165685 61.4784736 0.130656087 49.2389621 21.1165685 37.0003296" />
            <polygon fill="#021867" points="0.130656087 24.7608621 21.1165685 37.0003736 0.130656087 49.2390061" />
            <polygon fill="#88BC47" points="0.130656087 0.283025715 21.1165685 12.5220977 0.130656087 24.7607302" />
            <polygon fill="#88BC47" points="42.1016019 24.7608621 21.1165685 12.5217901 42.1016019 0.283157563" />
            <polygon fill="#EFEFEF" points="63.0875143 61.4784736 42.1016019 49.2389621 63.0875143 37.0003296" />
            <polygon fill="#021867" points="63.0875143 37.0002417 42.1016019 24.7607302 63.0875143 12.5220977" />
            <polygon fill="#EFEFEF" points="63.0875143 37.0002417 84.0725476 49.2393137 63.0875143 61.4783857" />
            <polygon fill="#EFEFEF" points="63.0875143 12.5219659 84.0725476 24.7610379 63.0875143 37.0001099" />
            <polygon fill="#EFEFEF" points="84.0723719 49.2391379 105.058284 61.4786494 84.0723719 73.7168424" />
            <polygon fill="#EFEFEF" points="126.043977 73.7169743 105.058504 61.4783418 126.043977 49.2392698" />
            <polygon fill="#EFEFEF" points="147.029054 61.4784736 126.044021 49.2389621 147.029054 37.0003296" />
            <polygon fill="#EFEFEF" points="147.029054 37.0002417 168.014967 49.2393137 147.029054 61.4783857" />
            <polygon fill="#EFEFEF" points="168.014967 49.2391379 189 61.4786494 168.014967 73.7168424" />
          </g>
        </g>
      </g>
    </svg>
  );
}
