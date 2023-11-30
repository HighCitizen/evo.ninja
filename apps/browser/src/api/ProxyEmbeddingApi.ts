import {
  EmbeddingApi,
  EmbeddingCreationResult,
  Tokenizer,
  splitArray,
} from "@evo-ninja/agents";
import { DEFAULT_ADA_CONFIG } from "@evo-ninja/agents";
import { ERROR_SUBSIDY_MAX } from "./errors";

const MAX_RATE_LIMIT_RETRIES = 5;

export class ProxyEmbeddingApi implements EmbeddingApi {
  private _goalId: string | undefined = undefined;

  constructor(
    private _tokenizer: Tokenizer,
    private _setCapReached: () => void
  ) {}

  public setGoalId(goalId: string | undefined) {
    this._goalId = goalId;
  }

  public async createEmbeddings(
    input: string | string[],
    tries?: number
  ): Promise<EmbeddingCreationResult[]> {
    const config = DEFAULT_ADA_CONFIG;

    const inputs = Array.isArray(input) ? input : [input];
    for (const input of inputs) {
      if (this._tokenizer.encode(input).length > config.maxTokensPerInput) {
        throw new Error(
          `Input exceeds max request tokens: ${config.maxTokensPerInput}`
        );
      }
    }

    const batchedInputs = splitArray(inputs, config.maxInputsPerRequest);

    const goalId = this._goalId;
    if (!goalId) {
      throw Error("GoalID is not set");
    }

    const embeddingResponse = await fetch("/api/proxy/embeddings", {
      method: "POST",
      body: JSON.stringify({
        input: batchedInputs,
        model: config.model,
        goalId
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.json();
      if (embeddingResponse.status === 400) {
        throw Error("Error from OpenAI Embeddings: " + error.error);
      }
      if (embeddingResponse.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 15000));
        if (!tries || tries < MAX_RATE_LIMIT_RETRIES) {
          return this.createEmbeddings(input, tries == undefined ? 0 : ++tries);
        }
      }
      if (embeddingResponse.status === 403) {
        this._setCapReached();
        throw Error(ERROR_SUBSIDY_MAX);
      }
      throw Error("Error trying to get response from embeddings proxy.", error);
    }
    const { embeddings } = await embeddingResponse.json();
    return embeddings;
  }
}
