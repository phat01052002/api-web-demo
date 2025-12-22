import { SHIPMETHOD } from '@prisma/client';
import BaseRepository from './BaseRepository.js';
import OrderDetailRepository from './OrderDetailRepository.js';
import CommissionRepository from './CommissionRepository.js';

class OrderRepository extends BaseRepository {
    modelName = 'Orders';

    constructor() {
        super();
        this.db = this.prisma.orders;
        this.dbOrderDetail = this.prisma.orderDetail;
        this.defaultSelect = {
            id: true,
            address: true,
            addressDetail: true,
            paid: true,
            orderDetailIdList: true,
            ctvName: true,
            ctvNote: true,
            shipMethod: true,
            orderCode: true,
            noteImageList: true,
            commission: true,
            customerName: true,
            customerPhone: true,
            CODPrice: true,
            shipFee: true,
            userId: true,
            status: true,
            updateDate: true,
            createDate: true,
            deliveryCode: true,
            adminNote: true,
            isReturn: true,
        };
    }

    async findOrderMany(req) {
        const orders = await this.db.findMany({
            where: {
                id: {
                    in: req.body.listOrderId,
                },
                userId: req.user.id,
            },
            orderBy: {
                createDate: 'desc',
            },
            select: this.defaultSelect,
        });
        return orders;
    }
    async findOrderByShop(shopId) {
        const orders = await this.db.findMany({
            where: {
                shopId: shopId,
            },
            orderBy: {
                createDate: 'desc',
            },
            select: this.defaultSelect,
        });
        return orders;
    }
    async findNewOrderByStep(take, step, shipMethod) {
        const orders = await this.db.findMany({
            where: {
                status: 'PROCESSING',
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
            },

            take: parseInt(take),
            skip: (step - 1) * take,
            orderBy: {
                updateDate: 'desc',
            },
            select: this.defaultSelect,
        });
        return orders;
    }

    async findAllNewOrderByCTVName(ctvName, take, step, shipMethod) {
        const orders = await this.db.findMany({
            where: {
                status: 'PROCESSING',
                ctvName: ctvName,
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
            },
            orderBy: {
                createDate: 'desc',
            },
            select: this.defaultSelect,
            take: parseInt(take),
            skip: (step - 1) * take,
        });

        const count = await this.db.count({
            where: {
                status: 'PROCESSING',

                ctvName: ctvName,
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
            },
        });
        return { orders, count };
    }
    async findAllOrderByStep(take, step, status, shipMethod) {
        const orders = await this.db.findMany({
            where: {
                status: {
                    not: 'PROCESSING',
                },
                ...(status && status !== 'ALL' ? { status } : {}),
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
            },
            take: parseInt(take),
            skip: (step - 1) * take,
            orderBy: {
                createDate: 'desc',
            },
            select: this.defaultSelect,
        });
        return orders;
    }

    async findAllReturnOrderByStep(take, step, status, shipMethod, isReturn) {
        const orders = await this.db.findMany({
            where: {
                OR: [
                    {
                        status: {
                            in: ['BOOM', 'CANCEL'],
                        },
                    },
                    {
                        shipMethod: 'GGDH',
                    },
                ],
                ...(status && status !== 'ALL' ? { status } : {}),
                ...(isReturn && isReturn !== 'ALL'
                    ? isReturn === 'true'
                        ? { isReturn: true }
                        : { isReturn: false }
                    : {}),
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
            },
            take: parseInt(take),
            skip: (step - 1) * take,
            orderBy: {
                createDate: 'desc',
            },
            select: this.defaultSelect,
        });
        return orders;
    }

