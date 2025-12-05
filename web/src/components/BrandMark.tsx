import React from "react";
import "./BrandMark.css";

type BrandMarkVariant = "full" | "icon" | "wordmark";
type BrandMarkSize = "sm" | "md" | "lg";

interface BrandMarkProps {
  variant?: BrandMarkVariant;
  size?: BrandMarkSize;
  showBeta?: boolean;
  className?: string;
  title?: string;
  onClick?: () => void;
}

const BrandGlyph: React.FC<{ size: BrandMarkSize }> = ({ size }) => {
  const sizeMap: Record<BrandMarkSize, number> = { sm: 32, md: 38, lg: 46 };
  const dimension = sizeMap[size] ?? 38;

  return (
    <svg
      className="brand-glyph"
      width={dimension}
      height={dimension}
      viewBox="0 0 72 72"
      role="presentation"
      aria-hidden
    >
      <defs>
        <linearGradient id="brand-mark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--brand-primary)" />
          <stop offset="55%" stopColor="var(--brand-secondary)" />
          <stop offset="100%" stopColor="var(--brand-primary)" />
        </linearGradient>
        <filter id="brand-mark-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <polygon
        points="36,6 63,21 63,51 36,66 9,51 9,21"
        fill="rgba(0, 231, 255, 0.08)"
        stroke="url(#brand-mark-gradient)"
        strokeWidth="2.4"
        filter="url(#brand-mark-glow)"
        rx="8"
      />
      <circle
        cx="36"
        cy="32"
        r="13"
        fill="rgba(117, 75, 255, 0.08)"
        stroke="url(#brand-mark-gradient)"
        strokeWidth="3"
        filter="url(#brand-mark-glow)"
      />
      <path
        d="M36 19c-7.2 0-13 5.8-13 13s5.8 13 13 13c2.4 0 4.6-.64 6.6-1.77l8.4 8.39"
        stroke="url(#brand-mark-gradient)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#brand-mark-glow)"
      />
      <circle cx="36" cy="52" r="2.6" fill="var(--brand-primary)" opacity="0.9" />
      <circle cx="28" cy="52" r="2" fill="var(--brand-secondary)" opacity="0.75" />
      <circle cx="44" cy="52" r="2" fill="var(--brand-secondary)" opacity="0.75" />
    </svg>
  );
};

export const BrandMark: React.FC<BrandMarkProps> = ({
  variant = "full",
  size = "md",
  showBeta = true,
  className = "",
  title,
  onClick
}) => {
  const classes = [
    "brand-mark",
    `brand-${variant}`,
    `brand-${size}`,
    onClick ? "brand-clickable" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  const accessibleProps = onClick
    ? {
      role: "button" as const,
      tabIndex: 0,
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }
    }
    : {};

  return (
    <div className={classes} onClick={onClick} aria-label={title || "Qlik Codex I.A"} {...accessibleProps}>
      {variant !== "wordmark" && <BrandGlyph size={size} />}
      {variant !== "icon" && (
        <div className="brand-wordmark" aria-hidden={variant === "icon"}>
          <span className="brand-wordmark__title">Qlik Codex I.A</span>
          {showBeta && <span className="brand-wordmark__beta">BETA</span>}
        </div>
      )}
    </div>
  );
};

export default BrandMark;
