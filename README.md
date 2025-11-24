# Git Intelligence

Git Intelligence is a powerful tool designed to analyze and visualize Git repository statistics. It provides a comprehensive dashboard to track project activity, contributor performance, and code base growth over time.

## Features

- **Dashboard Overview**: View key metrics like total commits, contributors, and file counts at a glance.
- **Activity Analysis**: Visualize commit activity patterns by hour of day and day of week.
- **Contributor Insights**: Track top contributors, their commit counts, and activity percentages.
- **File Composition**: Understand your project's language distribution with file extension charts.
- **Growth Tracking**: Monitor the project's evolution with Lines of Code (LOC) history.
- **Multi-Project Support**: Manage and switch between multiple Git repositories easily.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS (v4), Recharts, Lucide React
- **Backend**: Node.js, Express, Simple Git
- **Persistence**: JSON-based local storage

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd git-intelligence
    ```

2.  **Install All Dependencies**
    ```bash
    npm run install:all
    ```

### Usage

1.  **Run Everything**
    ```bash
    npm run dev
    ```
    This command starts both the backend (port 3001) and frontend (port 5173) concurrently.

2.  **Analyze a Project**
    - Open the dashboard at `http://localhost:5173`.
    - Click "Add Repository" to start analyzing a local Git repository.
    - Enter the absolute path to the repository on your machine.

## License

ISC
