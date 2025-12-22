export const clients = {};

export const OnConnection = (socket) => {
    socket.emit('sendIdFromServer', socket.id);
    socket.on('sendUserIdFromClient', function (data) {
        clients[data] = socket;
        console.log("User connected:",data);
    });
    socket.on('disconnect', () => {
        const clientId = Object.keys(clients).find((id) => clients[id].id === socket.id);
        if (clientId) {
            delete clients[clientId];
              console.log(`User disconnected: ${clientId}`);
        }
    });
};
