'use strict';
const http = require('http');
const socketIO = require('socket.io');

const app = http.createServer().listen(3000);
const io = socketIO(app, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  
  // Handle incoming messages from clients
  socket.on('message', (message) => {
    // Check for the translated speech message type
    if (message.type === 'translatedSpeech') {
      // Send translated speech to all clients in the room except the sender
      socket.to(socket.room).emit('message', message);
    } else {
      // For other message types, send to all clients in the room except the sender
      socket.to(socket.room).emit('message', message);
    }
  });

  // Handle creating or joining a room
  socket.on('create or join', (room) => {
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    const numClients = clientsInRoom ? clientsInRoom.size : 0;

    if (numClients === 0) {
      socket.join(room);
      socket.room = room;
      socket.emit('created', room, socket.id);
    } else if (numClients === 1) {
      socket.join(room);
      socket.room = room;
      socket.emit('joined', room, socket.id);
      io.to(room).emit('ready'); 
    } else { 
      socket.emit('full', room);
    }
  });

  // Handle toggling the remote client's mic on or off
  socket.on('toggleRemoteMic', (enable) => {
    // Emit to all other clients in the room to toggle their mic
    socket.to(socket.room).emit('toggleRemoteMic', enable);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    if (socket.room) {
      socket.leave(socket.room);
      socket.to(socket.room).emit('peerDisconnected');
    }
  });
});

