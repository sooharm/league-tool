import { isDevPredictPreviewEnabled } from "@/lib/dev-predict";
import {
  getSetEntryPlayers,
  isPublished,
  type EntrySlotPlayer,
  type EntryWithTeams,
} from "@/lib/entry";
import type { MatchEntry, MatchStatus, SetResult, TierBracket } from "@prisma/client";

type PredictionMatch = {
  status: MatchStatus;
  scheduledAt: Date | null;
  homeTeamId: string;
  awayTeamId: string;
  entry: MatchEntry | null;
};

type PredictionSet = {
  id: string;
  orderIndex: number;
  tierBracket: TierBracket;
  result: SetResult | null;
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
  if (isDevPredictPreviewEnabled()) {
    if (match.status === "COMPLETED") {
      return false;
    }

    if (match.scheduledAt && now >= match.scheduledAt) {
      return false;
    }

    return true;
  }

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

export function isSetPredictionOpen(
  match: PredictionMatch,
  set: PredictionSet,
  slots: EntrySlotPlayer[],
  now = new Date(),
): boolean {
  if (set.tierBracket === "ACE") {
    return false;
  }

  if (set.result) {
    return false;
  }

  if (!isPredictionOpen(match, now)) {
    return false;
  }

  const players = getSetEntryPlayers(set.id, match.homeTeamId, match.awayTeamId, slots);
  return !!(players.home && players.away);
}
