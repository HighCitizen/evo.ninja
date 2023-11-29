import { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "../../../src/supabase/createServerClient";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createSupabaseServerClient();
  switch (req.method) {
    case "GET":
      const { data: prompts, error } = await supabase
        .from("prompts")
        .select()
        .eq("user_email", req.query.email)
        .eq("submission_date", new Date().toISOString());
      if (error) {
        res.status(500).json({
          error: error.message,
        });
        return;
      }
      res.status(200).json({
        prompts,
      });
      return;
    case "POST":
      const promptAdded = await supabase
        .from("prompts")
        .insert({
          user_email: req.body.email,
          prompt: req.body.message,
          submission_date: new Date().toISOString(),
        })
        .select();
      if (promptAdded.error) {
        res.status(500).json({
          error: promptAdded.error.message,
        });
        return;
      }
      res.status(200).json({
        promptAdded: promptAdded.data,
      });
      return
    default:
      throw new Error("Method " + req.method + " not supported for the endpoint /api/supabase/prompts");
  }
}
