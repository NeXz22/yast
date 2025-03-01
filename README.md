# Mob Programming Timer

A real-time collaborative timer application designed specifically for mob/ensemble programming sessions. This application allows multiple participants to join a shared session, tracks the current driver, and automatically rotates roles when the timer expires.

## Overview

Mob Programming Timer provides a synchronized timer experience for teams practicing mob programming. It enables seamless coordination between team members regardless of their physical location, making it ideal for both co-located and distributed teams.

## Features

- **Real-time Collaboration**: Multiple participants can join the same session via a shareable session ID
- **Automatic Role Rotation**: When the timer expires, the driver role automatically rotates to the next participant
- **Visual Indicators**: Clear visual cues show who is currently in the driver role
- **Timer Controls**: Start, pause, and reset the timer as needed
- **Customizable Duration**: Adjust the timer duration to fit your team's preferences
- **Visual Alerts**: Timer pulses red when approaching the end of a turn
- **Audio Notification**: Plays a sound when the timer expires
- **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

### Frontend
- **HTML5**: Semantic markup for the application structure
- **CSS3**: Modern styling with flexbox, animations, and responsive design
- **JavaScript**: Client-side logic and DOM manipulation
- **WebSockets**: Real-time communication via Socket.io client

### Backend
- **Node.js**: JavaScript runtime for the server
- **Express**: Web application framework for handling HTTP requests
- **Socket.io**: WebSocket library for real-time, bidirectional communication
- **UUID**: Generation of unique session identifiers

## Getting Started

### Prerequisites
- Node.js (v12 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
   For development with auto-restart:
   ```
   npm run dev
   ```
5. Access the application at `http://localhost:3000`

## Usage

1. **Join or Create a Session**:
   - Enter your name
   - Optionally enter a session ID to join an existing session
   - Leave the session ID field empty to create a new session

2. **Share the Session**:
   - Copy the session ID and share it with your team members
   - Team members can join by entering the session ID

3. **Control the Timer**:
   - Start the timer when ready to begin
   - Pause if needed during a session
   - Reset to start over with the same duration
   - Adjust the timer duration as needed

4. **Role Rotation**:
   - When the timer expires, the driver role automatically rotates to the next participant
   - The current driver is clearly indicated with a "DRIVER" badge

## Architecture

The application follows a client-server architecture:

- **Server**: Manages sessions, participants, and timer state
- **Client**: Provides the user interface and communicates with the server via WebSockets
- **Sessions**: Stored in memory with unique identifiers
- **Participants**: Tracked within each session with their roles

## License

This project is licensed under the ISC License.

## Acknowledgments

- Inspired by the mob programming methodology developed by Woody Zuill and the mob programming community
- Built with modern web technologies to facilitate collaborative software development practices