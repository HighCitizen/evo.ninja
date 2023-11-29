import type { NextApiRequest, NextApiResponse } from "next";
import OpenAIApi from "openai";
import { api } from "./embeddings";
import { createSupabaseServerClient } from "../../../src/supabase/createServerClient";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const supabase = createSupabaseServerClient();
    const session = await supabase.auth.getSession()
    if (session) {
      const functions = req.body.functions ?? undefined;
      try {
        const completion = await api.chat.completions.create({
          messages: req.body.messages,
          model: req.body.options.model,
          functions,
          function_call: functions ? "auto" : undefined,
          temperature: req.body.options.temperature,
          max_tokens: req.body.options.maxTokens,
        });
        if (completion.choices.length < 1) {
          return res.status(400).json({
            error: "Chat completion choices length was 0...",
          });
        }

        const choice = completion.choices[0];

        if (!choice.message) {
          return res.status(400).json({
            error: `Chat completion message was undefined: ${JSON.stringify(
              choice,
              null,
              2
            )}`,
          });
        }

        return res.status(200).json({ message: choice.message });
      } catch (e: any) {
        // Rate limit error
        if (e instanceof OpenAIApi.APIError && e.status === 429) {
          return res.status(429).json({
            error: "Rate limit error thrown from OpenAI",
          });
        }

        return res.status(500).json({
          error: "Unknown error thrown from OpenAI: " + e.message,
        });
      }
    } else {
      return res.status(401).json({
        error: "User must be logged in",
      });
    }
  } else {
    return res.status(404).json({
      message: `HTTP Method ${req.method} not supported in endpoint /api/proxy/embeddings`,
    });
  }
}
