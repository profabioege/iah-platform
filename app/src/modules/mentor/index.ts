export type {
  MentorHistoryMessage,
  MentorMessageRole,
  MentorMissionContext,
  MentorProvider,
  MentorRequest,
  MentorResponse,
} from "./domain/mentor-provider.ts";

export { demoMentorProvider } from "./infrastructure/demo-mentor-provider.ts";

export {
  CURRENT_MENTOR_VERSION,
  createMentorSession,
  type MentorMessageRecord,
  type MentorSession,
  type MentorSessionStatus,
} from "./domain/mentor-session.ts";
export type {
  MentorMessageRepository,
  MentorRepositories,
  MentorSessionRepository,
} from "./domain/repositories.ts";
export { getDefaultMentorRepositories } from "./infrastructure/repository-factory.ts";
export {
  createMentorSessionService,
  findAssignmentForMission,
  type MentorSessionScope,
  type MentorSessionService,
  type SendMentorMessageParams,
} from "./services/mentor-session-service.ts";
export {
  openMentorSessionAction,
  sendMentorMessageAction,
} from "./infrastructure/mentor-actions.ts";

import type { MentorProvider } from "./domain/mentor-provider.ts";
import { demoMentorProvider } from "./infrastructure/demo-mentor-provider.ts";

export function getMentorProvider(): MentorProvider {
  return demoMentorProvider;
}

export function isMentorIAHEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_MENTOR_IAH === "true";
}
