import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bot,
  Check,
  ChevronRight,
  CircleHelp,
  CircleMinus,
  Crown,
  Gamepad2,
  Heart,
  Hourglass,
  LogOut,
  Maximize2,
  Minimize2,
  Menu as MenuIcon,
  Plus,
  Play,
  RotateCcw,
  Smartphone,
  Sparkles,
  Spade,
  Trophy,
  Tv,
  UserMinus,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { QRCodeSVG } from "qrcode.react";
import {
  BOARD,
  toDisplay,
  toLogical,
} from "../../../packages/engine/src/board";
import type {
  CardFace,
  Cell,
  Seat,
  Team,
  TeamColor,
} from "../../../packages/engine/src/types";
import { api, connect, sendTvFocus } from "./api";
import { cues } from "./audio";
import { nextControllerCell, type BoardDirection } from "./navigation";
import type { RoomLookup, RoomSnapshot, Selected } from "./types";
import { avatarAsset } from "./assets";

const COLORS: TeamColor[] = ["blue", "red", "green"];
const COLOR_HEX: Record<TeamColor, string> = {
  blue: "#2F6BFF",
  red: "#E5484D",
  green: "#30A46C",
};
const avatar = avatarAsset;
const card = (face: CardFace) => `/assets/cards/${face}.svg`;
const cellKey = (cell: Cell) => `${cell.row},${cell.col}`;
const CARD_ASSETS = [
  ...new Set(BOARD.flat().filter((face) => face !== "F")),
] as CardFace[];
let cardAssetsPromise: Promise<void> | null = null;
function preloadCards() {
  return (cardAssetsPromise ??= Promise.all(
    CARD_ASSETS.map(
      (face) =>
        new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => reject(new Error(`Card asset failed: ${face}`));
          image.src = card(face);
        }),
    ),
  ).then(() => undefined));
}

export function GameLogo({ title = "SEQUENCE" }: { title?: string }) {
  return (
    <div className="brand" aria-label={title}>
      {title}
    </div>
  );
}
const Logo = GameLogo;
function Spinner() {
  return (
    <div className="loading">
      <span />
      <p>Setting the table…</p>
    </div>
  );
}
export function FixedStage({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("stage-active");
    document.body.classList.add("stage-active");
    return () => {
      document.documentElement.classList.remove("stage-active");
      document.body.classList.remove("stage-active");
    };
  }, []);
  return (
    <div className="stage-viewport">
      <div className="stage">{children}</div>
    </div>
  );
}
function Credits() {
  return (
    <main className="credits-shell">
      <a className="credits-back" href="/sequence/">
        ← Back to game
      </a>
      <Logo />
      <p className="eyebrow">CREDITS &amp; LICENSES</p>
      <h1>Made for the table.</h1>
      <p className="credits-intro">
        The game keeps its visual assets local, so cards and avatars remain fast
        and dependable during play.
      </p>
      <section>
        <h2>Playing cards</h2>
        <p>
          The card artwork comes from the Public Domain Deck and is provided
          under CC0 1.0.
        </p>
        <a
          href="https://github.com/AustinGabriel/The-Public-Domain-Deck-Public-Domain-and-CC0-Playing-Cards"
          target="_blank"
          rel="noreferrer"
        >
          View the source deck
        </a>
      </section>
      <section>
        <h2>Avatars</h2>
        <p>
          Avataaars was created by Pablo Stanley. These local SVG variations
          were generated with DiceBear, distributed under the MIT license.
        </p>
        <a
          href="https://www.dicebear.com/styles/avataaars/"
          target="_blank"
          rel="noreferrer"
        >
          About Avataaars
        </a>
      </section>
      <section>
        <h2>Type</h2>
        <p>
          Jost and Manrope are distributed through Fontsource under their
          upstream SIL Open Font License terms.
        </p>
      </section>
      <small>
        This independent browser game is not affiliated with the commercial
        Sequence product owner.
      </small>
    </main>
  );
}

export function Avatar({
  id,
  name,
  editable = false,
  onClick,
}: {
  id: string;
  name: string;
  editable?: boolean;
  onClick?: () => void;
}) {
  const content = <img src={avatar(id)} alt="" />;
  return editable ? (
    <button
      className="avatar avatar-button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      aria-label={`Change ${name}'s avatar`}
    >
      {content}
    </button>
  ) : (
    <span className="avatar">{content}</span>
  );
}

