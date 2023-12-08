import { AgentOutputType } from "@/agent-core"
import { ScriptFunction } from "./utils";
import { Agent } from "../agents/utils";

interface OnGoalFailedFuncParameters { 
  message: string
};

export class OnGoalFailedFunction extends ScriptFunction<{}> {
  name: string = "agent_onGoalFailed";
  description: string = `Informs the user that the agent could not achieve the goal.`;
  parameters: any = {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "information about how the goal was achieved",
      },
    },
    required: ["message"],
    additionalProperties: false,
  };

  onSuccess(
    agent: Agent,
    params: OnGoalFailedFuncParameters,
    rawParams: string | undefined,
    result: string
  ) {
    return {
      outputs: [
        {
          type: AgentOutputType.Success,
          title: `[${agent.config.prompts.name}] ${this.name}`,
          content: params.message,
        },
      ],
      messages: [],
    };
  }

  onFailure(
    agent: Agent,
    params: OnGoalFailedFuncParameters,
    rawParams: string | undefined,
    error: string
  ) {
    return {
      outputs: [
        {
          type: AgentOutputType.Error,
          title: `[${agent.config.prompts.name}] Error in ${this.name}: ${error}`,
          content: params.message,
        },
      ],
      messages: [],
    };
  }
}
