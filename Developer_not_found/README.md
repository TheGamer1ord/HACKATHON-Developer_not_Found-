# Daily Check-in System

A minimal local web app to record a once-per-day check-in, track your streak, and view history. Data is stored in a local JSON file under `data/checkins.json`.

## Run

```bash
npm install
npm run start
```

Then open `http://localhost:3000`.

## Features
- Single click daily check-in with optional note
- Prevents multiple check-ins per day
- Shows current streak and total count
- History list with timestamps

## Data location
- `data/checkins.json` is created automatically.

## Optional reminder on Windows
You can set a daily reminder via Task Scheduler to open the app:
1. Open Task Scheduler → Create Basic Task
2. Trigger: Daily at your preferred time
3. Action: Start a program
   - Program/script: `powershell.exe`
   - Add arguments: `-Command "Start-Process 'http://localhost:3000'"`
   - Start in: your project folder
4. Ensure the server is running at that time, or create a second task that runs `npm start` in this folder at logon.


