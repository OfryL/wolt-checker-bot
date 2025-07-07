# Setup Instructions

## Environment Variables

Create a `.env` file in the root directory with the following content:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

## Getting a Telegram Bot Token

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the token provided by BotFather
5. Replace `your_telegram_bot_token_here` in the `.env` file with your actual token

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Create your `.env` file as described above

3. Start the bot:
```bash
npm start
```

4. In another terminal, start the notification service:
```bash
npm run notify
```

## Docker Setup

1. Create your `.env` file as described above

2. Run with Docker Compose:
```bash
docker-compose up --build
```

This will automatically start both the bot and notification service. 