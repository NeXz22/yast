const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store active sessions
const sessions = new Map();

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join or create a session
  socket.on('joinSession', ({ sessionId, username }) => {
    let session;
    
    if (sessionId && sessions.has(sessionId)) {
      // Join existing session
      session = sessions.get(sessionId);
      
      // Add participant to the session
      session.participants.push({
        id: socket.id,
        username,
        isDriver: session.participants.length === 0 // First participant becomes driver
      });
    } else {
      // Create new session
      const newSessionId = uuidv4();
      session = {
        id: newSessionId,
        participants: [{
          id: socket.id,
          username,
          isDriver: true // First participant becomes driver
        }],
        timerDuration: 10 * 60, // 10 minutes in seconds
        timeRemaining: 10 * 60,
        isRunning: false
      };
      sessions.set(newSessionId, session);
      sessionId = newSessionId;
    }
    
    // Join the socket room for this session
    socket.join(sessionId);
    
    // Store session ID in socket for later reference
    socket.sessionId = sessionId;
    
    // Notify client of successful join
    socket.emit('sessionJoined', {
      sessionId,
      participants: session.participants,
      timerDuration: session.timerDuration,
      timeRemaining: session.timeRemaining,
      isRunning: session.isRunning
    });
    
    // Notify other participants about the new member
    socket.to(sessionId).emit('participantJoined', {
      participants: session.participants
    });
  });
  
  // Start timer
  socket.on('startTimer', () => {
    const sessionId = socket.sessionId;
    if (!sessionId || !sessions.has(sessionId)) return;
    
    const session = sessions.get(sessionId);
    session.isRunning = true;
    
    // Notify all participants in the session
    io.to(sessionId).emit('timerStarted', {
      isRunning: true
    });
    
    // Start the timer interval if not already running
    if (!session.interval) {
      session.interval = setInterval(() => {
        session.timeRemaining--;
        
        // Emit time update to all participants
        io.to(sessionId).emit('timerUpdate', {
          timeRemaining: session.timeRemaining
        });
        
        // Check if timer has reached zero
        if (session.timeRemaining <= 0) {
          clearInterval(session.interval);
          session.interval = null;
          session.isRunning = false;
          session.timeRemaining = session.timerDuration;
          
          // Rotate driver role
          rotateDriver(session);
          
          // Notify all participants
          io.to(sessionId).emit('timerEnded', {
            participants: session.participants,
            timeRemaining: session.timeRemaining,
            isRunning: false
          });
        }
      }, 1000);
    }
  });
  
  // Pause timer
  socket.on('pauseTimer', () => {
    const sessionId = socket.sessionId;
    if (!sessionId || !sessions.has(sessionId)) return;
    
    const session = sessions.get(sessionId);
    session.isRunning = false;
    
    // Clear the interval
    if (session.interval) {
      clearInterval(session.interval);
      session.interval = null;
    }
    
    // Notify all participants
    io.to(sessionId).emit('timerPaused', {
      isRunning: false,
      timeRemaining: session.timeRemaining
    });
  });
  
  // Reset timer
  socket.on('resetTimer', () => {
    const sessionId = socket.sessionId;
    if (!sessionId || !sessions.has(sessionId)) return;
    
    const session = sessions.get(sessionId);
    session.timeRemaining = session.timerDuration;
    
    // Notify all participants
    io.to(sessionId).emit('timerReset', {
      timeRemaining: session.timeRemaining
    });
  });
  
  // Update timer duration
  socket.on('updateTimerDuration', (duration) => {
    const sessionId = socket.sessionId;
    if (!sessionId || !sessions.has(sessionId)) return;
    
    const session = sessions.get(sessionId);
    session.timerDuration = duration;
    
    // If timer is not running, update the remaining time as well
    if (!session.isRunning) {
      session.timeRemaining = duration;
    }
    
    // Notify all participants
    io.to(sessionId).emit('timerDurationUpdated', {
      timerDuration: session.timerDuration,
      timeRemaining: session.timeRemaining
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const sessionId = socket.sessionId;
    if (!sessionId || !sessions.has(sessionId)) return;
    
    const session = sessions.get(sessionId);
    
    // Find and remove the participant
    const participantIndex = session.participants.findIndex(p => p.id === socket.id);
    if (participantIndex !== -1) {
      const wasDriver = session.participants[participantIndex].isDriver;
      session.participants.splice(participantIndex, 1);
      
      // If the disconnected participant was the driver, assign a new one
      if (wasDriver && session.participants.length > 0) {
        session.participants[0].isDriver = true;
      }
      
      // If no participants left, clean up the session
      if (session.participants.length === 0) {
        if (session.interval) {
          clearInterval(session.interval);
        }
        sessions.delete(sessionId);
      } else {
        // Notify remaining participants
        io.to(sessionId).emit('participantLeft', {
          participants: session.participants
        });
      }
    }
  });
});

// Helper function to rotate the driver role
function rotateDriver(session) {
  if (session.participants.length <= 1) return;
  
  // Find current driver index
  const currentDriverIndex = session.participants.findIndex(p => p.isDriver);
  
  // Set current driver to false
  if (currentDriverIndex !== -1) {
    session.participants[currentDriverIndex].isDriver = false;
  }
  
  // Set next driver
  const nextDriverIndex = (currentDriverIndex + 1) % session.participants.length;
  session.participants[nextDriverIndex].isDriver = true;
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 