export function AvatarPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="scrim avatar-scrim"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="dialog avatar-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-title"
      >
        <header className="avatar-dialog-header">
          <h2 id="avatar-title">Choose avatar</h2>
          <button className="avatar-close" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </header>
        <p className="avatar-hint">Tap an avatar to use it.</p>
        <div className="avatar-grid">
          {Array.from(
            { length: 24 },
            (_, i) => `avataaars-${String(i + 1).padStart(2, "0")}`,
          ).map((id, i) => (
            <button
              key={id}
              className={`avatar-option ${id === current ? "selected" : ""}`}
              aria-label={`Avatar ${i + 1}`}
              aria-pressed={id === current}
              onClick={() => onSelect(id)}
            >
              <img src={avatar(id)} alt="" />
              {id === current && (
                <span className="avatar-check">
                  <Check />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlayerRow({
  seat,
  team,
  you,
  self = you,
  host = false,
  current,
  lobby = false,
  status,
  onAvatar,
  onName,
  onRemove,
  onMove,
}: {
  seat: Seat;
  team: Team;
  you: boolean;
  self?: boolean;
  host?: boolean;
  current?: boolean;
  lobby?: boolean;
  status?: string;
  onAvatar?: () => void;
  onName?: (name: string) => void;
  onRemove?: () => void;
  onMove?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(seat.name);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);
  useEffect(() => setDraft(seat.name), [seat.name]);
  const save = () => {
    const name = draft.trim().replace(/\s+/g, " ");
    if (name && name.length <= 24 && name !== seat.name) onName?.(name);
    setEditing(false);
  };
  return (
    <div
      className={`player ${current ? "current" : ""} ${onMove ? "movable" : ""}`}
      style={
        {
          "--team": team.color ? COLOR_HEX[team.color] : "#8B909A",
        } as React.CSSProperties
      }
      title={`${seat.name}${seat.computer ? " · Computer" : ""}${current ? " · Current turn" : ""}`}
      onClick={onMove}
    >
      <span className="avatar-wrap">
        <Avatar
          id={seat.avatarId}
          name={seat.name}
          editable={you}
          onClick={onAvatar}
        />
        {host && <Crown className="host-crown" aria-label="Host" />}
      </span>
      <div className="player-copy">
        {editing ? (
          <input
            ref={input}
            value={draft}
            maxLength={24}
            aria-label="Player name"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setDraft(seat.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            className="player-name"
            disabled={!you}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => setEditing(true)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === "F2") && you)
                setEditing(true);
            }}
          >
            {seat.name}
          </button>
        )}
        <small className={status === "Sequence made" ? "status-success" : ""}>
          {lobby
            ? team.color
              ? `${seat.computer ? "Computer · " : ""}Tap for options`
              : "No color selected"
            : (status ??
              (current
                ? self
                  ? "Your turn"
                  : "Their turn"
                : seat.computer
                  ? "Computer"
                  : team.color
                    ? `Team ${team.color[0].toUpperCase() + team.color.slice(1)}`
                    : "Team member"))}
        </small>
      </div>
      {current && <span className="turn-dot" aria-label="Current turn" />}
      {onRemove && (
        <button
          className="remove-player"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${seat.name}`}
        >
          ×
        </button>
      )}
      {!lobby && seat.name.length > 14 && (
        <span className="player-tooltip">
          <i
            style={{ background: team.color ? COLOR_HEX[team.color] : "#777" }}
          />
          {seat.name}
          <small>
            {team.color
              ? `Team ${team.color[0].toUpperCase() + team.color.slice(1)}`
              : ""}
          </small>
        </span>
      )}
    </div>
  );
}

function CodeBadge({
  room,
  onToast,
}: {
  room: RoomSnapshot;
  onToast: (text: string) => void;
}) {
  const copy = async () => {
    await navigator.clipboard.writeText(
      `${location.origin}/sequence/join?code=${room.code}`,
    );
    onToast("Invite copied");
  };
  return (
    <button
      className="code-badge"
      onClick={copy}
      aria-label={`Copy invite, code ${room.code}`}
    >
      <small>CODE</small>
      <strong>{room.code}</strong>
    </button>
  );
}

function InviteQr({ room }: { room: RoomSnapshot }) {
  const url = `${location.origin}/sequence/join?code=${room.code}`;
  return (
    <div className="invite-qr" aria-label={`Scan to join game ${room.code}`}>
      <QRCodeSVG
        value={url}
        size={126}
        bgColor="#FFFFFF"
        fgColor="#14161A"
        level="M"
        marginSize={0}
      />
    </div>
  );
}

function ColorPicker({
  team,
  used,
  disabled,
  collapse,
  onPick,
  onCollapse,
}: {
  team: Team;
  used: (TeamColor | null)[];
  disabled: boolean;
  collapse?: boolean;
  onPick: (c: TeamColor | null) => void;
  onCollapse?: () => void;
}) {
  const claimedByOthers = new Set(
    used.filter(
      (color): color is TeamColor => Boolean(color) && color !== team.color,
    ),
  );
  const cycle: (TeamColor | null)[] = [
    null,
    ...COLORS.filter((color) => !claimedByOthers.has(color)),
  ];
  const currentIndex = cycle.findIndex((color) => color === team.color);
  const next = cycle[(currentIndex + 1 + cycle.length) % cycle.length];
  const dot = next ? COLOR_HEX[next] : "#14161A";
  return (
    <div
      className={`color-control ${team.color ? "has-color" : ""}`}
      style={
        {
          "--team": team.color ? COLOR_HEX[team.color] : "#9AA0AA",
        } as React.CSSProperties
      }
    >
      <span>{team.color ? team.color.toUpperCase() : "SELECT COLOR"}</span>
      <button
        className={`color-swatch ${next === null ? "neutral-swatch" : ""}`}
        disabled={disabled}
        style={{ "--dot": dot } as React.CSSProperties}
        onClick={() =>
          collapse && next === null ? onCollapse?.() : onPick(next)
        }
        aria-label={
          collapse && next === null
            ? "Remove empty team"
            : next
              ? `Select ${next}`
              : "Clear team color"
        }
      />
    </div>
  );
}

function PlayerOptions({
  room,
  seat,
  onClose,
  onCommand,
  onLeave,
}: {
  room: RoomSnapshot;
  seat: Seat;
  onClose: () => void;
  onCommand: (command: Record<string, unknown>) => Promise<void>;
  onLeave: () => void;
}) {
  const self = seat.id === room.yourSeatId;
  const member = room.members.find((candidate) => candidate.seatId === seat.id);
  const canManage = room.isHost && !self;
  const destinations = room.teams.filter((team) => team.id !== seat.teamId);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [onClose]);
  const run = async (command: Record<string, unknown>) => {
    onClose();
    await onCommand(command);
  };
  return (
    <div
      className="scrim menu-scrim player-options-scrim"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="menu-popover player-options"
        role="dialog"
        aria-modal="true"
        aria-label={`${seat.name} options`}
      >
        <header>
          <Avatar id={seat.avatarId} name={seat.name} />
          <span className="player-options-copy">
            <strong>{seat.name}</strong>
            <small>{seat.computer ? "Computer" : "Player"}</small>
          </span>
          <button onClick={onClose} aria-label="Close player options">
            <X />
          </button>
        </header>
        {canManage && member && (
          <button
            className="menu-row"
            onClick={() => void run({ type: "makeHost", seatId: seat.id })}
          >
            <Crown />
            <span>Make host</span>
          </button>
        )}
        {destinations.map((team) => (
          <button
            key={team.id}
            className="menu-row"
            onClick={() =>
              void run({ type: "moveSeat", seatId: seat.id, teamId: team.id })
            }
          >
            <i
              className="team-option-dot"
              style={{
                background: team.color ? COLOR_HEX[team.color] : "#14161A",
              }}
            />
            <span>
              {team.color
                ? `Move to ${team.color[0].toUpperCase() + team.color.slice(1)} team`
                : "Move to unselected team"}
            </span>
          </button>
        ))}
        {(canManage || self) && <i className="menu-divider" />}
        {canManage && (
          <button
            className="menu-row danger"
            onClick={() => void run({ type: "removeSeat", seatId: seat.id })}
          >
            <UserMinus />
            <span>Remove</span>
          </button>
        )}
        {self && (
          <button
            className="menu-row danger"
            onClick={() => {
              onClose();
              onLeave();
            }}
          >
            <LogOut />
            <span>Leave game</span>
          </button>
        )}
      </section>
    </div>
  );
}

function Lobby({
  room,
  command,
  onClose,
  onAvatar,
  onToast,
  onTv,
  onStart,
  tv = false,
}: {
  room: RoomSnapshot;
  command: (x: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  onAvatar: () => void;
  onToast: (s: string) => void;
  onTv: () => void;
  onStart: () => void;
  tv?: boolean;
}) {
  const [cardsReady, setCardsReady] = useState(false);
  const [optionsSeatId, setOptionsSeatId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    preloadCards()
      .then(() => active && setCardsReady(true))
      .catch(
        () => active && onToast("Cards could not load. Check your connection."),
      );
    return () => {
      active = false;
    };
  }, [onToast]);
  const isHost = room.isHost;
  const sizes = room.teams.map((t) => t.seatIds.length);
  const balanced = sizes.every((n) => n > 0 && n === sizes[0]);
  const colored = room.teams.every((t) => t.color);
  const canStart = isHost && balanced && colored && cardsReady;
  const displayTeams =
    room.teams.length === 3
      ? [room.teams[0], room.teams[2], room.teams[1]]
      : room.teams;
  const maxSeats = Math.max(
    1,
    ...displayTeams.map((team) => team.seatIds.length),
  );
  const seatRows = Math.min(4, maxSeats);
  const host = room.seats.find((seat) => seat.id === room.hostSeatId);
  return (
    <main
      className={`lobby-shell ${tv ? "tv-lobby" : ""}`}
      style={
        {
          "--max-seats": maxSeats,
          "--seat-rows": seatRows,
        } as React.CSSProperties
      }
    >
      <header className="lobby-top">
        <Logo />
        <button
          className="lobby-close"
          onClick={tv ? () => window.close() : onClose}
          aria-label={tv ? "Close TV view" : "Close game"}
        >
          <X size={18} />
        </button>
      </header>
      <section className="lobby-share">
        <InviteQr room={room} />
        <CodeBadge room={room} onToast={onToast} />
      </section>
      <section className={`teams teams-${room.teams.length}`}>
        {displayTeams.map((team) => (
          <article
            className={`team-panel ${team.color ? "selected-team" : ""}`}
            key={team.id}
            style={
              {
                "--team": team.color ? COLOR_HEX[team.color] : "#8B909A",
              } as React.CSSProperties
            }
          >
            <ColorPicker
              team={team}
              used={room.teams.map((t) => t.color)}
              disabled={tv}
              collapse={
                room.teams.length === 3 &&
                team.id === "team-green" &&
                team.seatIds.length === 0
              }
              onCollapse={() =>
                command({ type: "setColor", teamId: team.id, color: null })
              }
              onPick={(color) =>
                command({ type: "setColor", teamId: team.id, color })
              }
            />
            <div
              className={`team-players ${team.seatIds.length > 4 ? "multi-column" : ""}`}
            >
              {team.seatIds.map((seatId) => {
                const seat = room.seats.find((s) => s.id === seatId)!;
                const member = room.members.find((m) => m.seatId === seatId);
                return (
                  <PlayerRow
                    key={seat.id}
                    seat={seat}
                    team={team}
                    lobby
                    you={member?.isYou ?? false}
                    host={seat.id === room.hostSeatId}
                    onMove={
                      !tv && (isHost || member?.isYou)
                        ? () => setOptionsSeatId(seat.id)
                        : undefined
                    }
                    onAvatar={!tv && member?.isYou ? onAvatar : undefined}
                    onName={
                      !tv && member?.isYou
                        ? (name) =>
                            command({
                              type: "profile",
                              name,
                              avatarId: seat.avatarId,
                            })
                        : undefined
                    }
                  />
                );
              })}
            </div>
            {(isHost || tv) && (
              <button
                className="subtle-btn"
                disabled={tv}
                onClick={() =>
                  !tv && command({ type: "addComputer", teamId: team.id })
                }
              >
                <Plus size={18} />
                Add computer
              </button>
            )}
          </article>
        ))}
        {room.teams.length === 2 && (isHost || tv) && (
          <button
            className="add-team"
            disabled={tv}
            aria-label="Add third team"
            onClick={() => !tv && command({ type: "addTeam" })}
          >
            <Plus size={42} />
          </button>
        )}
      </section>
      {!tv ? (
        <footer className="lobby-footer">
          <button className="tv-view-btn" onClick={onTv}>
            <Tv size={20} />
            TV View
          </button>
          <div className="start-wrap">
            <button className="start" disabled={!canStart} onClick={onStart}>
              <Play size={20} />
              {!isHost ? "Waiting for host" : "Start game"}
            </button>
          </div>
        </footer>
      ) : (
        <div className="tv-lobby-wait">
          <span>◷</span>Waiting for {host?.name ?? "the host"} to start the game
        </div>
      )}
      {!tv &&
        optionsSeatId &&
        room.seats.find((seat) => seat.id === optionsSeatId) && (
          <PlayerOptions
            room={room}
            seat={room.seats.find((seat) => seat.id === optionsSeatId)!}
            onClose={() => setOptionsSeatId(null)}
            onCommand={command}
            onLeave={onClose}
          />
        )}
    </main>
  );
}

function Corner() {
  return (
    <svg
      className="corner-mark"
      aria-label="Free space"
      viewBox="0 0 45.2578 45.2578"
    >
      <circle
        cx="22.6289"
        cy="22.6289"
        r="21.9289"
        fill="#E8EBEC"
        stroke="#283239"
        strokeWidth="1.4"
      />
      <circle
        cx="22.6289"
        cy="22.6289"
        r="19.6289"
        fill="none"
        stroke="#283239"
        strokeWidth=".7"
      />
      <circle cx="22.6" cy="22.6" r="4" fill="#283239" />
      <path
        d="M5 0C3 3 0 4 0 7c0 3 3 4 5 1 2 3 5 2 5-1 0-3-3-4-5-7ZM4 8l-1 4h4L6 8Z"
        transform="translate(18 5)"
        fill="#283239"
      />
      <path
        d="M5 12C3 9 0 6 0 3c0-4 4-4 5-1 1-3 5-3 5 1 0 3-3 6-5 9Z"
        transform="translate(18 29)"
        fill="#283239"
      />
      <path d="m5 0 5 6-5 6-5-6Z" transform="translate(30 17)" fill="#283239" />
      <path
        d="M5 0C1 0 1 4 3 5c-4-1-4 5 0 5l2-2-1 4h3L6 8c4 4 6-3 1-3 3-3 1-5-2-5Z"
        transform="translate(5 17)"
        fill="#283239"
      />
    </svg>
  );
}
function Board({
  room,
  selected,
  onPlay,
  focused,
}: {
  room: RoomSnapshot;
  selected: Selected;
  onPlay: (cardId: string, cell: Cell) => void;
  focused?: Cell | null;
}) {
  const round = room.round!;
  const valid = new Set(selected?.cells.map(cellKey));
  const sequenceColor = new Map(
    round.sequences.flatMap((sequence) => {
      const team = room.teams.find(
        (candidate) => candidate.id === sequence.teamId,
      );
      const color = team?.color ? COLOR_HEX[team.color] : "#30A46C";
      return sequence.cells.map((cell) => [cellKey(cell), color] as const);
    }),
  );
  const last = round.lastMove && cellKey(round.lastMove.cell);
  const removed = round.lastMove?.kind === "remove" ? last : null;
  const removedTeam = room.teams.find(
    (team) => team.id === round.lastMove?.removedTeamId,
  );
  const focusColor = colorForSeat(room, round.currentSeatId);
  const lastColor = colorForSeat(room, round.lastMove?.seatId ?? null);
  return (
    <div className="board-wrap">
      <div className="board-band board-band-top">
        <div className="board-rule">• TWO EYED JACKS ARE WILD •</div>
        <div className="board-word">SEQUENCE</div>
        <div className="board-rule">• ONE EYED JACKS REMOVE •</div>
      </div>
      <div className="board-grid" role="grid" aria-label="Sequence board">
        {Array.from({ length: 10 }, (_, r) =>
          Array.from({ length: 10 }, (_, c) => ({ row: r, col: c })),
        )
          .flat()
          .map((display) => {
            const logical = toLogical(display);
            const face = BOARD[logical.row][logical.col];
            const key = cellKey(logical);
            const teamId = round.chips[logical.row][logical.col];
            const team = room.teams.find((t) => t.id === teamId);
            const isValid = valid.has(key);
            const isFocused = focused && cellKey(focused) === key;
            const completedColor = sequenceColor.get(key);
            return (
              <button
                key={`${display.row}-${display.col}`}
                role="gridcell"
                data-row={logical.row}
                data-col={logical.col}
                className={`board-cell ${isValid ? "valid" : ""} ${isFocused ? "controller-focus" : ""} ${last === key ? "last" : ""} ${removed === key ? "removed" : ""} ${completedColor ? "sequence-cell" : ""}`}
                style={
                  {
                    "--chip": team?.color ? COLOR_HEX[team.color] : "#777",
                    "--valid": selected
                      ? colorForSeat(room, room.yourSeatId, true)
                      : "transparent",
                    "--focus": focusColor,
                    "--last": lastColor,
                    "--sequence": completedColor ?? "transparent",
                  } as React.CSSProperties
                }
                disabled={!isValid}
                onClick={() => selected && onPlay(selected.cardId, logical)}
                aria-label={
                  face === "F"
                    ? "Free corner"
                    : `${face}${team ? " occupied" : ""}`
                }
              >
                {face === "F" ? <Corner /> : <img src={card(face)} alt="" />}
                {team && <span className="chip" />}
                {removed === key && (
                  <span
                    className="removed-chip"
                    style={
                      {
                        "--removed": removedTeam?.color
                          ? COLOR_HEX[removedTeam.color]
                          : "#E5484D",
                      } as React.CSSProperties
                    }
                  />
                )}
              </button>
            );
          })}
      </div>
      <div className="board-band board-band-bottom">
        <div className="board-rule">• ONE EYED JACKS REMOVE •</div>
        <div className="board-word">SEQUENCE</div>
        <div className="board-rule">• TWO EYED JACKS ARE WILD •</div>
      </div>
    </div>
  );
}

function colorForSeat(
  room: RoomSnapshot,
  seatId: string | null,
  light = false,
) {
  const seat = room.seats.find((s) => s.id === seatId);
  const color = room.teams.find((t) => t.id === seat?.teamId)?.color ?? "blue";
  if (!light) return COLOR_HEX[color];
  return color === "blue" ? "#92B5FF" : color === "red" ? "#FFAFB2" : "#8ED9B1";
}
function Hand({
  room,
  selected,
  onSelect,
}: {
  room: RoomSnapshot;
  selected: Selected;
  onSelect: (next: Selected) => void;
}) {
  const yourTurn = room.round?.currentSeatId === room.yourSeatId;
  const actions = new Map(room.yourActions.map((a) => [a.cardId, a]));
  return (
    <div
      className="hand"
      style={
        { "--team": colorForSeat(room, room.yourSeatId) } as React.CSSProperties
      }
    >
      <div className={`hand-row ${yourTurn ? "" : "disabled-hand"}`}>
        {room.yourHand.map((item) => {
          const action = actions.get(item.id);
          const active = selected?.cardId === item.id;
          return (
            <button
              key={item.id}
              disabled={!yourTurn || !action?.cells.length}
              className={`hand-card ${active ? "selected" : ""}`}
              onClick={() =>
                onSelect(
                  active
                    ? null
                    : action
                      ? {
                          cardId: item.id,
                          cells: action.cells,
                          kind: action.kind,
                        }
                      : null,
                )
              }
              aria-pressed={active}
            >
              <img src={card(item.face)} alt={item.face} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Controller({
  room,
  selected,
  onSelect,
  focused,
  onMove,
  onConfirm,
}: {
  room: RoomSnapshot;
  selected: Selected;
  onSelect: (next: Selected) => void;
  focused: Cell | null;
  onMove: (direction: "up" | "right" | "down" | "left") => void;
  onConfirm: () => void;
}) {
  const waiting = room.round?.currentSeatId !== room.yourSeatId;
  const removing = selected?.kind === "remove";
  return (
    <section className={`controller-view ${waiting ? "waiting" : ""}`}>
      <p className="eyebrow">CONTROLLER VIEW</p>
      <h1>{waiting ? "Waiting for your turn" : "Your turn"}</h1>
      <Hand room={room} selected={selected} onSelect={onSelect} />
      <div className="dpad" aria-label="Board navigation">
        <button onClick={() => onMove("up")} aria-label="Move up">
          <ArrowUp />
        </button>
        <button onClick={() => onMove("left")} aria-label="Move left">
          <ArrowLeft />
        </button>
        <span className="dpad-select" aria-hidden="true">
          <span />
        </span>
        <button onClick={() => onMove("right")} aria-label="Move right">
          <ArrowRight />
        </button>
        <button onClick={() => onMove("down")} aria-label="Move down">
          <ArrowDown />
        </button>
      </div>
      <button
        className="controller-play"
        disabled={!focused}
        onClick={onConfirm}
      >
        {removing ? <CircleMinus /> : <Play />}
        {removing ? "Remove chip" : "Place chip"}
      </button>
    </section>
  );
}

function Game({
  room,
  command,
  onMenu,
  onAvatar,
  menuOpen,
  view = "board",
  tv = false,
}: {
  room: RoomSnapshot;
  command: (x: Record<string, unknown>) => Promise<void>;
  onMenu: () => void;
  onAvatar: () => void;
  menuOpen: boolean;
  view?: "board" | "controller";
  tv?: boolean;
}) {
  const [selected, setSelected] = useState<Selected>(null);
  const [focused, setFocused] = useState<Cell | null>(null);
  const [remoteFocus, setRemoteFocus] = useState<Cell | null>(null);
  const [cardsReady, setCardsReady] = useState(false);
  const boardStage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setSelected(null);
    setFocused(null);
  }, [room.round?.turn]);
  useEffect(() => {
    let active = true;
    preloadCards().then(() => active && setCardsReady(true));
    return () => {
      active = false;
    };
  }, []);
  const current = room.round?.currentSeatId;
  useEffect(() => {
    if (!tv) return;
    const receive = (event: Event) =>
      setRemoteFocus((event as CustomEvent<Cell | null>).detail ?? null);
    addEventListener("sequence-tv-focus", receive);
    return () => removeEventListener("sequence-tv-focus", receive);
  }, [tv]);
  useEffect(() => {
    if (tv) return;
    sendTvFocus(view === "controller" ? focused : null);
  }, [focused, tv, view]);
  useEffect(() => {
    if (!selected?.cells.length) {
      setFocused(null);
      return;
    }
    setFocused(selected.cells[0]);
  }, [selected?.cardId]);
  useEffect(() => {
    const stage = boardStage.current;
    const lastMove = room.round?.lastMove;
    if (
      !stage ||
      !lastMove ||
      !matchMedia("(max-width:700px)").matches ||
      !room.round?.sequences.some(
        (sequence) => sequence.createdTurn === lastMove.turn,
      )
    )
      return;
    const display = toDisplay(lastMove.cell);
    const cell = stage.querySelector<HTMLElement>(
      `.board-cell:nth-child(${display.row * 10 + display.col + 1})`,
    );
    if (cell)
      stage.scrollTo({
        left: Math.max(
          0,
          cell.offsetLeft + cell.offsetWidth / 2 - stage.clientWidth / 2,
        ),
        behavior: "smooth",
      });
  }, [room.round?.lastMove, room.round?.sequences]);
  const play = async (cardId: string, cell: Cell) => {
    if (view === "controller") sendTvFocus(null);
    setSelected(null);
    setFocused(null);
    await command({ type: "play", cardId, row: cell.row, col: cell.col });
  };
  const moveFocus = (direction: BoardDirection) => {
    if (!selected?.cells.length) return;
    const next = nextControllerCell(selected.cells, focused, direction);
    if (next) setFocused(next);
  };
  if (!cardsReady) return <Spinner />;
  const displayTurnOrder =
    !tv && room.yourSeatId
      ? [
          room.yourSeatId,
          ...room.round!.turnOrder.filter((id) => id !== room.yourSeatId),
        ]
      : room.round!.turnOrder;
  const playerStrip = (
    <div className="player-strip">
      {displayTurnOrder.map((id) => {
        const seat = room.seats.find((s) => s.id === id)!;
        const team = room.teams.find((t) => t.id === seat.teamId)!;
        const member = room.members.find((m) => m.seatId === id);
        const made =
          room.round!.lastMove?.seatId === id &&
          room.round!.sequences.some(
            (s) => s.createdTurn === room.round!.lastMove?.turn,
          );
        const status =
          room.phase === "finished"
            ? undefined
            : id === current
              ? undefined
              : made
                ? "Sequence made"
                : room.round!.lastMove?.seatId === id
                  ? room.round!.lastMove?.kind === "remove"
                    ? "Removed a chip"
                    : "Last move"
                  : undefined;
        return (
          <PlayerRow
            key={id}
            seat={seat}
            team={team}
            you={!tv && (member?.isYou ?? false)}
            self={member?.isYou ?? false}
            host={seat.id === room.hostSeatId}
            current={id === current}
            status={status}
            onAvatar={!tv && member?.isYou ? onAvatar : undefined}
            onName={
              !tv && member?.isYou
                ? (name) =>
                    command({ type: "profile", name, avatarId: seat.avatarId })
                : undefined
            }
          />
        );
      })}
      <div
        className="mobile-player-stack"
        aria-hidden="true"
        style={{ width: 30 + Math.max(0, displayTurnOrder.length - 1) * 20 }}
      >
        {displayTurnOrder.map((id, index) => {
          const seat = room.seats.find((s) => s.id === id)!;
          const team = room.teams.find((t) => t.id === seat.teamId)!;
          return (
            <span
              key={id}
              className={id === current ? "current" : ""}
              style={
                {
                  left: index * 20,
                  "--team": team.color ? COLOR_HEX[team.color] : "#777",
                } as React.CSSProperties
              }
            >
              <img src={avatar(seat.avatarId)} alt="" />
            </span>
          );
        })}
      </div>
    </div>
  );
  const tvCounts = room.teams.map(
    (team) =>
      room.round!.sequences.filter((sequence) => sequence.teamId === team.id)
        .length,
  );
  const menuButton = (
    <button
      className="menu-btn"
      aria-expanded={menuOpen}
      aria-controls="game-menu"
      onClick={onMenu}
    >
      <MenuIcon size={16} />
      Menu
    </button>
  );
  const tvActions = (
    <div className="tv-head-actions">
      {menuButton}
      <div className="tv-score">
        <i
          style={{
            background: room.teams[0]?.color
              ? COLOR_HEX[room.teams[0].color!]
              : "#777",
          }}
        />
        <strong>{tvCounts[0] ?? 0}</strong>
        <b>—</b>
        <strong>{tvCounts[1] ?? 0}</strong>
        <i
          style={{
            background: room.teams[1]?.color
              ? COLOR_HEX[room.teams[1].color!]
              : "#777",
          }}
        />
      </div>
    </div>
  );
  const latestSequence =
    room.round!.lastMove &&
    room.round!.sequences.find(
      (sequence) => sequence.createdTurn === room.round!.lastMove!.turn,
    );
  const latestTeam = room.teams.find(
    (team) => team.id === latestSequence?.teamId,
  );
  const currentSeat = room.seats.find((seat) => seat.id === current);
  const tvStatus = latestSequence ? (
    <>
      <Sparkles />
      <span>
        {latestTeam?.color
          ? `${latestTeam.color[0].toUpperCase()}${latestTeam.color.slice(1)}`
          : "A team"}{" "}
        made a sequence ·{" "}
        {room.teams.length === 2 ? "one more to win" : "sequence complete"}
      </span>
    </>
  ) : currentSeat?.computer ? (
    <>
      <Bot />
      <span>Computer is thinking…</span>
    </>
  ) : (
    <>
      <Hourglass />
      <span>{currentSeat?.name ?? "Another player"} is picking a card…</span>
    </>
  );
  if (view === "controller" && !tv)
    return (
      <main className="game-shell controller-shell">
        <header className="game-top">
          <Logo />
          {playerStrip}
          <button
            className="menu-btn"
            aria-expanded={menuOpen}
            aria-controls="game-menu"
            onClick={onMenu}
          >
            <MenuIcon size={16} />
            Menu
          </button>
        </header>
        <Controller
          room={room}
          selected={selected}
          onSelect={setSelected}
          focused={focused}
          onMove={moveFocus}
          onConfirm={() =>
            selected && focused && void play(selected.cardId, focused)
          }
        />
      </main>
    );
  return (
    <main className={`game-shell ${tv ? "tv-game" : ""}`}>
      <header className="game-top">
        <Logo />
        {playerStrip}
        {tv ? tvActions : menuButton}
      </header>
      <div className="board-stage" ref={boardStage}>
        <Board
          room={room}
          selected={tv ? null : selected}
          focused={tv ? remoteFocus : null}
          onPlay={play}
        />
      </div>
      {tv ? (
        <footer className={`tv-status ${tvStatus ? "has-status" : ""}`}>
          {tvStatus}
        </footer>
      ) : (
        <Hand room={room} selected={selected} onSelect={setSelected} />
      )}
    </main>
  );
}

export function Menu({
  sound,
  setSound,
  animations,
  setAnimations,
  onClose,
  onNew,
  onRules,
  onLeave,
  onView,
  onCopyTv,
  canNew,
  tv,
  controllerAvailable,
  view,
}: {
  sound: boolean;
  setSound: (v: boolean) => void;
  animations: boolean;
  setAnimations: (v: boolean) => void;
  onClose: () => void;
  onNew: () => void;
  onRules: () => void;
  onLeave: () => void;
  onView: (view: "board" | "controller") => void;
  onCopyTv: () => void;
  canNew: boolean;
  tv: boolean;
  controllerAvailable: boolean;
  view: "board" | "controller";
}) {
  const [fullscreen, setFullscreen] = useState(
    Boolean(document.fullscreenElement),
  );
  useEffect(() => {
    const changed = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.fullscreenElement)
          void document.exitFullscreen().catch(() => undefined);
        onClose();
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [onClose]);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast.error("Fullscreen is unavailable in this browser.", {
        id: "sequence-notice",
      });
    }
  };
  return (
    <div
      className={`scrim menu-scrim ${tv ? "tv-menu-scrim" : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        id="game-menu"
        className="menu-popover"
        role="dialog"
        aria-modal="true"
        aria-label="Game menu"
      >
        {!tv && canNew && (
          <button className="menu-row" onClick={onNew}>
            <Plus />
            <span>New game</span>
          </button>
        )}
        <button className="menu-row" onClick={onRules}>
          <CircleHelp />
          <span>How to play</span>
          <ChevronRight className="menu-tail" />
        </button>
        <i className="menu-divider" />
        <button
          className="menu-row"
          role="switch"
          aria-checked={sound}
          onClick={() => setSound(!sound)}
        >
          <Volume2 />
          <span>Sound</span>
          <i className={`switch ${sound ? "on" : ""}`} />
        </button>
        <button
          className="menu-row"
          role="switch"
          aria-checked={animations}
          onClick={() => setAnimations(!animations)}
        >
          <Sparkles />
          <span>Animations</span>
          <i className={`switch ${animations ? "on" : ""}`} />
        </button>
        <button
          className="menu-row"
          role="switch"
          aria-checked={fullscreen}
          onClick={toggleFullscreen}
        >
          {fullscreen ? <Minimize2 /> : <Maximize2 />}
          <span>{fullscreen ? "Exit full screen" : "Full screen"}</span>
          <i className={`switch ${fullscreen ? "on" : ""}`} />
        </button>
        {!tv && controllerAvailable && (
          <button
            className="menu-row"
            onClick={() => onView(view === "board" ? "controller" : "board")}
          >
            <Gamepad2 />
            <span>Controller View</span>
            <i className={`switch ${view === "controller" ? "on" : ""}`} />
          </button>
        )}
        {!tv && (
          <button className="menu-row" onClick={onCopyTv}>
            <Tv />
            <span>Copy TV Link</span>
          </button>
        )}
        <i className="menu-divider" />
        {tv ? (
          <button className="menu-row danger" onClick={() => window.close()}>
            <X />
            <span>Close TV view</span>
          </button>
        ) : (
          <button className="menu-row danger" onClick={onLeave}>
            <LogOut />
            <span>Leave game</span>
          </button>
        )}
      </section>
    </div>
  );
}

function RulesDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div
      className="scrim"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="dialog rules-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
      >
        <button className="close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <p className="eyebrow">HOW TO PLAY</p>
        <h2 id="rules-title">Make a sequence of five.</h2>
        <p>
          Play a card from your hand, then place your team chip on either
          matching space. Complete five connected chips horizontally,
          vertically, or diagonally.
        </p>
        <div className="rule-list">
          <p>
            <b>Two-eyed Jacks</b>
            <span>Place a chip on any open space.</span>
          </p>
          <p>
            <b>One-eyed Jacks</b>
            <span>Remove one unprotected opponent chip.</span>
          </p>
          <p>
            <b>Free corners</b>
            <span>Count for every team’s sequence.</span>
          </p>
        </div>
        <p className="rules-note">
          Two teams need two sequences. Three teams need one.
        </p>
        <a href="/sequence/credits">Credits &amp; licenses</a>
      </section>
    </div>
  );
}

export function ConfirmDialog({
  kind,
  pending,
  onCancel,
  onConfirm,
}: {
  kind: "new" | "leave";
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isNew = kind === "new";
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [onCancel, pending]);
  return (
    <div className="scrim">
      <section
        className={`dialog confirm-dialog ${isNew ? "new-confirmation" : "leave-confirmation"}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <span className="confirm-badge">
          {isNew ? <RotateCcw /> : <LogOut />}
        </span>
        <h2 id="confirm-title">
          {isNew ? "Start a new game?" : "Leave this game?"}
        </h2>
        {isNew ? (
          <p className="new-confirm-copy">
            Everyone returns to the lobby with the same players, teams, colors,
            and computers. This match will end.
          </p>
        ) : (
          <p>
            You will return to Enter game code and cannot rejoin this game after
            leaving.
          </p>
        )}
        <div className="confirm-actions">
          <button
            disabled={pending}
            className={isNew ? "new-confirm" : "danger-confirm"}
            onClick={onConfirm}
          >
            {isNew ? <RotateCcw /> : <LogOut />}
            {pending ? "Working…" : isNew ? "New game" : "Leave game"}
          </button>
          <button disabled={pending} onClick={onCancel}>
            {isNew ? "Keep playing" : "Stay"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SequenceReveal({
  room,
  winnerId,
  won,
}: {
  room: RoomSnapshot;
  winnerId: string;
  won: boolean;
}) {
  const sequences = room.round!.sequences.filter((s) => s.teamId === winnerId);
  const team = room.teams.find((t) => t.id === winnerId);
  const color = team?.color ? COLOR_HEX[team.color] : "#2F6BFF";
  const highlight = won ? "#FFC53D" : color;
  const unique = new Map(
    sequences.flatMap((seq) => seq.cells).map((cell) => [cellKey(cell), cell]),
  );
  const tag =
    room.teams.length === 3
      ? `${team?.color?.toUpperCase()} · ONE SEQUENCE`
      : won
        ? "TWO SEQUENCES"
        : `${team?.color?.toUpperCase()} · TWO SEQUENCES`;
  const point = (cell: Cell) => {
    const display = toDisplay(cell);
    return { x: 56.8 + 98.41 * display.col, y: 82.55 + 70.57 * display.row };
  };
  const endpoints = sequences.map((sequence) => ({
    first: point(sequence.cells[0]),
    last: point(sequence.cells[sequence.cells.length - 1]),
  }));
  return (
    <div
      className="sequence-reveal"
      aria-hidden="true"
      style={
        {
          "--highlight": highlight,
          "--highlight-text": won ? "#1D1F3A" : "#FFFFFF",
          "--winner": color,
        } as React.CSSProperties
      }
    >
      <svg viewBox="0 0 998 800" preserveAspectRatio="none">
        <defs>
          {endpoints.map(({ first, last }, index) => (
            <mask
              key={index}
              id={`sequence-outline-${index}`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="998"
              height="800"
            >
              <rect width="998" height="800" fill="black" />
              <line
                x1={first.x}
                y1={first.y}
                x2={last.x}
                y2={last.y}
                stroke="white"
                strokeWidth="65"
                strokeLinecap="round"
              />
              <line
                x1={first.x}
                y1={first.y}
                x2={last.x}
                y2={last.y}
                stroke="black"
                strokeWidth="59"
                strokeLinecap="round"
              />
            </mask>
          ))}
        </defs>
        {endpoints.map(({ first, last }, index) => (
          <g key={sequences[index].id}>
            <line
              className="winning-edge"
              mask={`url(#sequence-outline-${index})`}
              x1={first.x}
              y1={first.y}
              x2={last.x}
              y2={last.y}
            />
            <line
              className="winning-band"
              x1={first.x}
              y1={first.y}
              x2={last.x}
              y2={last.y}
            />
          </g>
        ))}
        {[...unique].map(([key, cell]) => {
          const p = point(cell);
          return <circle key={key} cx={p.x} cy={p.y} r="16" />;
        })}
      </svg>
      <span className="sequence-tag">
        <Sparkles size={13} />
        {tag}
      </span>
    </div>
  );
}
function Result({
  room,
  command,
  onNew,
  animations,
  tv = false,
}: {
  room: RoomSnapshot;
  command: (x: Record<string, unknown>) => Promise<void>;
  onNew: () => void;
  animations: boolean;
  tv?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const winner = room.teams.find(
    (t) => t.id === room.round?.result?.winnerTeamId,
  );
  const counts = room.teams.map(
    (team) =>
      room.round?.sequences.filter((s) => s.teamId === team.id).length ?? 0,
  );
  const mine = room.seats.find((s) => s.id === room.yourSeatId)?.teamId;
  const mineTeam = room.teams.find((t) => t.id === mine);
  const won = winner?.id === mine;
  const winningSeats = room.seats.filter(
    (seat) => seat.teamId === winner?.id && !seat.computer,
  );
  const teammate = winningSeats.find((seat) => seat.id !== room.yourSeatId);
  const winnerName =
    winningSeats[0]?.name ??
    room.seats.find((seat) => seat.teamId === winner?.id)?.name ??
    "The other team";
  const hostName =
    room.seats.find((seat) => seat.id === room.hostSeatId)?.name ?? "The host";
  const otherTeam = room.teams.find((team) => team.id !== winner?.id);
  const resultSummary = won
    ? `${teammate ? `You & ${teammate.name}` : "You"} closed out two sequences to ${otherTeam?.color ? `${otherTeam.color[0].toUpperCase()}${otherTeam.color.slice(1)}` : "the other team"}'s none.`
    : `${winnerName} closed out two sequences before you could answer.`;
  useEffect(() => {
    if (!winner || !animations) return;
    const color = winner.color ? COLOR_HEX[winner.color] : "#2F6BFF";
    const options = {
      colors: [color, "#FFC53D", "#FFFFFF"],
      disableForReducedMotion: true,
      useWorker: true,
      zIndex: 30,
      ticks: 240,
    };
    const side = (x: number, angle: number) =>
      void confetti({
        ...options,
        particleCount: 90,
        angle,
        spread: 58,
        startVelocity: 58,
        gravity: 0.82,
        scalar: 1.05,
        origin: { x, y: 0.72 },
      });
    side(0.02, 60);
    side(0.98, 120);
    const timers = [
      setTimeout(
        () =>
          void confetti({
            ...options,
            particleCount: 125,
            spread: 112,
            startVelocity: 48,
            gravity: 0.78,
            scalar: 1.1,
            origin: { x: 0.5, y: 0.58 },
          }),
        240,
      ),
      setTimeout(() => {
        side(0.12, 66);
        side(0.88, 114);
      }, 680),
    ];
    return () => timers.forEach(clearTimeout);
  }, [winner?.id, room.round?.id, animations]);
  if (dismissed && !tv) return null;
  return (
    <div className={`result-scrim ${animations ? "" : "no-motion"}`}>
      {winner && (
        <SequenceReveal room={room} winnerId={winner.id} won={tv || won} />
      )}
      <section
        className={`result-bar ${won ? "result-won" : "result-lost"}`}
        style={
          {
            "--team": mineTeam?.color ? COLOR_HEX[mineTeam.color] : "#2F6BFF",
            "--winner": winner?.color ? COLOR_HEX[winner.color] : "#2F6BFF",
          } as React.CSSProperties
        }
      >
        {!tv && (
          <button
            className="result-close"
            onClick={() => setDismissed(true)}
            aria-label="Close result"
          >
            <X />
          </button>
        )}
        <div className="result-content">
          {!tv && (
            <span className="result-trophy">
              <Trophy />
            </span>
          )}
          <div className="result-copy">
            <p
              className="eyebrow"
              style={{
                color: won
                  ? "#FFC53D"
                  : winner?.color
                    ? COLOR_HEX[winner.color]
                    : undefined,
              }}
            >
              GAME OVER ·{" "}
              {winner ? `${winner.color?.toUpperCase()} WINS` : "DRAW"}
            </p>
            <h1>
              {tv
                ? winner
                  ? `${winner.color?.[0].toUpperCase()}${winner.color?.slice(1)} wins!`
                  : "Draw"
                : winner
                  ? won
                    ? "You win!"
                    : "You lose"
                  : "Draw"}
            </h1>
          </div>
          {!tv && <p className="result-summary">{resultSummary}</p>}
          <div className="result-actions">
            {room.teams.length === 2 ? (
              <div className="result-score result-score-two">
                <i
                  style={{
                    background: room.teams[0]?.color
                      ? COLOR_HEX[room.teams[0].color!]
                      : "#777",
                  }}
                />
                <span>
                  {counts[0] ?? 0}&nbsp; — &nbsp;{counts[1] ?? 0}
                </span>
                <i
                  style={{
                    background: room.teams[1]?.color
                      ? COLOR_HEX[room.teams[1].color!]
                      : "#777",
                  }}
                />
              </div>
            ) : (
              <div className="result-score result-score-three">
                {room.teams.map((team, index) => (
                  <span className="score-team" key={team.id}>
                    <i
                      style={{
                        background: team.color ? COLOR_HEX[team.color] : "#777",
                      }}
                    />
                    <b>{counts[index] ?? 0}</b>
                  </span>
                ))}
              </div>
            )}
            <div>
              {!tv && (
                <>
                  <button className="new-game-btn" onClick={onNew}>
                    <Plus className="mobile-result-icon" size={18} />
                    <Users className="desktop-result-icon" size={18} />
                    New game
                  </button>
                  <button
                    className="replay-btn"
                    onClick={() => command({ type: "replay" })}
                  >
                    <RotateCcw size={18} />
                    <span className="desktop-result-label">Replay</span>
                    <span className="mobile-result-label">Play again</span>
                  </button>
                </>
              )}
              {tv && (
                <small className="host-wait">
                  <Smartphone />
                  {hostName} can start a new game or replay from their
                  controller
                </small>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
export function JoinDialog({
  name,
  onClose,
  onJoin,
  title = "SEQUENCE",
  lookupGame = api.lookup,
}: {
  name: string;
  onClose: () => void;
  onJoin: (code: string, name: string) => Promise<void>;
  title?: string;
  lookupGame?: (code: string) => Promise<RoomLookup>;
}) {
  const params = new URLSearchParams(location.search);
  const initial = params.get("code")?.slice(0, 2) ?? "";
  const [code, setCode] = useState(initial);
  const [codeFocused, setCodeFocused] = useState(true);
  const [draftName, setDraftName] = useState(name);
  const [lookup, setLookup] = useState<RoomLookup | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (code.length !== 2) {
      setLookup(null);
      return;
    }
    lookupGame(code)
      .then((result) => active && setLookup(result))
      .catch(() => active && setLookup({ found: false }));
    return () => {
      active = false;
    };
  }, [code, lookupGame]);
  const submit = () => {
    const clean = draftName.trim().replace(/\s+/g, " ");
    if (!clean) {
      setError("Enter your name");
      return;
    }
    onJoin(code, clean).catch((e) => setError(e.message));
  };
  return (
    <div className="scrim join-screen">
      <header className="join-top">
        <GameLogo title={title} />
        <button className="lobby-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </header>
      <i className="join-chip chip-a">
        <span />
      </i>
      <i className="join-chip chip-b">
        <span />
      </i>
      <i className="join-chip chip-c">
        <span />
      </i>
      <i className="join-chip chip-d">
        <span />
      </i>
      <section
        className="join-page"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
      >
        <p className="eyebrow">JOIN A GAME</p>
        <i className="join-spacer" />
        <h2 id="join-title">Enter the game code</h2>
        <div
          className="join-code-cards"
          onClick={() =>
            document
              .querySelector<HTMLInputElement>(".join-code-input")
              ?.focus()
          }
        >
          <div
            className={`join-code-card first ${codeFocused && code.length === 0 && !lookup?.found ? "focused" : ""}`}
          >
            {code[0] ? (
              <>
                <small>
                  <b>{code[0]}</b>
                  <Heart />
                </small>
                <strong>{code[0]}</strong>
                <Heart className="card-suit-bottom" />
              </>
            ) : codeFocused && code.length === 0 ? (
              <i className="code-caret" />
            ) : null}
          </div>
          <div
            className={`join-code-card second ${codeFocused && code.length > 0 && !lookup?.found ? "focused" : ""}`}
          >
            {code[1] ? (
              <>
                <small>
                  <b>{code[1]}</b>
                  <Spade />
                </small>
                <strong>{code[1]}</strong>
                <Spade className="card-suit-bottom" />
              </>
            ) : codeFocused && code.length > 0 ? (
              <i className="code-caret" />
            ) : null}
          </div>
          <input
            className="join-code-input"
            autoFocus
            inputMode="numeric"
            maxLength={2}
            value={code}
            onFocus={() => setCodeFocused(true)}
            onBlur={() => setCodeFocused(false)}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ""));
              setError("");
            }}
            aria-label="Game code"
          />
        </div>
        {lookup?.found && (
          <div className="join-status found">
            <span className="join-faces">
              {Array.from(
                { length: Math.min(lookup.count ?? 0, 3) },
                (_, index) => (
                  <i
                    key={index}
                    style={
                      {
                        "--avatar-team":
                          COLOR_HEX[COLORS[index % COLORS.length]],
                      } as React.CSSProperties
                    }
                  >
                    <img
                      src={avatar(
                        `avataaars-${String(index + 1).padStart(2, "0")}`,
                      )}
                      alt=""
                    />
                  </i>
                ),
              )}
            </span>
            <span className="join-found-copy">
              <Check size={16} />
              <span>{`Game found · ${lookup.count ?? 0} ${(lookup.count ?? 0) === 1 ? "player" : "players"} waiting`}</span>
            </span>
          </div>
        )}
        <i className="join-status-spacer" />
        <div className="join-actions">
          <label>
            <input
              value={draftName}
              maxLength={24}
              onChange={(e) => setDraftName(e.target.value)}
              aria-label="Your name"
            />
          </label>
          <button
            disabled={code.length !== 2 || !lookup?.found || !lookup.joinable}
            onClick={submit}
          >
            <span className="join-action-desktop">
              Join Game
              <ArrowRight size={20} />
            </span>
            <span className="join-action-mobile">
              <Play size={20} />
              Join Game
            </span>
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  );
}

export function App() {
  const isTv =
    location.pathname === "/sequence/tv" ||
    location.pathname.startsWith("/sequence/tv/");
  const tvRoomId = isTv
    ? (location.pathname.split("/").filter(Boolean)[2] ?? "")
    : null;
  const startsInJoin = location.pathname.includes("/join");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [join, setJoin] = useState(startsInJoin);
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const [dialog, setDialog] = useState<"rules" | "new" | "leave" | null>(null);
  const [pending, setPending] = useState(false);
  const [left, setLeft] = useState(startsInJoin);
  const [sound, setSound] = useState(cues.enabled);
  const [animations, setAnimations] = useState(
    () => localStorage.getItem("sequence-animations") !== "off",
  );
  const [view, setView] = useState<"board" | "controller">("board");
  const previous = useRef<RoomSnapshot | null>(null);
  const hadTv = useRef(false);
  const profile = useRef({ name: "Player", avatarId: "avataaars-01" });
  const showToast = (message: string) =>
    message === "Invite copied"
      ? toast.success(message, { id: "sequence-notice" })
      : toast.error(message, { id: "sequence-notice" });
  useEffect(() => {
    let cancelled = false;
    let off = () => {};
    (async () => {
      try {
        const session = await api.session();
        if (cancelled) return;
        if (isTv) {
          if (!tvRoomId) throw new Error("No active game for this TV view");
          setRoom(await api.tvSession(tvRoomId));
        } else if (startsInJoin && !session.room) {
          setLeft(true);
          setJoin(true);
        } else
          setRoom(
            session.room ??
              (await api.create(
                `Player ${Math.floor(Math.random() * 90 + 10)}`,
                "avataaars-01",
              )),
          );
        if (cancelled) return;
        off = connect(
          (next) => {
            if (!cancelled) setRoom(next);
          },
          isTv ? "tv" : "player",
          tvRoomId ?? undefined,
          () => {
            if (cancelled || isTv) return;
            setRoom(null);
            setLeft(true);
            setJoin(true);
            history.replaceState({}, "", "/sequence/join");
          },
        );
      } catch (e) {
        if (cancelled) return;
        const message =
          e instanceof Error ? e.message : "Couldn’t open the game";
        if (/room not found|no active game/i.test(message)) {
          location.replace("/");
          return;
        }
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      off();
    };
  }, [isTv, startsInJoin, tvRoomId]);
  useEffect(() => {
    for (let index = 1; index <= 24; index += 1) {
      const image = new Image();
      image.src = avatar(`avataaars-${String(index).padStart(2, "0")}`);
    }
  }, []);
  useEffect(() => {
    if (room?.phase !== "lobby") toast.dismiss("sequence-notice");
  }, [room?.phase]);
  useEffect(() => {
    localStorage.setItem("sequence-animations", animations ? "on" : "off");
  }, [animations]);
  useEffect(() => {
    const exitFullscreen = (event: KeyboardEvent) => {
      if (event.key === "Escape" && document.fullscreenElement)
        void document.exitFullscreen().catch(() => undefined);
    };
    addEventListener("keydown", exitFullscreen);
    return () => removeEventListener("keydown", exitFullscreen);
  }, []);
  useEffect(() => {
    if (isTv) return;
    const connected = Boolean(room?.tvConnected);
    if (connected && !hadTv.current) {
      const saved = room
        ? localStorage.getItem(`sequence-view:${room.id}`)
        : null;
      setView(
        saved === "board" || saved === "controller" ? saved : "controller",
      );
    }
    if (!connected) setView("board");
    hadTv.current = connected;
  }, [isTv, room?.id, room?.tvConnected]);
  useEffect(() => {
    if (!sound || cues.context) return;
    const unlock = () => void cues.unlock().then(setSound);
    addEventListener("pointerdown", unlock, { once: true, capture: true });
    addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      removeEventListener("pointerdown", unlock, { capture: true });
      removeEventListener("keydown", unlock, { capture: true });
    };
  }, [sound]);
  useEffect(() => {
    const before = previous.current;
    previous.current = room;
    if (!before?.round || !room?.round || before.round.id !== room.round.id)
      return;
    if (room.round.result && !before.round.result) {
      const winner = room.round.result.winnerTeamId;
      const mine = room.seats.find((s) => s.id === room.yourSeatId)?.teamId;
      cues.play(winner ? (winner === mine ? "win" : "loss") : "draw");
      return;
    }
    if (room.round.lastMove?.turn !== before.round.lastMove?.turn) {
      const made = room.round.sequences.some(
        (s) => s.createdTurn === room.round!.lastMove?.turn,
      );
      cues.play(
        made
          ? "sequence"
          : room.round.lastMove?.kind === "remove"
            ? "remove"
            : "place",
      );
      if (room.round.currentSeatId === room.yourSeatId)
        setTimeout(() => cues.play("your-turn"), made ? 305 : 110);
    }
  }, [room]);
  const command = async (x: Record<string, unknown>) => {
    if (!room) return;
    try {
      setError("");
      setRoom(await api.command(room.id, x as never));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };
  const me = useMemo(
    () => room?.seats.find((s) => s.id === room.yourSeatId),
    [room],
  );
  useEffect(() => {
    if (me) profile.current = { name: me.name, avatarId: me.avatarId };
  }, [me]);
  const chooseAvatar = (id: string) => {
    if (me) command({ type: "profile", name: me.name, avatarId: id });
    setPicker(false);
  };
  const createGame = async () => {
    setPending(true);
    try {
      const next = await api.createNew(
        profile.current.name,
        profile.current.avatarId,
      );
      setRoom(next);
      setLeft(false);
      setJoin(false);
      setDialog(null);
      setMenu(false);
      history.replaceState({}, "", "/sequence/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create a new game");
    } finally {
      setPending(false);
    }
  };
  const reconfigureGame = async () => {
    if (!room) return;
    setPending(true);
    try {
      const next = await api.command(room.id, { type: "newGame" });
      setRoom(next);
      setDialog(null);
      setMenu(false);
      history.replaceState({}, "", `/sequence/room/${next.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t start a new game");
    } finally {
      setPending(false);
    }
  };
  const leaveGame = async () => {
    if (!room) return;
    setPending(true);
    try {
      await api.leave(room.id);
      setRoom(null);
      setLeft(true);
      setJoin(true);
      setDialog(null);
      setMenu(false);
      history.replaceState({}, "", "/sequence/join");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t leave the game");
    } finally {
      setPending(false);
    }
  };
  const openTv = async () => {
    if (!room || room.phase !== "lobby") return;
    try {
      await api.enterTv(room.id);
      location.assign(`/sequence/tv/${room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t open TV View");
    }
  };
  const copyTv = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/sequence/tv/${room.id}`,
      );
      toast.success("TV link copied", { id: "sequence-notice" });
      setMenu(false);
    } catch {
      toast.error("Couldn’t copy the TV link", { id: "sequence-notice" });
    }
  };
  const startGame = () => {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    void command({ type: "start" });
  };
  if (
    location.pathname === "/sequence/credits" ||
    location.pathname === "/sequence/credits/"
  )
    return <Credits />;
  if (left)
    return (
      <FixedStage>
        <div className="join-underlay" />
        {join && (
          <JoinDialog
            name={profile.current.name}
            onClose={createGame}
            onJoin={async (code, name) => {
              const joined = await api.join(
                code,
                name,
                profile.current.avatarId,
              );
              setRoom(joined);
              setLeft(false);
              setJoin(false);
              history.replaceState({}, "", `/sequence/room/${joined.id}`);
            }}
          />
        )}
        {error && (
          <div className="error-toast" role="alert">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
      </FixedStage>
    );
  if (loading)
    return (
      <FixedStage>
        <Spinner />
      </FixedStage>
    );
  if (!room)
    return (
      <FixedStage>
        <div className="fatal">
          <Logo />
          <h1>Couldn’t open the game</h1>
          <p>{error}</p>
          <button onClick={() => location.reload()}>Try again</button>
        </div>
      </FixedStage>
    );
  const toggleSound = async (value: boolean) => {
    const accepted = await cues.setEnabled(value);
    setSound(accepted);
    if (value && !accepted) showToast("Sound is unavailable in this browser.");
  };
  const chooseView = (next: "board" | "controller") => {
    setView(next);
    localStorage.setItem(`sequence-view:${room.id}`, next);
    setMenu(false);
  };
  return (
    <FixedStage>
      <div className={`app ${animations ? "" : "no-motion"}`}>
        {room.phase === "lobby" ? (
          <Lobby
            room={room}
            command={command}
            onClose={leaveGame}
            onAvatar={() => setPicker(true)}
            onToast={showToast}
            onTv={() => void openTv()}
            onStart={startGame}
            tv={isTv}
          />
        ) : (
          <Game
            room={room}
            command={command}
            menuOpen={menu}
            onMenu={() => setMenu((value) => !value)}
            onAvatar={() => setPicker(true)}
            view={isTv ? "board" : view}
            tv={isTv}
          />
        )}
      </div>
      {room.phase === "finished" && (
        <Result
          room={room}
          command={command}
          onNew={() => setDialog("new")}
          animations={animations}
          tv={isTv}
        />
      )}{" "}
      {menu && (
        <Menu
          sound={sound}
          setSound={toggleSound}
          animations={animations}
          setAnimations={setAnimations}
          canNew={room.isHost}
          tv={isTv}
          controllerAvailable={Boolean(room.tvConnected)}
          view={view}
          onView={chooseView}
          onCopyTv={() => void copyTv()}
          onClose={() => setMenu(false)}
          onNew={() => {
            setMenu(false);
            setDialog("new");
          }}
          onRules={() => {
            setMenu(false);
            setDialog("rules");
          }}
          onLeave={() => {
            setMenu(false);
            setDialog("leave");
          }}
        />
      )}{" "}
      {!isTv && join && (
        <JoinDialog
          name={me?.name ?? "Player"}
          onClose={() => {
            setJoin(false);
            history.replaceState({}, "", `/sequence/room/${room.id}`);
          }}
          onJoin={async (code, name) => {
            const joined = await api.join(
              code,
              name,
              me?.avatarId ?? "avataaars-01",
            );
            setRoom(joined);
            setJoin(false);
            history.replaceState({}, "", `/sequence/room/${joined.id}`);
          }}
        />
      )}
      {!isTv && picker && me && (
        <AvatarPicker
          current={me.avatarId}
          onSelect={chooseAvatar}
          onClose={() => setPicker(false)}
        />
      )}{" "}
      {dialog === "rules" && <RulesDialog onClose={() => setDialog(null)} />}{" "}
      {!isTv && (dialog === "new" || dialog === "leave") && (
        <ConfirmDialog
          kind={dialog}
          pending={pending}
          onCancel={() => setDialog(null)}
          onConfirm={dialog === "new" ? reconfigureGame : leaveGame}
        />
      )}{" "}
      {error && (
        <div className="error-toast" role="alert">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}
    </FixedStage>
  );
}
