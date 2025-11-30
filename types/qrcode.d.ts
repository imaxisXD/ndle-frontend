declare module "qrcode" {
  export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";
  export interface ToStringOptions {
    type?: "svg" | "utf8" | "term";
    errorCorrectionLevel?: ErrorCorrectionLevel;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }
  export function toString(
    text: string,
    options?: ToStringOptions,
  ): Promise<string>;
  const _default: {
    toString: typeof toString;
  };
  export default _default;
}


