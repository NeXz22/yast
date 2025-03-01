document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const joinForm = document.getElementById('join-form');
    const sessionInfo = document.getElementById('session-info');
    const usernameInput = document.getElementById('username');
    const sessionIdInput = document.getElementById('session-id');
    const joinBtn = document.getElementById('join-btn');
    const currentSessionIdSpan = document.getElementById('current-session-id');
    const copySessionBtn = document.getElementById('copy-session-btn');
    const timerDisplay = document.getElementById('timer');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const timerDurationInput = document.getElementById('timer-duration');
    const updateDurationBtn = document.getElementById('update-duration-btn');
    const participantsList = document.getElementById('participants-list');
    
    // Connect to Socket.io server with error handling
    let socket;
    try {
        // Try to connect to the server running on the same host
        socket = io(window.location.origin);
        
        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            alert('Failed to connect to the server. Please make sure the server is running.');
        });
    } catch (error) {
        console.error('Socket.io initialization error:', error);
        alert('Failed to initialize Socket.io. Please make sure you are accessing the app through the server.');
    }
    
    // Session data
    let sessionData = {
        sessionId: null,
        participants: [],
        timerDuration: 10 * 60, // 10 minutes in seconds
        timeRemaining: 10 * 60,
        isRunning: false
    };
    
    // Join session
    joinBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const sessionId = sessionIdInput.value.trim();
        
        if (!username) {
            alert('Please enter your name');
            return;
        }
        
        socket.emit('joinSession', { sessionId, username });
    });
    
    // Copy session ID to clipboard
    copySessionBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(sessionData.sessionId)
            .then(() => {
                alert('Session ID copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy session ID:', err);
            });
    });
    
    // Timer controls
    startBtn.addEventListener('click', () => {
        socket.emit('startTimer');
    });
    
    pauseBtn.addEventListener('click', () => {
        socket.emit('pauseTimer');
    });
    
    resetBtn.addEventListener('click', () => {
        socket.emit('resetTimer');
    });
    
    // Update timer duration
    updateDurationBtn.addEventListener('click', () => {
        const duration = parseInt(timerDurationInput.value);
        if (isNaN(duration) || duration < 1 || duration > 60) {
            alert('Please enter a valid duration between 1 and 60 minutes');
            return;
        }
        
        socket.emit('updateTimerDuration', duration * 60); // Convert to seconds
    });
    
    // Socket event handlers
    socket.on('sessionJoined', (data) => {
        sessionData = data;
        currentSessionIdSpan.textContent = data.sessionId;
        timerDurationInput.value = Math.floor(data.timerDuration / 60);
        updateTimerDisplay(data.timeRemaining);
        updateParticipantsList(data.participants);
        
        // Show session info and hide join form
        joinForm.classList.add('hidden');
        sessionInfo.classList.remove('hidden');
    });
    
    socket.on('participantJoined', (data) => {
        sessionData.participants = data.participants;
        updateParticipantsList(data.participants);
    });
    
    socket.on('participantLeft', (data) => {
        sessionData.participants = data.participants;
        updateParticipantsList(data.participants);
    });
    
    socket.on('timerStarted', (data) => {
        sessionData.isRunning = data.isRunning;
        updateTimerControls();
    });
    
    socket.on('timerPaused', (data) => {
        sessionData.isRunning = data.isRunning;
        sessionData.timeRemaining = data.timeRemaining;
        updateTimerDisplay(data.timeRemaining);
        updateTimerControls();
    });
    
    socket.on('timerReset', (data) => {
        sessionData.timeRemaining = data.timeRemaining;
        updateTimerDisplay(data.timeRemaining);
    });
    
    socket.on('timerUpdate', (data) => {
        sessionData.timeRemaining = data.timeRemaining;
        updateTimerDisplay(data.timeRemaining);
    });
    
    socket.on('timerEnded', (data) => {
        sessionData.participants = data.participants;
        sessionData.timeRemaining = data.timeRemaining;
        sessionData.isRunning = data.isRunning;
        
        updateTimerDisplay(data.timeRemaining);
        updateParticipantsList(data.participants);
        updateTimerControls();
        
        // Play sound or show notification
        playTimerEndSound();
    });
    
    socket.on('timerDurationUpdated', (data) => {
        sessionData.timerDuration = data.timerDuration;
        sessionData.timeRemaining = data.timeRemaining;
        timerDurationInput.value = Math.floor(data.timerDuration / 60);
        updateTimerDisplay(data.timeRemaining);
    });
    
    // Helper functions
    function updateTimerDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        // Add visual indication when timer is about to end
        if (seconds <= 30 && sessionData.isRunning) {
            timerDisplay.classList.add('ending');
        } else {
            timerDisplay.classList.remove('ending');
        }
    }
    
    function updateParticipantsList(participants) {
        participantsList.innerHTML = '';
        
        participants.forEach(participant => {
            const li = document.createElement('li');
            li.textContent = participant.username;
            
            if (participant.isDriver) {
                const driverBadge = document.createElement('span');
                driverBadge.className = 'driver-indicator';
                driverBadge.textContent = 'DRIVER';
                li.appendChild(driverBadge);
            }
            
            participantsList.appendChild(li);
        });
    }
    
    function updateTimerControls() {
        if (sessionData.isRunning) {
            startBtn.disabled = true;
            pauseBtn.disabled = false;
        } else {
            startBtn.disabled = false;
            pauseBtn.disabled = true;
        }
    }
    
    function playTimerEndSound() {
        // Create and play a simple beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.5;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 500);
    }
}); 