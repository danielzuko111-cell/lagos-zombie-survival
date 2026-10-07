const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const players = {};

io.on('connection', (socket) => {
    socket.on('joinWorld', (data) => {
        players[socket.id] = {
            id: socket.id,
            x: data.x || 0,
            z: data.z || 0,
            gender: data.gender || 'male',
            rotation: 0
        };
        socket.emit('currentPlayers', players);
        socket.broadcast.emit('newPlayer', players[socket.id]);
        io.emit('onlineCount', Object.keys(players).length);
    });

    socket.on('playerMove', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].z = data.z;
            players[socket.id].rotation = data.rotation;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('sendChat', (text) => {
        io.emit('chatMessage', { id: socket.id, text });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
        io.emit('onlineCount', Object.keys(players).length);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
