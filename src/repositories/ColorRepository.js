import BaseRepository from './BaseRepository.js';

class ColorRepository extends BaseRepository {
    modelName = 'Color';

    constructor() {
        super();
        this.db = this.prisma.color;
    }

}

export default new ColorRepository();
