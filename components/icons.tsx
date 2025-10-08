import type React from "react";

type SvgIconProps = Omit<React.SVGProps<SVGSVGElement>, "color"> & {
  title?: string;
  strokeColor?: string;
  fillColor?: string;
};

export function CircleGridLoaderIcon({
  title,
  strokeColor,
  fillColor = "currentColor",
  width,
  height,
  strokeWidth,
  stroke,
  fill,
  ...rest
}: SvgIconProps) {
  const resolvedStroke = stroke ?? strokeColor;
  const resolvedFill = fill ?? fillColor;

  return (
    <svg
      width={width ?? "42px"}
      height={height ?? "42px"}
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke={resolvedStroke}
      strokeWidth={strokeWidth}
      color={resolvedStroke}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <style>{`
            @keyframes scale_MODKW {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(0.5);
              }
            }

            @keyframes fade_MODKW {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.5;
              }
            }
          `}</style>
      </defs>
      <circle
        cx={3}
        cy={3}
        r={3}
        fill={resolvedFill}
        style={{
          animation:
            "scale_MODKW 0.6s linear infinite, fade_MODKW 0.6s linear infinite",
          animationDelay: "-0.56s",
          transformOrigin: "3px 3px",
        }}
      />
      <circle
        cx={3}
        cy={21}
        r={3}
        fill={resolvedFill}
        style={{
          animation:
            "scale_MODKW 0.6s linear infinite, fade_MODKW 0.6s linear infinite",
          animationDelay: "-0.43s",
          transformOrigin: "3px 21px",
        }}
      />
      <circle
        cx={3}
        cy={39}
        r={3}
        fill={resolvedFill}
        style={{
          animation:
            "scale_MODKW 0.6s linear infinite, fade_MODKW 0.6s linear infinite",
          animationDelay: "-0.12s",
          transformOrigin: "3px 39px",
        }}
      />
      <circle
        cx={21}
        cy={3}
        r={3}
        fill={resolvedFill}
        style={{
          animation:
            "scale_MODKW 0.6s linear infinite, fade_MODKW 0.6s linear infinite",
          animationDelay: "-0.18s",
          transformOrigin: "21px 3px",
        }}
      />
      <circle
        cx={21}
        cy={21}
        r={3}
        fill={resolvedFill}
        style={{
          animation:
            "scale_MODKW 0.6s linear infinite, fade_MODKW 0.6s linear infinite",
          animationDelay: "-0.51s",
          transformOrigin: "21px 21px",
        }}
      />
      <circle
        cx={21}
        cy={39}
        r={3}
        fill={resolvedFill}
        style={{
          animation:
            "scale_MODKW 0.6s linear infinite, fade_MODKW 0.6s linear infinite",
          animationDelay: "-0.39s",
          transformOrigin: "21px 39px",
        }}
      />
      <circle
        cx={39}
        cy={3}
        r={3}
        fill={resolvedFill}
        style={{
          animation:
            "scale_MODKW 0.6s linear infinite, fade_MODKW 0.6s linear infinite",
          animationDelay: "-0.23s",
          transformOrigin: "39px 3px",
        }}
      />
      <circle
        cx={39}
        cy={21}
        r={3}
        fill={resolvedFill}
        style={{
          animation:
            "scale_MODKW 0.6s linear infinite, fade_MODKW 0.6s linear infinite",
          animationDelay: "-0.13s",
          transformOrigin: "39px 21px",
        }}
      />
      <circle
        cx={39}
        cy={39}
        r={3}
        fill={resolvedFill}
        style={{
          animation:
            "scale_MODKW 0.6s linear infinite, fade_MODKW 0.6s linear infinite",
          animationDelay: "-0.24s",
          transformOrigin: "39px 39px",
        }}
      />
    </svg>
  );
}
