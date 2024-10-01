'use strict';

// WebRTC signaling server (Node.js backend)
const socket = io('https://suited-working-barnacle.ngrok-free.app/');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const createBtn = document.getElementById('create-btn');
const joinBtn = document.getElementById('join-btn');
const roomInput = document.getElementById('room-input');
const statusMessage = document.getElementById('status-message');
const toggleVideoBtn = document.getElementById('toggle-video');
const toggleAudioBtn = document.getElementById('toggle-audio');
const streamLingoBtn = document.getElementById('stream-lingo-btn');
const audioInputSelect = document.getElementById('audio-input');
const audioOutputSelect = document.getElementById('audio-output');
const videoInputSelect = document.getElementById('video-input');

let localStream;
let peerConnection;
let audioContext, audioWorkletNode, audioSocket;
let isStreamLingoEnabled = false;
let remoteMicEnabled = true;
const config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// Get media devices
async function getMediaDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `${device.kind} ${audioInputSelect.length + 1}`;
        if (device.kind === 'audioinput') {
            audioInputSelect.appendChild(option);
        } else if (device.kind === 'audiooutput') {
            audioOutputSelect.appendChild(option);
        } else if (device.kind === 'videoinput') {
            videoInputSelect.appendChild(option);
        }
    });
}

// Function to get the media devices (audio and video)
async function getMedia(constraints = { video: true, audio: true }) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideo.srcObject = localStream;
        setupWebRTC(localStream);
        setupAudioProcessing(localStream);
    } catch (error) {
        alert('Could not access camera and microphone. Please check permissions.');
    }
}

getMediaDevices();
getMedia();

// Handle room creation
createBtn.addEventListener('click', () => {
    const room = roomInput.value.trim();
    if (room) {
        statusMessage.textContent = 'Creating room...';
        socket.emit('create or join', room);
    } else {
        alert('Please enter a room name.');
    }
});

// Handle joining a room
joinBtn.addEventListener('click', () => {
    const room = roomInput.value.trim();
    if (room) {
        statusMessage.textContent = 'Joining room...';
        socket.emit('create or join', room);
    } else {
        alert('Please enter a room name.');
    }
});

// Handle toggle video
toggleVideoBtn.addEventListener('click', () => {
    localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
    });
});

// Handle toggle audio
toggleAudioBtn.addEventListener('click', () => {
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
    });
});

// Enable or disable StreamLingo
streamLingoBtn.addEventListener('click', () => {
    isStreamLingoEnabled = !isStreamLingoEnabled;
    streamLingoBtn.textContent = isStreamLingoEnabled ? 'Disable StreamLingo' : 'Enable StreamLingo';
    if (isStreamLingoEnabled) {
        setupAudioProcessing(localStream, true);
        toggleRemoteMic(false); // Disable the remote mic when StreamLingo is enabled
    } else {
        if (audioSocket) {
            audioSocket.close();
        }
        toggleRemoteMic(true); // Re-enable the remote mic when StreamLingo is disabled
    }
});

// WebSocket messages for signaling
socket.on('message', async (message) => {
    if (message.type === 'offer') {
        await handleOffer(message);
    } else if (message.type === 'answer') {
        await handleAnswer(message);
    } else if (message.type === 'candidate') {
        await handleCandidate(message);
    } else if (message.type === 'translatedSpeech') {
        if (!isStreamLingoEnabled) {
            playTranslatedSpeech(message.audioData); // Play translated speech only for the remote client
        }
    }
});

socket.on('created', (room) => {
    statusMessage.textContent = `Created room ${room}. Waiting for others to join...`;
});

socket.on('joined', (room) => {
    createPeerConnection();
    createOffer();
});

socket.on('ready', () => {
    if (!peerConnection) {
        createPeerConnection();
        createOffer();
    }
});

socket.on('full', (room) => {
    statusMessage.textContent = '';
    alert(`Room ${room} is full. Unable to join.`);
});

socket.on('peerDisconnected', () => {
    remoteVideo.srcObject = null;
    statusMessage.textContent = 'Peer disconnected.';
});

// Function to create peer connection for WebRTC
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
        if (localVideo.srcObject && remoteVideo.srcObject) {
            statusMessage.textContent = 'Joined. Connected to peer.';
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('message', { type: 'candidate', candidate: event.candidate });
        }
    };

    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
            if (localVideo.srcObject && remoteVideo.srcObject) {
                statusMessage.textContent = 'Connected.';
            }
        } else if (peerConnection.connectionState === 'disconnected') {
            statusMessage.textContent = 'Disconnected.';
            remoteVideo.srcObject = null;
        }
    };
}

// Function to handle WebRTC offer
async function createOffer() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('message', { type: 'offer', sdp: offer.sdp });
}

// Function to handle WebRTC answer
async function handleAnswer(message) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
}

// Function to handle ICE candidates
async function handleCandidate(message) {
    try {
        await peerConnection.addIceCandidate(message.candidate);
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
}

// Function to handle WebRTC offer
async function handleOffer(message) {
    if (!peerConnection) {
        createPeerConnection();
    }
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('message', { type: 'answer', sdp: answer.sdp });
}

// Function to setup audio processing
function setupAudioProcessing(stream, enableTranslation = false) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    if (enableTranslation) {
        audioContext.audioWorklet.addModule('audio-processor.js').then(() => {
            audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-processor');
            audioWorkletNode.port.onmessage = (event) => {
                if (audioSocket.readyState === WebSocket.OPEN) {
                    audioSocket.send(event.data); // Send audio chunks to backend
                }
            };

            audioSocket = new WebSocket('ws://localhost:8000');
            audioSocket.binaryType = 'arraybuffer';

            audioSocket.onopen = () => {
                console.log('Connected to Python backend for S2S translation.');
            };

            const audioSource = audioContext.createMediaStreamSource(stream);
            audioSource.connect(audioWorkletNode);
            audioWorkletNode.connect(audioContext.destination);

            audioSocket.onmessage = (event) => {
                // Send translated speech to the remote client via signaling server
                socket.emit('message', { type: 'translatedSpeech', audioData: event.data });
            };

            audioSocket.onclose = () => {
                console.log('Disconnected From the Server');
            };
        });
    } else {
        if (audioSocket) {
            audioSocket.close();
        }
    }
}

// Function to play translated speech using Web Audio API (for remote clients only)
function playTranslatedSpeech(audioData) {
    const arrayBuffer = new Uint8Array(audioData).buffer;
    audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
    }, (error) => {
        console.error('Error decoding translated speech audio:', error);
    });
}

// Function to toggle the remote client's microphone
function toggleRemoteMic(enable) {
    socket.emit('toggleRemoteMic', enable);
}

// Listen for toggleRemoteMic request and toggle remote client's mic
socket.on('toggleRemoteMic', (enable) => {
    remoteMicEnabled = enable;
    localStream.getAudioTracks().forEach(track => {
        track.enabled = remoteMicEnabled;
    });
});
