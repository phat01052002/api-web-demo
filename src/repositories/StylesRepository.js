import BaseRepository from './BaseRepository.js';

class StylesRepository extends BaseRepository {
    modelName = 'Styles';

    constructor() {
        super();
        this.db = this.prisma.styles;
    }

}

export default new StylesRepository();
