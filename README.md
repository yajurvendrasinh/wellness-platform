# Wellness Platform

A minimalist, modern, and sophisticated health and wellness application designed to help users track their energy expenditure and curate bespoke workout routines with scientific precision.

## Key Features

### TDEE Calculator (Total Daily Energy Expenditure)
- **Odometer Animation**: High-end mechanical rolling digit animation for caloric targets, providing a tactile, high-performance feel.
- **Dynamic Goal Setting**: Instant deficit/surplus modeling with **CUT** (-500 kcal), **MAINTAIN**, and **BULK** (+500 kcal) toggles.
- **Proportional Macronutrient Intelligence**:
  - **Static Protein Anchor**: Calculations are tied to lean mass, ensuring muscle preservation across all goals.
  - **Dynamic Scaling**: Fats and Carbohydrates scale in real-time with your caloric target.
  - **Fixed-Baseline Visualization**: Progress bars scale relative to your *Estimated Maintenance*, allowing you to visually see the caloric delta.

### Bespoke Workout Builder
- **Scientific Training Data**: Integrated protocols derived from *The Muscle & Strength Pyramid*, *Renaissance Periodization*, and *Pursuit: Mobility*.
- **Intent-Based Curation**:
  - **Strength**: 27 full-body variants featuring **Target RIR** (Reps In Reserve) and specific **Coaching Cues**.
  - **Endurance**: 27 cardio protocols optimized for **SFTR** (Stimulus to Fatigue and Time Ratio) with specific **Target BPM** zones.
  - **Flexibility**: Dedicated mobility sequences with adaptive durations (**5, 10, or 20 min**) and step-by-step instructions.
- **Adaptive UI**: The interface dynamically reconfigures its layout and metrics based on the selected focus (e.g., switching from sets/reps to heart rate zones or timed drills).
- **Normalized Design**: Unified informational pills across all categories for consistent data visualization.

### Design Philosophy
- **Minimalist Aesthetic**: Clean, responsive layout using Alata and Manrope typography.
- **High-End Motion**: Utilizes `motion/react` for layout transitions and digit animations.
- **Earthed Design System**: A cohesive neutral palette designed to reduce cognitive load and enhance focus.

---

## Technical Stack

- **Framework**: React 18+ with Vite
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion (`motion/react`)
- **Icons**: Lucide React
- **Data Architecture**: JSON-driven workout engine for seamless scaling

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository (or download the source).
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

---

## Publishing & Deployment

### Building for Production
```bash
npm run build
```
Generates a `dist/` folder containing optimized static assets.

### Deployment
The application is ready for deployment on:
- **Cloud Run** (via the AI Studio share workflow)
- **Vercel / Netlify**
- **GitHub Pages**

---

## Project Structure

- `src/App.tsx`: Central logic for energy calculators and the adaptive workout engine.
- `src/workouts.json`: Strength focus session data.
- `src/endurance.json`: Cardio and conditioning protocol data.
- `src/mobility.json`: Flexibility and recovery sequence data.
- `src/index.css`: Global styles and custom Wellness design system utilities.
