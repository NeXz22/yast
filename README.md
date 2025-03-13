# Mob Programming Timer

A real-time collaborative timer application for mob/ensemble programming sessions with WebSocket support.

## Features

- Create or join programming sessions with a shareable link
- Synchronized timer across all participants
- Role management (Driver, Navigator, etc.)
- Automatic role rotation when the timer ends
- Drag and drop participant reordering
- Modern, responsive UI with animated timer ring

## Tech Stack

- Node.js and Express for the backend
- Socket.IO for real-time communication
- Vanilla JavaScript for the frontend
- CSS for styling and animations

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/yast.git
cd yast
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Building for Production

To create a production-ready build:

```bash
npm run build
```

This will create a `dist` directory with all the necessary files for deployment.

## Deployment

### Deploying to Heroku

1. Create a Heroku account and install the Heroku CLI
2. Login to Heroku
```bash
heroku login
```

3. Create a new Heroku app
```bash
heroku create your-app-name
```

4. Deploy to Heroku
```bash
git push heroku main
```

### Deploying to Vercel

1. Install Vercel CLI
```bash
npm install -g vercel
```

2. Deploy to Vercel
```bash
vercel
```

### Deploying to DigitalOcean App Platform

1. Create a DigitalOcean account
2. Create a new App in the App Platform
3. Connect your GitHub repository
4. Configure the build command as `npm run build`
5. Set the run command as `node server.js`

## Environment Variables

The application uses the following environment variables:

- `PORT`: The port on which the server will run (defaults to 3000)

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Acknowledgements

- Socket.IO for the real-time communication library
- The mob programming community for inspiration

