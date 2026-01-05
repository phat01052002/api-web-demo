import BaseRepository from './BaseRepository.js';

class DiscountRepository extends BaseRepository {
    modelName = 'Discount';

    constructor() {
        super();
        this.db = this.prisma.discount;
    }

    async findDiscountById(discountId) {
        const currentDate = new Date();
        // const discount = await this.db.findFirst({ where: { id: discountId, expired: { gte: currentDate } } });
        const discount = await this.db.findFirst({ where: { id: discountId } });

        if (discount) {
            return { id: discount.id, name: discount.name, percent: discount.percent };
        } else {
            return null;
        }
    }

    async findDiscountMany(req) {
        const discounts = await this.db.findMany({
            where: {
                id: {
                    in: req.body.discountIdList,
                },
            },
            select: {
                id: true,
                name: true,
                percent: true,
            },
        });
        return discounts;
    }

    async findDiscountsByShop(shopId) {
        return this.db.findMany({
            where: {
                shopId: shopId,
            },
        });
    }
}

export default new DiscountRepository();