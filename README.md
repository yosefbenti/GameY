# GameY — 2-Team Multi-Level Game

GameY is a real-time browser game for two teams with an Admin control panel.

It has 3 levels:

1. Level 1: Jigsaw Puzzle
2. Level 2: Memory Match
3. Level 3: Word Challenge

---

## 1) Run the game

From the project folder:

```bash
./start-all.sh
```

This starts one unified server on port `8000`.

Open:

- Admin: [http://localhost:8000/admin](http://localhost:8000/admin)
- Team A: [http://localhost:8000/teamA](http://localhost:8000/teamA)
- Team B: [http://localhost:8000/teamB](http://localhost:8000/teamB)

From other devices on the same network, replace `localhost` with your server LAN IP.

---

## 2) Admin flow (recommended)

1. Open Admin page.
2. Optionally set team names.
3. Set game image (URL or upload) for puzzle level.
4. Start levels:
	 - `Start Level 1 (Puzzle)`
	 - `Start Level 2 (Memory)`
	 - `Start Level 3 (Word)`
5. Click `Start` to run timer for active level.

Useful controls:

- `Pause`
- `Force End`
- `Next Level`
- `Reset` (current round)
- `Reset All` (scores + round state)

---

## 3) How players play

## Level 1 — Jigsaw Puzzle

- 4x4 board (16 pieces).
- Drag and drop to swap pieces.
- Each correct piece position is worth `10` points.
- Max base score: `160`.

## Level 2 — Memory Match

- Match card pairs.
- Each matched pair is worth `10` points.
- Default in admin is 4 pairs, so max base score is `40`.

## Level 3 — Word Challenge

- A letter is chosen (admin can set or random).
- Categories: Country, Food, Drink, Animal.
- Each valid category answer starting with that letter gives `10` points.
- Duplicate/invalid answers do not score.

---

## 4) Scoring and bonus rules

## Base scoring

- Level score = progress points for that level.
- Team total = Level 1 + Level 2 + Level 3.

## Fast-finish behavior (Level 1 and 2 only)

- If one team completes first:
	- the other team is immediately frozen,
	- the level ends for both teams.

## Bonus rule

- Bonus is only considered for the **first finisher** on Level 1 or 2.
- Bonus is granted only if player finishes with at least half of level time remaining.
- If granted, bonus equals remaining seconds (integer).

Formula:

$$
	ext{Final Level Score} = \text{Base Score} + \text{Bonus}
$$

Bonus eligibility:

$$
	ext{Bonus applies if } \text{remaining} \ge \left\lceil\frac{\text{timeLimit}}{2}\right\rceil
$$

---

## 5) Winner logic

- Admin panel shows running totals and current leading team.
- Final winner is decided by total score across all 3 levels.
- Until both teams complete all 3 levels, winner may display as pending.

---

## 6) Troubleshooting

- If pages do not sync, restart with `./start-all.sh`.
- If other devices cannot connect, check firewall for TCP port `8000`.
- If image upload fails, use a smaller image and retry.
