import type { ComponentPropsWithoutRef } from "react";
import type { LucideIcon } from "lucide-react";
import { ICON_REGISTRY, type IconName } from "./icons";

export type { IconName };

interface IconProps extends ComponentPropsWithoutRef<LucideIcon> {
  name: IconName;
}

/**
 * Renders a registered icon (see {@link ICON_REGISTRY}). Decorative by default
 * (`aria-hidden`) since icons sit beside text or inside elements that already
 * carry a label; pass `aria-hidden={false}` with an `aria-label` for a
 * meaningful standalone icon. Size with Tailwind (`className="h-5 w-5"`) or the
 * `size` prop, and tint with a text-color utility (Lucide strokes use
 * `currentColor`).
 */
export function Icon({ name, ...props }: IconProps) {
  const Glyph = ICON_REGISTRY[name];
  return <Glyph aria-hidden {...props} />;
}
