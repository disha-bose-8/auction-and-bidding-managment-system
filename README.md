# Online Auction and Bidding Management System

A web app where sellers list items, bidders place live bids, and admins watch the numbers.
Built for the DBMS Level 3 project with Next.js, MySQL and MongoDB.

## Why two databases

- MySQL stores the data that needs strict rules: users, categories, auctions, bids, payments, watchlist and feedback. Bidding must never break a rule (a low bid, a bid on a closed auction, a seller bidding on their own item), so it runs as a transaction with a trigger and a stored procedure.
- MongoDB stores the data that changes shape or has no joins: item specifications and photos (a phone has storage, a painting has a medium), tags, and notifications. Each is one self-contained document.

## Features

- Register and log in (bcrypt password hashes, signed JWT cookie). Roles: Bidder, Seller, Admin.
- Browse, search and filter auctions. Auction page with live countdown, bid history and specs.
- Bidding through the `place_bid` stored procedure, with anti-sniping (a late bid extends the end time).
- Auctions start, close and invoice the winner automatically (`sync_auction_status` and a MySQL event that runs every minute).
- Watchlist (heart button).
- Sellers create auctions: price and times go to MySQL, photo, specs and tags go to MongoDB.
- Notifications in the header bell (outbid, won, auction ended), stored in MongoDB.
- Seller profile page with rating, reviews and their auctions.
- Winners can rate the seller once per auction.
- Admin dashboard with MySQL aggregates (GROUP BY, HAVING, joins, subqueries) and MongoDB aggregation pipelines.

## Database features used

- MySQL: primary and foreign keys, CHECK and UNIQUE constraints, indexes, a full-text index, views (`CurrentHighestBid`, `AuctionBoard`), the `place_bid` and `sync_auction_status` stored procedures, the `trg_validate_bid` trigger, a scheduled event, and transactions.
- MongoDB: collections `auction_details` and `notifications`, indexes on `auctionId`, `tags` and `userId`, and aggregation pipelines (`$group`, `$unwind`, `$sort`, `$limit`, `$cond`).

## Setup (Windows)

You need Node 20.6 or newer, pnpm, MySQL 8 and MongoDB Community Server (installed as a service).

1. Install packages:
   ```
   pnpm install
   ```
2. Create the MySQL database. Run the two files in this order (the first one drops and recreates the database):
   ```
   "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < sql\auction_full_script.sql
   "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < sql\04_patch.sql
   ```
   Or open each file in MySQL Workbench and run it.
3. Copy `.env.example` to `.env.local` and fill in your values.
4. Check MongoDB is running (connect to `mongodb://127.0.0.1:27017` in Compass), then load the sample details:
   ```
   node --env-file=.env.local scripts/seed-mongo.mjs
   ```
5. Start the app:
   ```
   pnpm dev
   ```
   Open http://localhost:3000.

## Demo accounts

All use the password `Password@123` (set by `sql/04_patch.sql`).

| Role | Email |
| --- | --- |
| Admin | aarav@mail.com |
| Seller | meera@mail.com, rohan@mail.com |
| Bidder | sneha@mail.com, karthik@mail.com, divya@mail.com |

The login page also has one-click demo buttons for Bidder, Seller and Admin.

Demo auctions end after a while. If the home page shows no live auctions, run `sql/04_patch.sql` again to create fresh ones.

## Project structure

```
app/                  pages and API routes (Next.js App Router)
  api/                backend route handlers
  admin/              admin dashboard
  auctions/[id]/      auction page
  sell/               create auction (sellers)
  sellers/[id]/       seller profile
components/           Header (bell, navigation), FeedbackBox
lib/                  db.ts (MySQL), mongo.ts, auth.ts, notifications.ts, admin.ts, api.ts
sql/                  auction_full_script.sql (schema and sample data), 04_patch.sql
scripts/seed-mongo.mjs  sample MongoDB documents
```

## API routes

| Route | What it does |
| --- | --- |
| `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me` | accounts and session |
| `GET /api/auctions`, `POST /api/auctions` | list auctions, create one (Seller) |
| `GET /api/auctions/:id` | one auction with bids and specs |
| `POST /api/auctions/:id/bids` | place a bid |
| `GET/POST /api/auctions/:id/feedback` | check eligibility, rate the seller (winner only) |
| `GET /api/categories` | categories for the create form |
| `GET/POST /api/watchlist` | list and toggle watched auctions |
| `GET /api/notifications`, `POST /api/notifications/read` | bell data, mark all as read |
| `GET /api/sellers/:id` | seller profile |
| `GET /api/admin/stats` | dashboard numbers (Admin) |

## Security

- Passwords are stored as bcrypt hashes. Login uses a signed, HTTP-only cookie.
- Database credentials and the JWT secret come from `.env.local`, which is not committed.
- Every protected route checks the user's role on the server, not just in the page.
- Input is validated in the API and again by database constraints, triggers and the stored procedure.
