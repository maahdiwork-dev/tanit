import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import {
  MultiRoleApiError,
  handleMultiRoleError,
  readJson,
  requiredString,
} from "@/lib/multi-role";

export const dynamic = "force-dynamic";

type OcrRequest = {
  image_url?: unknown;
  context?: {
    kpi_id?: string;
    expected_fields?: unknown;
    language?: string;
  };
};

function configuredGoogleKey() {
  const key = process.env.GOOGLE_API_KEY;
  return key && !key.includes("REPLACE_WITH") ? key : null;
}

function isQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /quota|rate.?limit|resource_exhausted|429/i.test(message);
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new MultiRoleApiError(
      "OCR_PARSE_FAILED",
      "Gemini did not return a JSON object",
      502,
      { preview: text.slice(0, 300) },
    );
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new MultiRoleApiError(
      "OCR_PARSE_FAILED",
      "Gemini returned malformed JSON",
      502,
      { preview: text.slice(0, 300) },
    );
  }
}

function numericConfidence(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : null;
}

function confidenceFromFillRatio(
  extracted: Record<string, unknown>,
  expectedFields: string[],
) {
  if (expectedFields.length === 0) {
    return 1;
  }

  const filled = expectedFields.filter((field) => {
    const value = extracted[field];
    return value !== null && value !== undefined && value !== "";
  }).length;

  return Math.round((filled / expectedFields.length) * 100) / 100;
}

function quotaFallback(expectedFields: string[]) {
  const demoFallbackValues: Record<string, number> = {
    energy_kwh: 4520,
    water_m3: 1280,
    waste_tons: 18.4,
  };

  const extracted = Object.fromEntries(
    expectedFields.map((field) => [field, demoFallbackValues[field] ?? null]),
  );

  return NextResponse.json(
    {
      extracted,
      confidence: 0.6,
      raw_text: "Gemini quota exhausted; demo OCR fallback response returned.",
      model: "gemini-2.5-flash",
      warning: "OCR_PROVIDER_QUOTA_FALLBACK",
    },
    {
      headers: {
        "X-Tanit-OCR-Warning": "OCR_PROVIDER_QUOTA_FALLBACK",
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const body = await readJson<OcrRequest>(request);
    const imageUrl = requiredString(body.image_url, "image_url");
    const expectedFields = Array.isArray(body.context?.expected_fields)
      ? body.context.expected_fields.filter(
          (field): field is string => typeof field === "string" && field.length > 0,
        )
      : [];
    const key = configuredGoogleKey();

    if (!key) {
      throw new MultiRoleApiError(
        "OCR_PROVIDER_ERROR",
        "GOOGLE_API_KEY is not configured",
        502,
      );
    }

    const google = createGoogleGenerativeAI({ apiKey: key });
    const prompt = [
      "Tu es un système d'extraction de KPIs depuis un document scanné ou photographié.",
      `Extrais les valeurs des champs suivants : ${expectedFields.join(", ")}.`,
      'Réponds STRICTEMENT en JSON: { "extracted": {...}, "confidence": 0.0-1.0, "raw_text": "..." }.',
      "Si tu ne peux pas extraire un champ, mets sa valeur à null.",
      "Le confidence reflète ta certitude globale (0.6 = acceptable, 0.9+ = très sûr).",
      `Contexte: ${JSON.stringify(body.context ?? {})}.`,
    ].join("\n");

    let text: string;
    try {
      const result = await generateText({
        model: google("gemini-2.5-flash"),
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image: new URL(imageUrl) },
            ],
          },
        ],
      });
      text = result.text;
    } catch (error) {
      if (isQuotaError(error)) {
        return quotaFallback(expectedFields);
      }

      throw new MultiRoleApiError(
        "OCR_PROVIDER_ERROR",
        error instanceof Error ? error.message : "Gemini unreachable",
        502,
      );
    }

    const parsed = extractJsonObject(text);
    const extracted =
      parsed.extracted && typeof parsed.extracted === "object"
        ? (parsed.extracted as Record<string, unknown>)
        : {};
    const geminiConfidence = numericConfidence(parsed.confidence);
    const fillConfidence = confidenceFromFillRatio(extracted, expectedFields);
    const confidence = Math.min(geminiConfidence ?? 1, fillConfidence);
    const rawText =
      typeof parsed.raw_text === "string" ? parsed.raw_text : text.slice(0, 2000);

    if (confidence < 0.6) {
      throw new MultiRoleApiError(
        "OCR_LOW_CONFIDENCE",
        "OCR confidence is below the demo threshold",
        422,
        { confidence, extracted, raw_text: rawText },
      );
    }

    return NextResponse.json({
      extracted,
      confidence,
      raw_text: rawText,
      model: "gemini-2.5-flash",
    });
  } catch (error) {
    return handleMultiRoleError(error);
  }
}
