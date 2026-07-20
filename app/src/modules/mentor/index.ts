export type {
  MentorHistoryMessage,
  MentorMessageRole,
  MentorMissionContext,
  MentorProvider,
  MentorRequest,
  MentorResponse,
} from "./domain/mentor-provider";

export { demoMentorProvider } from "./infrastructure/demo-mentor-provider";

import type { MentorProvider } from "./domain/mentor-provider";
import { demoMentorProvider } from "./infrastructure/demo-mentor-provider";

export function getMentorProvider(): MentorProvider {
  return demoMentorProvider;
}

export function isMentorIAHEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_MENTOR_IAH === "true";
}
