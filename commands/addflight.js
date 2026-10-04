# Ryanair Discord Bot

A Ryanair-themed airline operations Discord bot built with Node.js, discord.js, and SQLite.

## Features

- Flight management: add, edit, view, remove, delay, cancel, gate, aircraft
- Passenger operations: check-in, boarding pass, seat, passenger list, manifest
- Crew operations: assign, unassign, crew list, check-in
- Staff management: promote, demote, warn, warnings, LOA, staff profile
- Broadcasts: announce, advertisement, polls, tickets
- Flight panel with action buttons
- Persistent SQLite storage

## Setup

1. Install Node.js 18+
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Add your bot token and application ID
5. Run `npm start`

## Notes

- Flight, passenger, crew, warnings, and staff data persist in `data/bot.db`
- Restrict staff/management commands using Discord permissions in your server
- Dates can be entered in easy formats like `04/10/2026` and `20:00`
