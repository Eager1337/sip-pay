import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface Props {
  eyebrow?: string;
  title: string;
  tagline: string;
  image: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  variant?: "light" | "dark";
  size?: "full" | "half";
  textPosition?: "top" | "bottom";
}

export const ProductTile = ({
  eyebrow,
  title,
  tagline,
  image,
  primaryHref = "#",
  primaryLabel = "Learn more",
  secondaryHref = "#",
  secondaryLabel = "Coming soon",
  variant = "light",
  size = "full",
  textPosition = "top",
}: Props) => {
  const dark = variant === "dark";
  return (
    <article
      className={`tile fade-up ${dark ? "bg-foreground text-background" : "bg-card text-foreground"} ${
        size === "full" ? "min-h-[580px]" : "min-h-[520px]"
      }`}
    >
      <div className={`w-full px-6 ${textPosition === "top" ? "pt-12 pb-4" : "order-2 pb-12 pt-4"} text-center space-y-2`}>
        {eyebrow && <p className="text-xs font-semibold tracking-widest uppercase opacity-70">{eyebrow}</p>}
        <h2 className="display text-4xl md:text-5xl">{title}</h2>
        <p className="text-base md:text-lg opacity-80">{tagline}</p>
        <div className="flex items-center justify-center gap-4 pt-3 text-sm">
          <Link to={primaryHref} className="pill-link">
            {primaryLabel} <ChevronRight size={14} />
          </Link>
          <span
            className={`btn-pill cursor-not-allowed opacity-90 ${dark ? "bg-background text-foreground" : "bg-accent text-accent-foreground"}`}
            aria-disabled="true"
          >
            {secondaryLabel}
          </span>
        </div>
      </div>
      <div className={`flex-1 w-full flex items-end justify-center ${textPosition === "top" ? "" : "order-1"}`}>
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="max-h-[380px] w-auto object-contain drop-shadow-xl"
        />
      </div>
    </article>
  );
};
