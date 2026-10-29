# ETM — Esports Tournament Management

## Cấu trúc dự án

```
EsportsTournamentManagement/
├── ETMback-end/       # Node.js + Express + MongoDB
└── ETMfront-end/      # React Native + Expo
```

## Backend (`ETMback-end`)

```
ETMback-end/
├── src/
│   ├── config/        # DB config, env
│   ├── constants/     # Hằng số
│   ├── controllers/   # Route handlers
│   ├── middlewares/   # Auth, validation, error handling
│   ├── models/        # Mongoose schemas
│   ├── routes/        # Express routes
│   ├── services/      # Business logic
│   ├── utils/         # Helper functions
│   └── scripts/       # Seed, import data
├── data/              # JSON seed data
└── postman/           # Postman collection
```

## Frontend (`ETMfront-end`)

```
ETMfront-end/
├── app/               # Expo Router screens
│   ├── (auth)/        # login, register, forgot-password
│   ├── (tabs)/        # home, tournaments, clubs, notifications, profile
│   ├── (admin)/       # dashboard, users, games
│   └── (organizer)/   # dashboard, tournaments, matches, brackets, applications
├── assets/            # fonts, images, icons
├── components/        # UI components theo entity
├── constants/         # Colors, endpoints, enums
├── contexts/          # React contexts
├── hooks/             # Custom hooks (React Query)
├── services/api/      # Axios API functions
├── store/             # Zustand stores
├── types/             # TypeScript interfaces
└── utils/             # Formatters, storage helpers
```

## Setup

### Backend
```bash
cd ETMback-end
npm install
cp .env.example .env
npm run dev
```

### Frontend
```bash
cd ETMfront-end
npm install
cp .env.example .env
npm start
```
