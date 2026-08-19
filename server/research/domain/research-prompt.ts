import { z } from "zod";

const researchPromptSchema = z.string().trim().min(10).max(500);

export class ResearchPrompt {
  private constructor(private readonly value: string) {}

  static create(candidate: unknown): ResearchPrompt {
    return new ResearchPrompt(researchPromptSchema.parse(candidate));
  }

  toString(): string {
    return this.value;
  }
}
