import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { castVoteFn, getBlackrugState, type BlackrugPublicState } from "@/lib/blackrugServer";

/**
 * Client access to BlackRug shared state: the spec registry, The Board and
 * 24h vote counts. Voter identity is an anonymous UUID in localStorage — no
 * login; the server enforces the 1-vote-per-24h rule against it.
 */

const VOTER_KEY = "blackrug:voterId";

function readVoterId(): string {
  try {
    const existing = localStorage.getItem(VOTER_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(VOTER_KEY, fresh);
    return fresh;
  } catch {
    return "anonymous";
  }
}

export function useVoterId(): string {
  const [voterId] = useState(readVoterId);
  return voterId;
}

export function useBlackrug(): {
  state: BlackrugPublicState | undefined;
  voterId: string;
  vote: (ticker: string) => Promise<{ ok: boolean; reason?: string }>;
  voting: boolean;
} {
  const voterId = useVoterId();
  const queryClient = useQueryClient();
  const [voting, setVoting] = useState(false);

  const { data: state } = useQuery({
    queryKey: ["blackrug", voterId],
    queryFn: () => getBlackrugState({ data: { voterId } }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const vote = useCallback(
    async (ticker: string) => {
      setVoting(true);
      try {
        const result = await castVoteFn({ data: { ticker, voterId } });
        if (result.ok) {
          queryClient.setQueryData(["blackrug", voterId], result.state);
        }
        return result;
      } catch (error) {
        return { ok: false, reason: error instanceof Error ? error.message : "error" };
      } finally {
        setVoting(false);
      }
    },
    [queryClient, voterId],
  );

  return { state, voterId, vote, voting };
}
