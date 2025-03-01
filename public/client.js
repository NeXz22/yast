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
    const rolesList = document.getElementById('roles-list');
    const newRoleInput = document.getElementById('new-role-input');
    const addRoleBtn = document.getElementById('add-role-btn');
    const changeUsernameBtn = document.getElementById('change-username-btn');
    
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
        roles: ['Driver', 'Navigator'], // Default roles
        timerDuration: 10 * 60, // 10 minutes in seconds
        timeRemaining: 10 * 60,
        isRunning: false
    };
    
    // Parse URL for session ID
    function getSessionIdFromUrl() {
        // Check for direct path format: /sessionid/ID
        const pathMatch = window.location.pathname.match(/^\/sessionid\/([a-zA-Z0-9-]+)$/);
        if (pathMatch) {
            return pathMatch[1];
        }
        
        // Check for query parameter format: ?id=ID
        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get('id');
        if (idParam) {
            return idParam;
        }
        
        return null;
    }

    // Get stored username from localStorage
    function getStoredUsername(sessionId) {
        try {
            const storedData = localStorage.getItem('mobTimer');
            if (storedData) {
                const data = JSON.parse(storedData);
                // Return username for this specific session if available
                if (sessionId && data.sessions && data.sessions[sessionId]) {
                    return data.sessions[sessionId].username;
                }
                // Otherwise return the last used username
                return data.lastUsername || '';
            }
        } catch (error) {
            console.error('Error reading from localStorage:', error);
        }
        return '';
    }

    // Store username in localStorage
    function storeUsername(sessionId, username) {
        try {
            let data = { lastUsername: username, sessions: {} };
            
            // Try to get existing data
            const storedData = localStorage.getItem('mobTimer');
            if (storedData) {
                data = JSON.parse(storedData);
            }
            
            // Update data
            data.lastUsername = username;
            
            // Store session-specific data if we have a session ID
            if (sessionId) {
                if (!data.sessions) data.sessions = {};
                data.sessions[sessionId] = { 
                    username: username,
                    lastJoined: new Date().toISOString()
                };
            }
            
            localStorage.setItem('mobTimer', JSON.stringify(data));
        } catch (error) {
            console.error('Error writing to localStorage:', error);
        }
    }

    // Check for session ID in URL
    const urlSessionId = getSessionIdFromUrl();
    if (urlSessionId) {
        // If we have a session ID in the URL, pre-fill the session ID field
        sessionIdInput.value = urlSessionId;
        
        // Get stored username for this session
        const storedUsername = getStoredUsername(urlSessionId);
        if (storedUsername) {
            usernameInput.value = storedUsername;
        }
        
        // Show a modal to get username if not already set
        if (!storedUsername) {
            // Create and show username modal
            showUsernameModal(urlSessionId);
        } else {
            // Auto-join if we have both session ID and username
            joinSession(urlSessionId, storedUsername);
        }
    } else {
        // No session ID in URL, just pre-fill username field with last used username
        usernameInput.value = getStoredUsername();
    }

    // Function to show username modal
    function showUsernameModal(sessionId) {
        // Create modal elements
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const modalTitle = document.createElement('h2');
        modalTitle.textContent = 'Enter Your Name';
        
        const modalForm = document.createElement('form');
        modalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = modalUsernameInput.value.trim();
            if (username) {
                // Store username and join session
                storeUsername(sessionId, username);
                joinSession(sessionId, username);
                document.body.removeChild(modalOverlay);
            }
        });
        
        const modalUsernameInput = document.createElement('input');
        modalUsernameInput.type = 'text';
        modalUsernameInput.placeholder = 'Your name';
        modalUsernameInput.required = true;
        modalUsernameInput.value = getStoredUsername();
        
        const modalSubmitBtn = document.createElement('button');
        modalSubmitBtn.type = 'submit';
        modalSubmitBtn.className = 'btn primary';
        modalSubmitBtn.textContent = 'Join Session';
        
        // Assemble modal
        modalForm.appendChild(modalUsernameInput);
        modalForm.appendChild(modalSubmitBtn);
        modalContent.appendChild(modalTitle);
        modalContent.appendChild(modalForm);
        modalOverlay.appendChild(modalContent);
        
        // Add to document
        document.body.appendChild(modalOverlay);
        
        // Focus the input
        modalUsernameInput.focus();
    }

    // Function to join a session
    function joinSession(sessionId, username) {
        if (!username) return;
        
        // Store username for future use
        storeUsername(sessionId, username);
        
        // Emit join event
        socket.emit('joinSession', { sessionId, username });
    }

    // Update the join button click handler
    joinBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const sessionId = sessionIdInput.value.trim();
        
        if (!username) {
            alert('Please enter your name');
            return;
        }
        
        joinSession(sessionId, username);
    });
    
    // Update the copy session ID button click handler
    copySessionBtn.addEventListener('click', () => {
        const sessionUrl = `${window.location.origin}/sessionid/${sessionData.sessionId}`;
        navigator.clipboard.writeText(sessionUrl)
            .then(() => {
                alert('Session link copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy session link:', err);
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
    
    // Add event listener for adding a new role
    addRoleBtn.addEventListener('click', () => {
        const roleName = newRoleInput.value.trim();
        if (!roleName) return;
        
        // Add the role locally
        const updatedRoles = [...sessionData.roles, roleName];
        
        // Send to server
        socket.emit('updateRoles', updatedRoles);
        
        // Clear input
        newRoleInput.value = '';
    });
    
    // Add event listener for changing username
    changeUsernameBtn.addEventListener('click', () => {
        showChangeUsernameModal();
    });
    
    // Socket event handlers
    socket.on('sessionJoined', (data) => {
        sessionData = data;
        currentSessionIdSpan.textContent = data.sessionId;
        timerDurationInput.value = Math.floor(data.timerDuration / 60);
        updateTimerDisplay(data.timeRemaining);
        updateParticipantsList(data.participants);
        updateRolesList(data.roles);
        
        // Update URL with the session ID from the server
        const newUrl = `/sessionid/${data.sessionId}`;
        if (window.location.pathname !== newUrl) {
            window.history.pushState({ sessionId: data.sessionId }, '', newUrl);
        }
        
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
    
    socket.on('participantsReordered', (data) => {
        sessionData.participants = data.participants;
        updateParticipantsList(data.participants);
    });
    
    // Add handler for roles updated
    socket.on('rolesUpdated', (data) => {
        sessionData.roles = data.roles;
        sessionData.participants = data.participants;
        updateRolesList(data.roles);
        updateParticipantsList(data.participants);
    });
    
    // Add socket event handler for username changes
    socket.on('usernameChanged', (data) => {
        // Update session data
        sessionData.participants = data.participants;
        
        // Update participants list
        updateParticipantsList(data.participants);
        
        // Show notification
        showUsernameChangeNotification(data.oldUsername, data.newUsername, data.participantId === socket.id);
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
        
        participants.forEach((participant, index) => {
            const li = document.createElement('li');
            li.className = 'participant-item';
            li.setAttribute('data-id', participant.id);
            li.setAttribute('draggable', 'true');
            
            // Create a container for the username
            const nameSpan = document.createElement('span');
            nameSpan.className = 'participant-name';
            nameSpan.textContent = participant.username;
            li.appendChild(nameSpan);
            
            // Add role badge if applicable
            if (participant.role) {
                const roleBadge = document.createElement('span');
                roleBadge.className = `participant-role role-${participant.role}`;
                roleBadge.textContent = participant.role;
                li.appendChild(roleBadge);
            }
            
            // Add drag handle
            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '⋮⋮';
            li.appendChild(dragHandle);
            
            // Add event listeners for drag and drop
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('dragenter', handleDragEnter);
            li.addEventListener('dragleave', handleDragLeave);
            li.addEventListener('drop', handleDrop);
            li.addEventListener('dragend', handleDragEnd);
            
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
    
    // Drag and drop variables
    let dragSrcEl = null;

    function handleDragStart(e) {
        this.style.opacity = '0.4';
        
        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
        
        // Add a class to all items to show they're potential drop targets
        document.querySelectorAll('.participant-item').forEach(item => {
            if (item !== this) item.classList.add('potential-drop-target');
        });
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(e) {
        this.classList.add('over');
    }

    function handleDragLeave(e) {
        this.classList.remove('over');
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        // Don't do anything if dropping on the same item
        if (dragSrcEl !== this) {
            // Get the IDs of the source and target participants
            const srcId = dragSrcEl.getAttribute('data-id');
            const targetId = this.getAttribute('data-id');
            
            // Emit event to server to reorder participants
            socket.emit('reorderParticipants', {
                srcId: srcId,
                targetId: targetId
            });
        }
        
        return false;
    }

    function handleDragEnd(e) {
        this.style.opacity = '1';
        
        // Remove all drag-related classes
        document.querySelectorAll('.participant-item').forEach(item => {
            item.classList.remove('over', 'potential-drop-target');
        });
    }

    function updateRolesList(roles) {
        rolesList.innerHTML = '';
        
        roles.forEach((role, index) => {
            const roleTag = document.createElement('div');
            roleTag.className = 'role-tag';
            
            const roleName = document.createElement('span');
            roleName.className = 'role-name';
            roleName.textContent = role;
            roleTag.appendChild(roleName);
            
            // Don't allow removing the Driver role (first role)
            if (index > 0) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-role-btn';
                removeBtn.innerHTML = '×';
                removeBtn.title = 'Remove role';
                removeBtn.addEventListener('click', () => {
                    const updatedRoles = sessionData.roles.filter(r => r !== role);
                    socket.emit('updateRoles', updatedRoles);
                });
                roleTag.appendChild(removeBtn);
            }
            
            rolesList.appendChild(roleTag);
        });
    }

    // Handle browser back/forward navigation
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.sessionId) {
            // We navigated back to a session page
            const sessionId = event.state.sessionId;
            const username = getStoredUsername(sessionId);
            
            if (username) {
                joinSession(sessionId, username);
            } else {
                showUsernameModal(sessionId);
            }
        } else {
            // We navigated back to the home page
            sessionInfo.classList.add('hidden');
            joinForm.classList.remove('hidden');
        }
    });

    // Function to show username change modal
    function showChangeUsernameModal() {
        // Create modal elements
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const modalTitle = document.createElement('h2');
        modalTitle.textContent = 'Change Your Name';
        
        const modalForm = document.createElement('form');
        modalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newUsername = modalUsernameInput.value.trim();
            if (newUsername) {
                // Update username
                changeUsername(newUsername);
                document.body.removeChild(modalOverlay);
            }
        });
        
        const modalUsernameInput = document.createElement('input');
        modalUsernameInput.type = 'text';
        modalUsernameInput.placeholder = 'New name';
        modalUsernameInput.required = true;
        
        // Find current user's username
        const currentUser = sessionData.participants.find(p => p.id === socket.id);
        if (currentUser) {
            modalUsernameInput.value = currentUser.username;
        }
        
        const modalSubmitBtn = document.createElement('button');
        modalSubmitBtn.type = 'submit';
        modalSubmitBtn.className = 'btn primary';
        modalSubmitBtn.textContent = 'Update Name';
        
        // Add cancel button
        const modalCancelBtn = document.createElement('button');
        modalCancelBtn.type = 'button';
        modalCancelBtn.className = 'btn secondary';
        modalCancelBtn.textContent = 'Cancel';
        modalCancelBtn.style.marginTop = '10px';
        modalCancelBtn.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
        });
        
        // Assemble modal
        modalForm.appendChild(modalUsernameInput);
        modalForm.appendChild(modalSubmitBtn);
        modalForm.appendChild(modalCancelBtn);
        modalContent.appendChild(modalTitle);
        modalContent.appendChild(modalForm);
        modalOverlay.appendChild(modalContent);
        
        // Add to document
        document.body.appendChild(modalOverlay);
        
        // Focus the input and select all text
        modalUsernameInput.focus();
        modalUsernameInput.select();
    }

    // Function to change username
    function changeUsername(newUsername) {
        // Find current user
        const currentUser = sessionData.participants.find(p => p.id === socket.id);
        if (!currentUser || currentUser.username === newUsername) return;
        
        // Update username in local storage
        storeUsername(sessionData.sessionId, newUsername);
        
        // Send to server
        socket.emit('changeUsername', newUsername);
    }

    // Function to show username change notification
    function showUsernameChangeNotification(oldUsername, newUsername, isSelf) {
        const notificationContainer = document.createElement('div');
        notificationContainer.className = 'username-change-notification';
        
        const message = isSelf 
            ? `You changed your name from <strong>${oldUsername}</strong> to <strong>${newUsername}</strong>`
            : `<strong>${oldUsername}</strong> changed their name to <strong>${newUsername}</strong>`;
        
        notificationContainer.innerHTML = message;
        
        // Add to the session info section
        sessionInfo.insertBefore(notificationContainer, sessionInfo.firstChild);
        
        // Remove after animation completes
        setTimeout(() => {
            if (notificationContainer.parentNode) {
                notificationContainer.parentNode.removeChild(notificationContainer);
            }
        }, 5000);
    }
}); 