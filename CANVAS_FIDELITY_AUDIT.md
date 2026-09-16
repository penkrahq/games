# Canvas fidelity audit

Sources:

- Sequence Canvas document `286e0c58-8a0e-42c9-8d79-bc3d609ad921`
- Connect 4 Canvas document `04f0893c-c4fb-4ecc-9eae-056d17566897`
- Penkra Games landing Canvas document `318d2bc2-7292-49ed-ae8f-4807a2ae7534`

Every canonical frame below was independently rendered on localhost at its target viewport and placed beside the exported Canvas frame. The comparison covered viewport bounds, chrome, panel and modal geometry, spacing, alignment, radii, borders, typography hierarchy, colors, state indicators, board aspect ratio, overflow, and the associated interaction. Live room codes, shuffled cards, chip positions, generated player names, and animation frames are intentionally dynamic and are not treated as visual-layout mismatches.

`Approved divergence` means an older Canvas frame conflicts with a later explicit product decision from the user. These are listed rather than silently forcing the stale frame back into the implementation.

## Desktop

| Canvas node | Canonical frame | Status | Verification note |
| --- | --- | --- | --- |
| `m3-join-route-copy-1-copy-1` | D01a · Join · First digit focused | matched | First card owns focus outline and stacking. |
| `m3-join-route-copy-1` | D01 · Join · Enter code | matched | Empty-card geometry, decoration, inputs, and actions match. |
| `m3-join-route` | D02 · Join · Game found | matched | Found state, face stack, code cards, and CTA match. |
| `lobby-mp` | D03 · Lobby · Multiplayer | matched | QR/code row, panels, center plus, footer, and viewport placement match. |
| `lobby-mp-copy-4` | D03a · Lobby · No color selected | approved divergence | Later approved screenshots require the `No color selected` player subline. |
| `lobby-solo` | D04 · Lobby · You vs computer | approved divergence | The implementation shows the requested computer opponent; the older Canvas fixture omits it despite naming the state. Layout matches. |
| `lobby-full` | D05 · Lobby · Full (12/12) | matched | Two-column roster reflow stays inside both panels without page overflow. |
| `route-a` | D06 · Game · Your turn | matched | Top bar, centered aspect-ratio board, equal vertical gaps, and hand bar match. |
| `route-a-copy-1` | D07 · Game · Card selected | matched | Selected card lifts and uses the raw team-color hairline; no placement hints render. |
| `route-a-copy-182` | D08 · Game · Opponent turn | matched | Turn state, hand dimming, and last-move treatment match. |
| `route-a-copy-2` | D09 · Game · Sequence made | matched | Current-turn state remains visible and completed five uses green cell outlines. |
| `route-a-copy-2-copy-417-copy-1` | D10 · Result · Win | matched | Bottom-bar result, reveal geometry, score, host controls, and overlay match. |
| `route-a-copy-2-copy-417-copy-1-copy-2` | D11 · Result · Lose | matched | Loss copy, score, guest wait state, and bottom-bar containment match. |
| `route-a-copy-3-copy-1` | D12 · Game · Menu | matched | Centered menu, rows, switches, scrim, and game visibility match. |
| `route-a-copy-3-copy-1-copy-1` | D13 · Leave game · Confirmation | matched | Centered destructive confirmation and controls match. |
| `route-a-copy-3-copy-1-copy-249` | D14 · New game · Confirmation | matched | Centered host confirmation and yellow action treatment match. |

## Phone

| Canvas node | Canonical frame | Status | Verification note |
| --- | --- | --- | --- |
| `ph-join-enter-copy-1` | P01a · Join · First digit focused | matched | Focus outline, overlap, and first-card z-order match. |
| `ph-join-enter` | P01b · Join · Second digit focused | matched | Second-card focus and mobile card geometry match. |
| `ph-join-found` | P02 · Join · Game found | matched | Found status, name input, and actions match. |
| `ph-lobby` | P03 · Lobby · Configurable | matched | QR/code, stacked flexible panels, center plus, and bottom actions match. |
| `ph-lobby-copy-50` | P03a · Lobby · No color selected | matched | Neutral team styling and bordered selector match. |
| `ph-lobby-full` | P04 · Lobby · Full | matched | Content height expands vertically while horizontal overflow remains absent. |
| `mob-p4` | P05 · Game · Your turn | matched | Edge-to-edge square board region, top bar, and bottom hand bar match. |
| `mob-p4-copy-1` | P06 · Game · Card selected | matched | Selected card lifts 8 px; board does not expose valid-target decoration. |
| `ph-opp` | P07 · Game · Opponent turn | matched | Compact turn stack and disabled hand state match. |
| `ph-seq` | P08 · Game · Sequence made | matched | Sequence state and current-player indicator coexist as designed. |
| `ph-win` | P09 · Result · Win | matched | Centered result sheet geometry and vertical placement match. |
| `ph-lose` | P10 · Result · Lose | matched | Centered result sheet, loss treatment, and action order match. |
| `ph-menu` | P11 · Game · Menu | matched | Centered menu and all mobile row dimensions match. |
| `mob-p4-copy-2` | P12 · Controller · Your turn | matched | Controller default state, tray, D-pad, and action match. |
| `mob-p4-copy-1-copy-169` | P13 · Controller · Card selected | matched | Selected tray card and active board-cell focus synchronization match. |
| `ph-opp-copy-339` | P14 · Controller · Waiting | matched | Disabled controller state and waiting copy match. |
| `mob-p4-copy-1-copy-169-copy-1` | P15 · Controller · D-pad pressed | matched | Pressed direction is indicated by arrow color only, matching the corrected design. |
| `ph-menu-copy-1` | P16 · Menu · TV connected | matched | Controller View row appears only with a connected TV. |
| `ph-menu-copy-2` | P17 · Leave game · Confirmation | matched | Mobile confirmation alignment and spacing match. |
| `ph-lobby-copy-48` | P18 · Lobby · Avatar selector | approved extension | The approved Avataaars treatment and four-column geometry are retained and the selector now exposes all 24 available avatars. |
| `ph-menu-copy-2-copy-1` | P19 · New game · Confirmation | matched | Mobile new-game sheet and copy match. |

