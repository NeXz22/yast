const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS for Vercel
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  },
  // Add these options for better compatibility with serverless environments
  transports: ['websocket', 'polling'],
  path: '/socket.io'
});

// Serve static files first
app.use(express.static(path.join(__dirname, 'public')));

// Then add the catch-all route for client-side routing
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store active sessions
const sessions = new Map();

// Add this near the top of your file where you define sessions
const DEFAULT_ROLES = ['Driver', 'Navigator'];

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
        role: null // New participants don't have a role initially
      });
    } else {
      // Create new session with the provided ID or generate a new one
      const newSessionId = sessionId || uuidv4();
      session = {
        id: newSessionId,
        participants: [{
          id: socket.id,
          username,
          role: DEFAULT_ROLES[0] // Assign first role to first participant
        }],
        roles: [...DEFAULT_ROLES], // Copy default roles
        timerDuration: 10 * 60, // 10 minutes in seconds
        timeRemaining: 10 * 60,
        isRunning: false
      };
      sessions.set(newSessionId, session);
      sessionId = newSessionId;
    }
    
    // Assign roles if needed (first participant gets first role, etc.)
    if (session.participants.length <= session.roles.length) {
      const unassignedParticipants = session.participants.filter(p => p.role === null);
      unassignedParticipants.forEach((participant, index) => {
        // Find the first unassigned role
        const availableRoles = session.roles.filter(role => 
          !session.participants.some(p => p.role === role && p.id !== participant.id)
        );
        if (availableRoles.length > 0) {
          participant.role = availableRoles[0];
        }
      });
    }
    
    // Join the socket room for this session
    socket.join(sessionId);
    
    // Store session ID in socket for later reference
    socket.sessionId = sessionId;
    
    // Notify client of successful join
    socket.emit('sessionJoined', {
      sessionId,
      participants: session.participants,
      roles: session.roles,
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
  
  // Reorder participants
  socket.on('reorderParticipants', ({ srcId, targetId }) => {
    const sessionId = socket.sessionId;
    if (!sessionId || !sessions.has(sessionId)) return;
    
    const session = sessions.get(sessionId);
    
    // Find the indices of the source and target participants
    const srcIndex = session.participants.findIndex(p => p.id === srcId);
    const targetIndex = session.participants.findIndex(p => p.id === targetId);
    
    if (srcIndex === -1 || targetIndex === -1) return;
    
    // Remove the source participant
    const [participant] = session.participants.splice(srcIndex, 1);
    
    // Insert at the target position
    session.participants.splice(targetIndex, 0, participant);
    
    // Reassign roles based on order
    session.participants.forEach((p, index) => {
      if (index < session.roles.length) {
        p.role = session.roles[index];
      } else {
        p.role = null;
      }
    });
    
    // Notify all participants about the reordering
    io.to(sessionId).emit('participantsReordered', {
      participants: session.participants
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

  // Add a new handler for updating roles
  socket.on('updateRoles', (roles) => {
    const sessionId = socket.sessionId;
    if (!sessionId || !sessions.has(sessionId)) return;
    
    const session = sessions.get(sessionId);
    
    // Update the roles
    session.roles = roles;
    
    // Reassign roles to participants if needed
    session.participants.forEach((participant, index) => {
      if (index < roles.length) {
        participant.role = roles[index];
      } else {
        participant.role = null; // No role available
      }
    });
    
    // Notify all participants
    io.to(sessionId).emit('rolesUpdated', {
      roles: session.roles,
      participants: session.participants
    });
  });

  // Add this event handler to your socket.io connection handler in server.js
  socket.on('changeUsername', (newUsername) => {
    const sessionId = socket.sessionId;
    if (!sessionId || !sessions.has(sessionId)) return;
    
    const session = sessions.get(sessionId);
    
    // Find the participant
    const participant = session.participants.find(p => p.id === socket.id);
    if (!participant) return;
    
    // Update the username
    const oldUsername = participant.username;
    participant.username = newUsername;
    
    // Notify all participants
    io.to(sessionId).emit('usernameChanged', {
      participantId: socket.id,
      oldUsername,
      newUsername,
      participants: session.participants
    });
  });
});

// Helper function to rotate the driver role
function rotateDriver(session) {
  if (session.participants.length <= 1) return;
  
  // Rotate all participants' roles
  const firstRole = session.roles[0];
  const participantsWithRoles = session.participants.filter(p => p.role !== null);
  
  // Shift roles to the next participant
  for (let i = 0; i < participantsWithRoles.length; i++) {
    const currentIndex = i;
    const nextIndex = (i + 1) % participantsWithRoles.length;
    
    // If we've gone full circle, the last person gets the first role
    if (nextIndex === 0 && currentIndex === participantsWithRoles.length - 1) {
      participantsWithRoles[currentIndex].role = firstRole;
    } else {
      participantsWithRoles[currentIndex].role = 
        participantsWithRoles[nextIndex].role || session.roles[nextIndex % session.roles.length];
    }
  }
}

// For Vercel, we need to check if we're being imported as a module
if (require.main === module) {
  // Start the server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for serverless use
module.exports = app; 