import { clients } from './OnSocket.js';

export const ReqNotification = (userId) => {
    if (clients[userId]) {
        clients[userId].emit('reqNotification', '');
    }
};

export const ReqNotificationMany = (userIds) => {
    userIds.forEach(userId => {
        if (clients[userId]) {
            clients[userId].emit('reqNotification', '');
        }
    });
};

export const ReqMessageNew = (userId) => {
    if (clients[userId]) {
        clients[userId].emit('reqMessageNew', '');
    }
};

export const ReqMessageShopNew = (userId) => {
    if (clients[userId]) {
        clients[userId].emit('reqMessageShopNew', '');
    }
};
export const ReqWalletNew = (userId) => {
    if (clients[userId]) {
        clients[userId].emit('reqWalletNew', '');
    }
};
