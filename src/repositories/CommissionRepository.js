import BaseRepository from './BaseRepository.js';

class CommissionRepository extends BaseRepository {
    modelName = 'Commission';

    constructor() {
        super();
        this.db = this.prisma.commission;
    }

    async findByMonthAndYear(month, year) {
        const commissions = await this.db.findMany({
            where: {
                month: month,
                year: year,
            },
        });
        return commissions;
    }
}

export default new CommissionRepository();
