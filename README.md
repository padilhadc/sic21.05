# Sistema CPR

A service management system built with React, TypeScript, and Supabase.

## Setup Instructions

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Replace the placeholder values with your actual Supabase URL and anonymous key
5. Run the development server with `npm run dev`

## Connecting to Supabase

To connect this application to Supabase:

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Navigate to Project Settings > API
4. Copy the URL and anon key
5. Paste them into your `.env` file

## Features

- User authentication
- Service record management
- Admin panel for user management
- Audit logging
- Responsive design

## Technologies Used

- React
- TypeScript
- Tailwind CSS
- Supabase (Authentication & Database)
- Vite