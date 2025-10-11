import { NextRequest, NextResponse } from "next/server";
import validator from "validator";
import { z } from "zod";

const faviconRequestSchema = z.object({
  url: z
    .string()
    .min(1, { message: "URL parameter is required" })
    .refine(
      (val) => {
        const isValid = validator.isURL(val, {
          protocols: ["http", "https"],
          require_protocol: true,
          require_valid_protocol: true,
        });
        if (!isValid) {
          console.log("API: Invalid URL detected:", val);
          console.log("API: Validator result:", isValid);
        }

        return isValid;
      },
      {
        message: "Invalid URL format. Must be a valid HTTP or HTTPS URL.",
      },
    ),
});

const faviconResponseSchema = z.object({
  faviconUrl: z.string().url(),
  domain: z.string().min(1),
});

type FaviconResponse = z.infer<typeof faviconResponseSchema>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    const validationResult = faviconRequestSchema.safeParse({ url });

    if (!validationResult.success) {
      const errorMessage =
        validationResult.error.errors[0]?.message || "Invalid request";
      console.log("API: Validation failed:", validationResult.error.errors);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { url: validatedUrl } = validationResult.data;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(validatedUrl);
    } catch {
      return NextResponse.json(
        { error: "Could not parse URL" },
        { status: 400 },
      );
    }

    const domain = parsedUrl.hostname;

    if (!domain) {
      return NextResponse.json(
        { error: "Could not extract domain from URL" },
        { status: 400 },
      );
    }

    // Additional security: Validate domain format
    if (!validator.isFQDN(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 },
      );
    }

    // Security: Block private/localhost domains
    if (
      validator.isIP(domain) ||
      domain.includes("localhost") ||
      domain.includes("127.0.0.1")
    ) {
      return NextResponse.json(
        { error: "Private/localhost domains are not allowed" },
        { status: 400 },
      );
    }

    // Security: Block potentially malicious domains
    const blockedPatterns = [
      /^0\.0\.0\.0$/,
      /^localhost$/,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
    ];

    if (blockedPatterns.some((pattern) => pattern.test(domain))) {
      return NextResponse.json(
        { error: "Domain not allowed" },
        { status: 400 },
      );
    }

    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    try {
      const response = await fetch(faviconUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FaviconFetcher/1.0)",
        },
      });

      if (!response.ok) {
        console.log(
          `API: Favicon not accessible for domain: ${domain}, status: ${response.status}`,
        );
        throw new Error("Favicon not accessible");
      }
    } catch (error) {
      console.log(`API: Error fetching favicon for domain: ${domain}`, error);
      return NextResponse.json(
        { error: "Favicon not found or not accessible" },
        { status: 404 },
      );
    }

    console.log(`API: Successfully fetched favicon for domain: ${domain}`);

    const responseData: FaviconResponse = {
      faviconUrl,
      domain,
    };
    const responseValidation = faviconResponseSchema.safeParse(responseData);
    if (!responseValidation.success) {
      console.error(
        "API: Response validation failed:",
        responseValidation.error,
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
