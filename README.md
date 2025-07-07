# Wolt Checker Bot

A Telegram bot that checks Wolt restaurant availability and sends notifications when closed restaurants become available.

## Features

- Search for restaurants by name (English/Hebrew)
- Check if restaurants are open or closed
- Register for notifications when closed restaurants open
- View and manage notification registrations
- Background service to monitor restaurants and send notifications

## Prerequisites

- Node.js 16 or higher
- Telegram Bot Token (get from @BotFather on Telegram)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd wolt-checker-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Add your Telegram Bot Token to the `.env` file:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

## Usage

### Running locally

1. Start the main bot:
```bash
npm start
```

2. Start the notification service (in another terminal):
```bash
npm run notify
```

### Running with Docker

1. Build and start both services:
```bash
docker-compose up --build
```

The bot will create a SQLite database automatically to store user notifications.

## Bot Commands

- `/start` - Start the bot and search for restaurants
- `/show` - Show current notification registrations
- `/cancel` - Cancel current operation

## How it works

1. User starts the bot and searches for a restaurant
2. Bot queries the Wolt API for matching restaurants
3. User selects a restaurant from the results
4. If the restaurant is open, bot provides a direct link to order
5. If the restaurant is closed, bot offers to register for notifications
6. Background service checks registered restaurants every 10 seconds
7. When a restaurant opens, all registered users receive notifications

## Project Structure

```
wolt-checker-bot/
├── src/
│   ├── main.js          # Main bot application
│   ├── notify.js        # Background notification service
│   ├── database.js      # Database operations
│   └── db/              # SQLite database directory
├── package.json         # Node.js dependencies
├── docker-compose.yml   # Docker services configuration
├── Dockerfile          # Docker image configuration
└── README.md           # This file
```

## Development

For development with auto-reload:
```bash
npm run dev
```

## License

ISC 