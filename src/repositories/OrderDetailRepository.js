import BaseRepository from './BaseRepository.js';

class OrderDetailRepository extends BaseRepository {
    modelName = 'OrderDetail';

    constructor() {
        super();
        this.db = this.prisma.orderDetail;
    }

    async findOrderDetailMany(req) {
        const orderDetails = await this.db.findMany({
            where: {
                id: {
                    in: req.body.orderDetailIdList,
                },
            },
        });
        return orderDetails;
    }
    async findOrderDetailByListId(orderDetailIdList) {
        const orderDetails = await this.db.findMany({
            where: {
                id: {
                    in: orderDetailIdList,
                },
            },
        });
        return orderDetails;
    }
}

export default new OrderDetailRepository();
