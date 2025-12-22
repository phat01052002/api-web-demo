import BaseRepository from './BaseRepository.js';

class TypeRepository extends BaseRepository {
    modelName = 'Type';

    constructor() {
        super();
        this.db = this.prisma.type;
    }

}

export default new TypeRepository();
