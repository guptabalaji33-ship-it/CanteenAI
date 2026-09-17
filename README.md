# CanteenAI — Demo Ready

A hackathon-ready university canteen pre-order and AI demand forecasting prototype.

## What it demonstrates

Student:
- Browse/search menu
- Add food to cart
- Select pickup slot
- Place and track orders

Owner:
- Dashboard with today's orders/revenue
- Popular items
- Upcoming pickup-slot demand
- AI forecast and recommended preparation quantity

## Stack

- Mobile: Expo + React Native + TypeScript
- API: Node.js + Express + TypeScript
- Database: Prisma + SQLite
- AI/ML: Python + FastAPI + scikit-learn Random Forest

## Demo accounts

Student:
student@demo.com / student123

Owner:
owner@demo.com / owner123

## Run

### 1. Backend
```powershell
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

API: http://localhost:4000

### 2. AI service
Open a second terminal:
```powershell
cd ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

AI: http://localhost:8000

### 3. Mobile
Open a third terminal:
```powershell
cd mobile
npm install
npx expo start
```

For a physical Android phone, create `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=http://YOUR-LAPTOP-IP:4000
```
Use the laptop IPv4 from `ipconfig`, then restart Expo.

## Hackathon demo

1. Open Student mode.
2. Add Veg Biryani + Paneer Roll.
3. Select a pickup slot.
4. Place the order.
5. Open Owner mode.
6. Show the dashboard update.
7. Tap AI Forecast.
8. Explain that historical order patterns are used to estimate future demand and recommend preparation quantity.
