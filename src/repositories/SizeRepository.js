import BaseRepository from './BaseRepository.js';

class SizeRepository extends BaseRepository {
    modelName = 'Size';

    constructor() {
        super();
        this.db = this.prisma.size;
    }

}

export default new SizeRepository();
