import BaseRepository from './BaseRepository.js';

class NotificationRepository extends BaseRepository {
    modelName = 'Notification';

    constructor() {
        super();
        this.db = this.prisma.notification;
    }

    async getNotificationByUser(req, limit, skip) {
        return this.db.findMany({
            where: {
                userId: req.user.id,
                isCTV: false,
            },
            orderBy: {
                createDate: 'desc',
            },
            take: (skip + 1) * limit,
            skip: skip * limit,
        });
    }
    async getNotificationByUserisCTV(userId) {
        return this.db.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                createDate: 'desc',
            },
        });
    }
}

export default new NotificationRepository();
