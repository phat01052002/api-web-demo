import BaseRepository from "./BaseRepository.js";

class CategoryRepository extends BaseRepository {
    modelName = 'Category';

    constructor() {
        super();
        this.db = this.prisma.category;
    }

    async findManyCategory(categoryIdClIST) {
        
        return this.db.findMany({ where: { id: { in: categoryIdClIST } } });
    }
}

export default new CategoryRepository();
