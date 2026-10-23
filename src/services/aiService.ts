import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "../config/env.js";

const DEFAULT_MODEL = "gemini-2.5-flash";

let aiClient: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  if (aiClient) {
    return aiClient;
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }

  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
}

export async function generateStructured<T>(options: {
  prompt: string;
  schema: z.ZodType<T>;
  systemInstruction?: string;
}): Promise<T> {
  const client = getClient();
  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const config = {
    responseMimeType: "application/json",
    responseJsonSchema: z.toJSONSchema(options.schema),
    ...(options.systemInstruction
      ? { systemInstruction: options.systemInstruction }
      : {}),
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt =
      attempt === 0
        ? options.prompt
        : `${options.prompt}\n\nReturn only valid JSON that matches the required schema.`;
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    try {
      const parsed: unknown = JSON.parse(response.text ?? "");
      return options.schema.parse(parsed);
    } catch {
      if (attempt === 1) {
        throw new Error("AI returned invalid data");
      }
    }
  }

  throw new Error("AI returned invalid data");
}
