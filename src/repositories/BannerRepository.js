import BaseRepository from './BaseRepository.js';

class BannerRepository extends BaseRepository {
    modelName = 'Banner';

    constructor() {
        super();
        this.db = this.prisma.banner;
    }
}

export default new BannerRepository();
