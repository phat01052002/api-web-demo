import BaseRepository from './BaseRepository.js';

class AnnouncementRepository extends BaseRepository {
    modelName = 'Announcement';

    constructor() {
        super();
        this.db = this.prisma.announcement;
    }
}

export default new AnnouncementRepository();
