# Picture Jigsaw Puzzle (4x4) — Level 1–3

Quick local game for two teams on the same screen.

How to run

1. Open the file [index.html](index.html) in your browser (no server required).
2. Set the admin time (seconds).
3. Click `Start` to start both timers simultaneously.
4. Drag and drop pieces to swap them between slots and complete the image.

Rules implemented

- 4×4 puzzle per team (same image).
- Shared start and countdown timer.
- First team to assemble the full image wins; otherwise level ends when time runs out.
- Scoring displayed as % complete; a simple speed bonus is shown for the winner.

Level 2 — Memory Match

- Pairs of cards, shared timer.
- Correct pairs score +10 points each.

Level 3 — Letter-Based Word Challenge

- Random letter shown to both teams.
- Fixed categories: Country, Food, Drink, Human name, Animal.
- Correct word per category starting with the letter scores +10.
- Invalid or repeated answers are rejected; players can skip categories for 0 points.

LAN (same network) play

- Run the server machine with `./start-all.sh`.
- Open on server machine:
	- Admin: `http://localhost:8001/admin.html`
- Open on other computers using the server IP (example `192.168.1.50`):
	- Team A: `http://192.168.1.50:8002/teamA.html`
	- Team B: `http://192.168.1.50:8003/teamB.html`
- Ensure firewall allows inbound TCP ports `8000`, `8001`, `8002`, `8003` on the server machine.
