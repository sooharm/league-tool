"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PlayerNameOption = {
  playerId: string;
  nickname: string;
  elo: number;
  tier: number;
};

export function EloPlayerNameAutocomplete({
  players,
  selectedPlayerId,
  onSelect,
  placeholder = "선수 닉네임 입력",
}: {
  players: PlayerNameOption[];
  selectedPlayerId: string;
  onSelect: (playerId: string) => void;
  placeholder?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.playerId === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );

  useEffect(() => {
    if (selectedPlayer) {
      setQuery(selectedPlayer.nickname);
    } else if (!selectedPlayerId) {
      setQuery("");
    }
  }, [selectedPlayer, selectedPlayerId]);

  const suggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return players.slice(0, 12);
    }

    return players
      .filter((player) => player.nickname.toLowerCase().includes(trimmed))
      .sort((a, b) => {
        const aStarts = a.nickname.toLowerCase().startsWith(trimmed);
        const bStarts = b.nickname.toLowerCase().startsWith(trimmed);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.nickname.localeCompare(b.nickname, "ko");
      })
      .slice(0, 12);
  }, [players, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectPlayer(player: PlayerNameOption) {
    setQuery(player.nickname);
    setOpen(false);
    onSelect(player.playerId);
  }

  function trySubmitQuery() {
    const trimmed = query.trim();
    if (!trimmed) {
      onSelect("");
      return;
    }

    const exact = players.find(
      (player) => player.nickname.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exact) {
      selectPlayer(exact);
      return;
    }

    if (suggestions.length === 1) {
      selectPlayer(suggestions[0]);
      return;
    }

    if (suggestions.length > 0) {
      setOpen(true);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (!event.target.value.trim()) {
            onSelect("");
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, Math.max(suggestions.length - 1, 0)));
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            if (open && suggestions[activeIndex]) {
              selectPlayer(suggestions[activeIndex]);
              return;
            }
            trySubmitQuery();
            return;
          }

          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="elo-player-suggestions"
      />

      {open && suggestions.length > 0 ? (
        <ul
          id="elo-player-suggestions"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
          role="listbox"
        >
          {suggestions.map((player, index) => (
            <li key={player.playerId} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPlayer(player)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                  index === activeIndex
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "text-[var(--foreground)] hover:bg-[var(--background)]/60"
                }`}
              >
                <span className="font-medium">{player.nickname}</span>
                <span className="text-xs text-[var(--muted)]">
                  {player.tier}티어 · RP {player.elo}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open && query.trim() && suggestions.length === 0 ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--muted)] shadow-lg">
          일치하는 선수가 없습니다.
        </div>
      ) : null}
    </div>
  );
}