    async findAllReturnOrderByCTVName(ctvName, take, step, status, shipMethod, isReturn) {
        const orders = await this.db.findMany({
            where: {
                OR: [
                    {
                        status: {
                            in: ['BOOM', 'CANCEL'],
                        },
                    },
                    {
                        shipMethod: 'GGDH',
                    },
                ],
                ctvName: ctvName,
                ...(status && status !== 'ALL' ? { status } : {}),
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
                ...(isReturn && isReturn !== 'ALL'
                    ? isReturn === 'true'
                        ? { isReturn: true }
                        : { isReturn: false }
                    : {}),
            },
            orderBy: {
                createDate: 'desc',
            },
            select: this.defaultSelect,
            take: parseInt(take),
            skip: (step - 1) * take,
        });

        const count = await this.db.count({
            where: {
                OR: [
                    {
                        status: {
                            in: ['BOOM', 'CANCEL'],
                        },
                    },
                    {
                        shipMethod: 'GGDH',
                    },
                ],
                ctvName: ctvName,
                ...(status && status !== 'ALL' ? { status } : {}),
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
                ...(isReturn && isReturn !== 'ALL'
                    ? isReturn === 'true'
                        ? { isReturn: true }
                        : { isReturn: false }
                    : {}),
            },
        });
        return { orders, count };
    }
    async getOrderCount() {
        const count = await this.db.count({
            where: {
                status: {
                    not: 'PROCESSING',
                },
            },
        });
        return count;
    }

