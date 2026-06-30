import { isPublished, type EntryWithTeams } from "@/lib/entry";
import type { Match, MatchEntry, MatchStatus } from "@prisma/client";

type PredictionMatch = {
  status: MatchStatus;
  scheduledAt: Date | null;
  homeTeamId: string;
  awayTeamId: string;
  entry: MatchEntry | null;
};

export function toPredictionEntryContext(match: PredictionMatch): EntryWithTeams {
  return {
    homeConfirmedAt: match.entry?.homeConfirmedAt ?? null,
    awayConfirmedAt: match.entry?.awayConfirmedAt ?? null,
    publishedAt: match.entry?.publishedAt ?? null,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    scheduledAt: match.scheduledAt,
  };
}

export function isPredictionOpen(match: PredictionMatch, now = new Date()): boolean {
  const entryContext = toPredictionEntryContext(match);
  if (!isPublished(entryContext, now)) {
    return false;
  }

  if (match.status === "COMPLETED") {
    return false;
  }

  if (match.scheduledAt && now >= match.scheduledAt) {
    return false;
  }

  return true;
}
