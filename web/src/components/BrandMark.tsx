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
        <linearGradient id="brand-bolt-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fbff" />
          <stop offset="60%" stopColor="#d9f4ff" />
          <stop offset="100%" stopColor="#a2e8ff" />
        </linearGradient>
        <filter id="brand-bolt-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="6" y="6" width="60" height="60" rx="14" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.08)" />
      <path
        d="M40 7 20 36h14l-6 29 24-36H38l2-22z"
        fill="url(#brand-bolt-gradient)"
        filter="url(#brand-bolt-glow)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
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
        <div className="brand-wordmark" aria-hidden={(variant as string) === "icon"}>
          <span className="brand-wordmark__title">Qlik Codex I.A</span>
          {showBeta && <span className="brand-wordmark__beta">BETA</span>}
        </div>
      )}
    </div>
  );
};

export default BrandMark;
