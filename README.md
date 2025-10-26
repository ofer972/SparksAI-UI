# SparksAI Burndown Chart

A Next.js application that displays sprint burndown charts using data from the SparksAI backend API.

## Features

- Interactive burndown chart visualization
- Real-time data fetching from SparksAI backend
- Responsive design with Tailwind CSS
- Chart.js integration for smooth animations
- TypeScript support for type safety

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Configuration

The application fetches data from:
- Base URL: `https://sparksai-backend-production.up.railway.app`
- Endpoint: `/api/v1/team-metrics/sprint-burndown`

## Chart Features

- **Actual Remaining**: Orange solid line with circular markers
- **Ideal Burndown**: Grey dashed line showing expected progress
- **Total Scope**: Blue dotted line showing total issues
- **Interactive Tooltips**: Hover over data points for detailed information
- **Event Markers**: Visual indicators for issues removed and completed

## Technologies Used

- Next.js 14 with App Router
- React 18
- TypeScript
- Chart.js with react-chartjs-2
- Tailwind CSS
- date-fns for date formatting

## Project Structure

```
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── BurndownChart.tsx
├── lib/
│   └── api.ts
└── package.json
```