## TV

| Canvas node | Canonical frame | Status | Verification note |
| --- | --- | --- | --- |
| `lobby-solo-copy-51` | T01 · Lobby · Solo | matched | Read-only controls, QR/code, center plus, and waiting pill match; live identity replaces placeholder duplicate `You`. |
| `lobby-mp-copy-1` | T02 · Lobby · Multiplayer | matched | Read-only multiplayer panel height and waiting state match; live identities replace fixture placeholders. |
| `route-a-copy-3` | T03 · Game · Active turn | matched | Origin player correctly reads `Your turn`; board, score, and TV footer match. |
| `route-a-copy-1-copy-208` | T04 · Controller target focused | matched | TV target focus is synchronized and uses the designed yellow hairline. |
| `route-a-copy-182-copy-412` | T05 · Game · Opponent turn | matched | `Their turn` consistency, board, and TV status bar match. |
| `route-a-copy-2-copy-616` | T06 · Game · Sequence made | matched | Sequence board treatment and TV status message match. |
| `route-a-copy-2-copy-417-copy-1-copy-823` | T07 · Result · Game over | matched | Result footer is 692 px wide with score and controller guidance aligned to Canvas. |
| `route-a-copy-3-copy-3` | T08 · TV · Menu | matched | Centered TV-only menu contents and omitted player-only actions match. |

## Quality and edge states

| Canvas node | Canonical frame | Status | Verification note |
| --- | --- | --- | --- |
| `lobby-3` | Q01 · Lobby · Three teams | approved divergence | Later approved interaction is Blue / Green / Red with the green center-plus team; the older export orders Blue / Red / Green. Geometry matches. |
| `route-a-copy-1-copy-1` | Q02 · Game · Long names | matched | Names remain within their fixed player pills and truncate without moving surrounding chrome. |
| `route-a-copy-182-copy-1` | Q03 · Solo · Computer turn | approved divergence | Actual two-player Sequence rules deal seven cards; the older visual fixture shows six. All surrounding layout matches. |
| `route-a-copy-182-copy-1-copy-89` | Q04 · TV · Computer turn | matched | Computer status and TV layout match; shuffled board content is dynamic. |
| `lobby-mp-copy-2` | Q05 · Lobby · Avatar selector | approved divergence | User later explicitly chose the Avataaars set; implementation shows all 12 approved final assets instead of the mixed placeholder set. Geometry matches. |
| `route-a-copy-4` | Q06 · Game · Wide 16:9 viewport | matched | Shell fills all four edges; board stays 998:800, remains centered, and keeps equal top/bottom breathing room. |

## Landing page

| Canvas node | Canonical frame | Status | Verification note |
| --- | --- | --- | --- |
| `a-home` | L01 · Desktop landing | matched | 1440 px render: navigation, 820 px hero, 56 px marquee, 979 px library, 531.8 px steps, and 93.1 px footer align to Canvas. Bebas Neue and Inter are local bundled fonts. |
| `am-home` | L02 · Mobile landing | matched | 390 px render: navigation, hero, actions, marquee, 2-column library, compact steps, and footer bounds align to Canvas with no horizontal overflow. |

## Connect 4

| Canonical frame | Status | Verification note |
| --- | --- | --- |
| Desktop lobby | matched | Shared lobby shell, QR/code row, fixed Red/Yellow teams, player rows, and TV/start actions match. |
| Desktop game · your turn | matched | 784 × 680 aspect-ratio board, top player strip, fixed bottom stock strip, holes, feet, and team discs match. |
| Desktop game · column selected | matched | Continuous translucent column overlay, floating disc, and dashed landing target match. |
| Desktop game · opponent turn | matched | Current-player treatment and non-interactive board state match. |
| Desktop result · win/lose | matched | Dimmed board, four-in-a-row tag, winning-disc emphasis, and bottom result bar match. |
| Desktop menu and confirmations | matched | Shared centered menu plus the shared Leave/New Game confirmations are reused without game-specific duplicates. |
| Phone game states | matched | 377 × 328 edge-aligned board, compact players/menu, turn copy, and fixed stock strip match without document scrolling. |
| Phone result | matched | Centered trophy result dialog, score, host actions/wait state, and close control match. |

## Interaction and regression verification

- Two isolated Chrome profiles join the same two-digit room, synchronize state, play, see the same last move, and return to the preserved lobby configuration.
- A human move produces exactly one computer reply after the intended visible pause.
- A complete human-versus-computer game preserves every chip except an explicit one-eyed-Jack removal.
- Replay is host-controlled and immediate; New game returns everyone to a fresh lobby with the prior players, teams, colors, and computers.
- Sound defaults on. Starting a game requests full screen, and Escape exits full screen.
- A TV tab enables Controller View; closing the TV removes that option and returns the player to Board View.
- Desktop, narrow, wide-monitor, and mobile game surfaces have no document-level horizontal or vertical scrolling; only the intended mobile board pan and tall lobby content can scroll internally.
