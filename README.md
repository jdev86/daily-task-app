# Daily Task Planner

An AI-powered daily task planning application that helps you optimize your schedule based on your energy levels and task requirements.

## Features

- **AI-Powered Scheduling**: Uses Google's Gemini 1.5 Flash model to create optimized daily schedules
- **Smart Task Organization**: Automatically arranges tasks based on:
  - Energy levels throughout the day
  - Task complexity and requirements
  - Natural breaks and transitions
- **Clean, Modern Interface**: Dark theme with a focus on readability and user experience
- **Real-time Optimization**: Get instant schedule suggestions as you add tasks

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Add your tasks to the list
2. Click "Plan My Day" to generate an optimized schedule
3. Review the AI-generated schedule with explanations for each task's timing
4. Edit or remove tasks as needed
5. Regenerate the schedule to get new optimizations

## Technology Stack

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: Google Gemini 1.5 Flash
- **State Management**: TanStack Query
- **Routing**: TanStack Router

## Environment Variables

- `VITE_GEMINI_API_KEY`: Your Google Gemini API key

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
