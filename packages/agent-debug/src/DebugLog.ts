import { Timer } from "./Timer";
import { DebugLlmReq } from "./DebugLlmReq";

import {
  ChatLogs,
  ChatMessage,
  Workspace,
  PriorityContainer,
} from "@evo-ninja/agent-utils";

interface DebugGoal {
  prompt: string;
  time: Timer;
  tokens: number;
  llmReqs: number;
}

interface DebugStep {
  time: Timer;
  message?: string;
  error?: string;
  llmTime: Timer;
  llmReqs: DebugLlmReq[];
}

export class DebugLog {
  private goal: DebugGoal = {
    prompt: "",
    time: new Timer(),
    tokens: 0,
    llmReqs: 0,
  };
  private steps: DebugStep[] = [];
  private longestLlmReqs: PriorityContainer<DebugLlmReq>;

  constructor(public workspace: Workspace) {
    this.longestLlmReqs = new PriorityContainer<DebugLlmReq>(
      5,
      (a, b) => b.time.duration() - a.time.duration()
    );
  }

  private get latestStep() {
    return this.steps[this.steps.length - 1];
  }

  save(): void {
    this.workspace.writeFileSync("debug.json", this.toString());
    this.workspace.writeFileSync(
      "perf.json",
      JSON.stringify(this.longestLlmReqs.getItems(), null, 2)
    );
  }

  goalStart(prompt: string): void {
    this.goal.prompt = prompt;
    this.goal.time.start();
    this.save();
  }

  goalEnd(): void {
    this.goal.time.end();
    this.save();
  }

  stepStart(): void {
    const step: DebugStep = {
      time: new Timer(),
      llmTime: new Timer(),
      llmReqs: [],
    };
    step.time.start();
    this.steps.push(step);
    this.save();
  }

  stepEnd(): void {
    this.latestStep.time.end();
    this.save();
  }

  stepLog(message: string): void {
    this.latestStep.message = message;
    this.save();
  }

  stepError(error: string): void {
    this.latestStep.error = error;
    this.save();
  }

  stepLlmReq(time: Timer, chatLogs: ChatLogs, response?: ChatMessage): void {
    const req = new DebugLlmReq(time, chatLogs, response);
    this.goal.llmReqs += 1;
    this.goal.tokens += req.tokens;
    this.latestStep.llmReqs.push(req);
    this.latestStep.llmTime.add(req.time.duration());
    this.longestLlmReqs.addItem(req);
    this.save();
  }

  toString(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  toJSON(): {
    goal: DebugGoal;
    steps: DebugStep[];
  } {
    return {
      goal: this.goal,
      steps: this.steps,
    };
  }
}