    async getOrderCountInMonth(month, year, status, shipMethod) {
        const startOfMonth = new Date(year, month - 1, 0, 23, 59, 59);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);
        const count = await this.db.count({
            where: {
                createDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
                ...(status && status !== 'ALL' ? { status } : {}),
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
            },
        });
        return count;
    }

    async findAllOrderByMonth(month, year, take, step, status, shipMethod) {
        const startOfMonth = new Date(year, month - 1, 0, 23, 59, 59);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        const orders = await this.db.findMany({
            where: {
                createDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
                ...(status && status !== 'ALL' ? { status } : {}),
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
            },

            take: parseInt(take),
            skip: (step - 1) * take,
            orderBy: {
                createDate: 'desc',
            },
            select: this.defaultSelect,
        });
        return orders;
    }

    async findAllOrderByCTVName(ctvName, take, step, status, shipMethod) {
        const orders = await this.db.findMany({
            where: {
                ctvName: ctvName,
                ...(status && status !== 'ALL' ? { status } : {}),
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
            },
            orderBy: {
                createDate: 'desc',
            },
            select: this.defaultSelect,
            take: parseInt(take),
            skip: (step - 1) * take,
        });

        const count = await this.db.count({
            where: {
                ctvName: ctvName,
                ...(status && status !== 'ALL' ? { status } : {}),
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
            },
        });
        return { orders, count };
    }

    async findAllOrderByCTVNameInMonth(ctvName, month, year, take, step, status, shipMethod) {
        const startOfMonth = new Date(year, month - 1, 0, 23, 59, 59);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        const orders = await this.db.findMany({
            where: {
                ctvName: ctvName,
                createDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
                ...(status && status !== 'ALL' ? { status } : {}),
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
            },
            orderBy: {
                createDate: 'desc',
            },
            select: this.defaultSelect,
            take: parseInt(take),
            skip: (step - 1) * take,
        });

        const count = await this.db.count({
            where: {
                ctvName: ctvName,
                createDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
                ...(status && status !== 'ALL' ? { status } : {}),
                ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
            },
        });
        return { orders, count };
    }

    async findAllOrderByCTV(userId, month, year) {
        const startOfMonth = new Date(year, month - 1, 0, 23, 59, 59);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        const orders = await this.db.findMany({
            where: {
                userId: userId,
                createDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            orderBy: {
                createDate: 'desc',
            },
            select: this.defaultSelect,
        });
        return orders;
    }

    async getRevenueAndCommissionByMonth(month, year) {
        const startOfMonth = new Date(year, month - 1, 0, 23, 59, 59);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        const result = {
            revenue: 0,
            commission: 0,
            bonus: 0,
            quantity: 0,
        };

        const successfulOrders = await this.db.findMany({
            where: {
                status: 'SUCCESS',
                shipMethod: { not: 'GGDH' },
                createDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
        });

        const orderDetailIds = successfulOrders.flatMap((order) => order.orderDetailIdList);

        const orderDetails = await OrderDetailRepository.db.findMany({
            where: {
                id: { in: orderDetailIds },
            },
        });

        orderDetails.forEach((detail) => {
            const revenueFromDetail = (detail.ctvPrice - detail.importPrice) * detail.quantity;
            result.revenue += revenueFromDetail;
        });

        const commissions = await CommissionRepository.db.findMany({
            where: {
                month: month,
                year: year,
            },
            select: {
                commission: true,
                bonus: true,
                quantity: true,
            },
        });

        commissions.forEach((comm) => {
            result.commission += comm.commission || 0;
            result.bonus += comm.bonus || 0;
            result.quantity += comm.quantity || 0;
        });

        return result;
    }

    async getRevenueAndCommissionByCtvNameAndMonth(month, year, ctvName) {
        const startOfMonth = new Date(year, month - 1, 0, 23, 59, 59);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        const result = {
            revenue: 0,
            commission: 0,
            bonus: 0,
            quantity: 0,
        };

        const successfulOrders = await this.db.findMany({
            where: {
                ctvName: ctvName,
                status: 'SUCCESS',
                shipMethod: { not: 'GGDH' },
                createDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
        });

        const orderDetailIds = successfulOrders.flatMap((order) => order.orderDetailIdList);

        const orderDetails = await OrderDetailRepository.db.findMany({
            where: {
                id: { in: orderDetailIds },
            },
        });

        orderDetails.forEach((detail) => {
            const revenueFromDetail = (detail.ctvPrice - detail.importPrice) * detail.quantity;
            result.revenue += revenueFromDetail;
        });

        const commissions = await CommissionRepository.db.findMany({
            where: {
                ctvName: ctvName,
                month: month,
                year: year,
            },
            select: {
                commission: true,
                bonus: true,
                quantity: true,
            },
        });

        commissions.forEach((comm) => {
            result.commission += comm.commission || 0;
            result.bonus += comm.bonus || 0;
            result.quantity += comm.quantity || 0;
        });

        return result;
    }

    async orderCountByMonth(month, year) {
        const startOfMonth = new Date(year, month - 1, 0, 23, 59, 59);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        const orderCounts = {
            SUCCESS: 0,
            CANCEL: 0,
            BOOM: 0,
            PROCESSING: 0,
        };

        const orders = await this.db.findMany({
            where: {
                createDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            select: {
                status: true,
            },
        });

        orders.forEach((order) => {
            if (orderCounts.hasOwnProperty(order.status)) {
                orderCounts[order.status]++;
            }
        });

        return orderCounts;
    }

    async getAnnualRevenue(year) {
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);

        const successOrders = await this.db.findMany({
            where: {
                status: 'SUCCESS',
                shipMethod: { not: 'GGDH' },
                createDate: {
                    gte: startOfYear,
                    lte: endOfYear,
                },
            },
        });

        const orderDetailIds = successOrders.flatMap((order) => order.orderDetailIdList);

        const orderDetails = await OrderDetailRepository.db.findMany({
            where: {
                id: { in: orderDetailIds },
            },
        });

        const revenueData = Array(12).fill(0);

        successOrders.forEach((order) => {
            const orderDate = new Date(order.createDate);
            const orderMonth = orderDate.getMonth(); // 0-11

            orderDetails.forEach((detail) => {
                if (order.orderDetailIdList.includes(detail.id)) {
                    const revenueFromDetail = (detail.ctvPrice - detail.importPrice) * detail.quantity;
                    revenueData[orderMonth] += revenueFromDetail;
                }
            });
        });

        const result = revenueData.map((revenue, index) => ({
            month: index + 1,
            revenue: revenue,
        }));

        return result;
    }

    async getPriceOrder(orderId) {
        const order = await this.find(orderId);
        if (order) {
            const orderDetails = await this.dbOrderDetail.findMany({ where: { id: { in: order.orderDetailIdList } } });
            if (orderDetails.length > 0) {
                return orderDetails.reduce((accumulator, current) => {
                    if (current.discountPrice) {
                        return accumulator + (current.price - current.discountPrice) * current.quantity;
                    } else {
                        return accumulator + current.price * current.quantity;
                    }
                }, 0);
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    }
}

export default new OrderRepository();
