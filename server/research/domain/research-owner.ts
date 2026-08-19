import { z } from "zod";

const uuidSchema = z.string().uuid();

export class VisitorSessionId {
  private constructor(private readonly value: string) {}

  static create(candidate: string): VisitorSessionId {
    return new VisitorSessionId(uuidSchema.parse(candidate));
  }

  static generate(): VisitorSessionId {
    return VisitorSessionId.create(crypto.randomUUID());
  }

  static tryCreate(candidate: string | undefined): VisitorSessionId | null {
    const result = uuidSchema.safeParse(candidate);
    return result.success ? new VisitorSessionId(result.data) : null;
  }

  toString(): string {
    return this.value;
  }
}

export type ResearchOwner = {
  sessionId: VisitorSessionId;
  userId: string | null;
};
