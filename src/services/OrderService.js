import axios from 'axios';
import { ReqNotification } from '../controllers/socket/EmitSocket.js';
import CommissionRepository from '../repositories/CommissionRepository.js';
import NotificationRepository from '../repositories/NotificationRepository.js';
import OrderDetailRepository from '../repositories/OrderDetailRepository.js';
import OrderRepository from '../repositories/OrderRepository.js';
import UserRepository from '../repositories/UserRepository.js';

class OrderService {
    async calculateBonus(totalQuantity) {
        if (totalQuantity >= 300) return 7000000;
        if (totalQuantity >= 200) return 4000000;
        if (totalQuantity >= 150) return 2500000;
        if (totalQuantity >= 100) return 1500000;
        if (totalQuantity >= 50) return 600000;
        if (totalQuantity >= 30) return 300000;
        return 0;
    }

    async saveOrder(req) {
        try {
            const order = await OrderRepository.saveUpload(req);
            return order;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async getOrderById(orderId) {
        try {
            const order = await OrderRepository.find(orderId);
            return order;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async getNewOrderByStep(take, step, shipMethod) {
        try {
            const orders = await OrderRepository.findNewOrderByStep(take, step, shipMethod);
            const count = await OrderRepository.db.count({
                where: {
                    status: 'PROCESSING',
                    ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
                },
            });
            return { orders, count };
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async getAllNewOrderByCTVName(ctvName, take, step, shipMethod) {
        try {
            const orders = await OrderRepository.findAllNewOrderByCTVName(ctvName, take, step, shipMethod);
            return orders;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async getAllOrderByStep(take, step, status, shipMethod) {
        try {
            const orders = await OrderRepository.findAllOrderByStep(take, step, status, shipMethod);
            const count = await OrderRepository.db.count({
                where: {
                    status: {
                        not: 'PROCESSING',
                    },
                    ...(status && status !== 'ALL' ? { status } : {}),
                    ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
                },
            });
            return {
                orders: orders,
                count: count,
            };
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async getAllOrderByCTVName(ctvName, take, step, status, shipMethod) {
        try {
            const orders = await OrderRepository.findAllOrderByCTVName(ctvName, take, step, status, shipMethod);
            return orders;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async getAllReturnOrderByStep(take, step, status, shipMethod, isReturn) {
        try {
            const orders = await OrderRepository.findAllReturnOrderByStep(take, step, status, shipMethod, isReturn);
            const count = await OrderRepository.db.count({
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
                    ...(shipMethod && shipMethod !== 'ALL' ? { shipMethod } : {}),
                    ...(isReturn && isReturn !== 'ALL'
                        ? isReturn === 'true'
                            ? { isReturn: true }
                            : { isReturn: false }
                        : {}),
                },
            });
            return {
                orders: orders,
                count: count,
            };
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async getAllReturnOrderByCTVName(ctvName, take, step, status, shipMethod, isReturn) {
        try {
            const orders = await OrderRepository.findAllReturnOrderByCTVName(
                ctvName,
                take,
                step,
                status,
                shipMethod,
                isReturn,
            );
            return orders;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async getAllOrderByCTVNameInMonth(ctvName, month, year, take, step, status, shipMethod) {
        try {
            const orders = await OrderRepository.findAllOrderByCTVNameInMonth(
                ctvName,
                month,
                year,
                take,
                step,
                status,
                shipMethod,
            );
            return orders;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async getOrderByPhoneOrDeliveringCode(searchTerm) {
        try {
            const order = await OrderRepository.db.findMany({
                where: {
                    OR: [
                        { deliveryCode: { contains: searchTerm, mode: 'insensitive' } },
                        { customerPhone: { contains: searchTerm, mode: 'insensitive' } },
                    ],
                },
            });
            if (order) {
                return order;
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async getReturnOrderByPhoneOrDeliveringCode(searchTerm) {
        try {
            const order = await OrderRepository.db.findMany({
                where: {
                    status: {
                        in: ['BOOM', 'CANCEL', 'GGDH'],
                    },
                    OR: [
                        { deliveryCode: { contains: searchTerm, mode: 'insensitive' } },
                        { customerPhone: { contains: searchTerm, mode: 'insensitive' } },
                    ],
                },
            });
            if (order) {
                return order;
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async getNewOrderByPhone(searchTerm) {
        try {
            const order = await OrderRepository.db.findMany({
                where: {
                    customerPhone: { contains: searchTerm, mode: 'insensitive' },
                    status: 'PROCESSING',
                },
            });
            if (order) {
                return order;
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async getAllOrderByMonth(month, year, take, step, status, shipMethod) {
        try {
            const orders = await OrderRepository.findAllOrderByMonth(month, year, take, step, status, shipMethod);
            const count = await OrderRepository.getOrderCountInMonth(month, year, status, shipMethod);
            return {
                orders: orders,
                count: count,
            };
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async getAllOrderByCTV(userId, month, year) {
        try {
            const orders = await OrderRepository.findAllOrderByCTV(userId, month, year);
            return orders;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async getRevenueAndCommissionByMonth(month, year) {
        try {
            const revenueAndCommission = await OrderRepository.getRevenueAndCommissionByMonth(month, year);
            return revenueAndCommission;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async getRevenueAndCommissionByCtvNameAndMonth(month, year, ctvName) {
        try {
            const revenueAndCommission = await OrderRepository.getRevenueAndCommissionByCtvNameAndMonth(
                month,
                year,
                ctvName,
            );
            return revenueAndCommission;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async getOrderCountByMonth(month, year) {
        try {
            const orderCounts = await OrderRepository.orderCountByMonth(month, year);
            return orderCounts;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async confirmedOrder(orderId, orderNote) {
        try {
            const order = await OrderRepository.find(orderId);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: {
                    orderId: order.id,
                },
            });
            const commission =
                order.CODPrice -
                order.shipFee -
                orderDetails.reduce((total, detail) => {
                    return total + detail.ctvPrice * detail.quantity;
                }, 0);
            const totalQuantity = orderDetails
                .filter((detail) => !detail.isJibbitz)
                .reduce((sum, detail) => sum + detail.quantity, 0);
            let bonusValue = (await this.calculateBonus(totalQuantity)) || 0;

            if (order.status === 'PROCESSING') {
                // Cập nhật trạng thái đơn hàng
                const updatedOrder = await OrderRepository.update(orderId, {
                    status: 'SUCCESS',
                    updateDate: new Date(),
                    commission: commission,
                    adminNote: orderNote ? orderNote : null,
                });

                if (updatedOrder) {
                    const month = updatedOrder.createDate.getMonth() + 1;
                    const year = updatedOrder.createDate.getFullYear();

                    let commissionRecord = await CommissionRepository.db.findFirst({
                        where: {
                            userId: order.userId,
                            month: month,
                            year: year,
                        },
                    });

                    if (!commissionRecord) {
                        commissionRecord = await CommissionRepository.db.create({
                            data: {
                                userId: order.userId,
                                ctvName: order.ctvName,
                                commission: commission,
                                bonus: bonusValue,
                                quantity: totalQuantity,
                                total: commission,
                                month: month,
                                year: year,
                            },
                        });
                    } else {
                        bonusValue = (await this.calculateBonus(commissionRecord.quantity + totalQuantity)) || 0;

                        commissionRecord = await CommissionRepository.db.update({
                            where: {
                                id: commissionRecord.id,
                            },
                            data: {
                                commission: commissionRecord.commission + commission,
                                total: commission + bonusValue,
                                quantity: commissionRecord.quantity + totalQuantity,
                                bonus: bonusValue,
                            },
                        });
                    }

                    return updatedOrder;
                } else {
                    return 'Fail';
                }
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async boomedOrder(orderId) {
        try {
            const order = await OrderRepository.find(orderId);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: {
                    orderId: order.id,
                },
            });
            const commissionSuccess =
                order.CODPrice -
                order.shipFee -
                orderDetails.reduce((total, detail) => {
                    return total + detail.ctvPrice * detail.quantity;
                }, 0);
            const totalQuantity =
                order.shipMethod === 'GGDH'
                    ? 0
                    : orderDetails
                          .filter((detail) => !detail.isJibbitz)
                          .reduce((sum, detail) => sum + detail.quantity, 0);
            let bonusValue = (await this.calculateBonus(totalQuantity)) || 0;

            let commissionBoom = -60000;
            if (order) {
                if (order.status === 'SUCCESS')
                    commissionBoom =
                        order.shipMethod === 'GGDH'
                            ? commissionBoom - (order.CODPrice - order.shipFee)
                            : commissionBoom - commissionSuccess;
                // Cập nhật trạng thái đơn hàng
                const updatedOrder = await OrderRepository.update(orderId, {
                    status: 'BOOM',
                    updateDate: new Date(),
                    commission: -60000,
                });

                if (updatedOrder) {
                    const month = updatedOrder.createDate.getMonth() + 1;
                    const year = updatedOrder.createDate.getFullYear();

                    let commissionRecord = await CommissionRepository.db.findFirst({
                        where: {
                            userId: order.userId,
                            month: month,
                            year: year,
                        },
                    });

                    if (!commissionRecord) {
                        commissionRecord = await CommissionRepository.db.create({
                            data: {
                                userId: order.userId,
                                ctvName: order.ctvName,
                                commission: commissionBoom,
                                bonus: 0,
                                quantity: 0,
                                total: commissionBoom,
                                month: month,
                                year: year,
                            },
                        });
                    } else {
                        bonusValue = (await this.calculateBonus(commissionRecord.quantity - totalQuantity)) || 0;

                        commissionRecord = await CommissionRepository.db.update({
                            where: {
                                id: commissionRecord.id,
                            },
                            data: {
                                commission: commissionRecord.commission + commissionBoom,
                                total: commissionBoom + bonusValue, 
                                quantity: commissionRecord.quantity - totalQuantity,
                                bonus: bonusValue,
                            },
                        });
                    }
                    return updatedOrder;
                } else {
                    return 'Fail';
                }
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async succeedOrder(orderId) {
        try {
            const order = await OrderRepository.find(orderId);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: {
                    orderId: order.id,
                },
            });
            const commission =
                order.CODPrice -
                order.shipFee -
                orderDetails.reduce((total, detail) => {
                    return total + detail.ctvPrice * detail.quantity;
                }, 0);
            const totalQuantity =
                order.shipMethod === 'GGDH'
                    ? 0
                    : orderDetails
                          .filter((detail) => !detail.isJibbitz)
                          .reduce((sum, detail) => sum + detail.quantity, 0);
            let bonusValue = (await this.calculateBonus(totalQuantity)) || 0;

            let commissionBoom = 0;
            if (order) {
                if (order.status === 'BOOM') commissionBoom = 60000;
                // Cập nhật trạng thái đơn hàng
                const updatedOrder = await OrderRepository.update(orderId, {
                    status: 'SUCCESS',
                    updateDate: new Date(),
                    commission: order.shipMethod === 'GGDH' ? order.CODPrice - order.shipFee : commission,
                });

                if (updatedOrder) {
                    const month = updatedOrder.createDate.getMonth() + 1;
                    const year = updatedOrder.createDate.getFullYear();

                    let commissionRecord = await CommissionRepository.db.findFirst({
                        where: {
                            userId: order.userId,
                            month: month,
                            year: year,
                        },
                    });

                    if (!commissionRecord) {
                        commissionRecord = await CommissionRepository.db.create({
                            data: {
                                userId: order.userId,
                                ctvName: order.ctvName,
                                commission: order.shipMethod === 'GGDH' ? order.CODPrice - order.shipFee : commission,
                                bonus: bonusValue,
                                quantity: totalQuantity,
                                total: order.shipMethod === 'GGDH' ? order.CODPrice - order.shipFee : commission,
                                month: month,
                                year: year,
                            },
                        });
                    } else {
                        bonusValue = (await this.calculateBonus(commissionRecord.quantity + totalQuantity)) || 0;

                        commissionRecord = await CommissionRepository.db.update({
                            where: {
                                id: commissionRecord.id,
                            },
                            data: {
                                commission:
                                    order.shipMethod === 'GGDH'
                                        ? commissionRecord.commission + order.CODPrice - order.shipFee + commissionBoom
                                        : commissionRecord.commission + commission + commissionBoom,
                                total:
                                    order.shipMethod === 'GGDH'
                                        ? commissionRecord.commission + order.CODPrice - order.shipFee + commissionBoom + bonusValue
                                        : commissionRecord.commission + commission + commissionBoom + bonusValue,
                                quantity: commissionRecord.quantity + totalQuantity,
                                bonus: bonusValue,
                            },
                        });
                    }
                    return updatedOrder;
                } else {
                    return 'Fail';
                }
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async cancelledOrder(orderId, cancelReason) {
        try {
            const order = await OrderRepository.find(orderId);
            const user = await UserRepository.find(order.userId);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: {
                    orderId: order.id,
                },
            });

            const commission =
                order.CODPrice -
                order.shipFee -
                orderDetails.reduce((total, detail) => {
                    return total + detail.ctvPrice * detail.quantity;
                }, 0);
            const totalQuantity =
                order.shipMethod === 'GGDH'
                    ? 0
                    : orderDetails
                          .filter((detail) => !detail.isJibbitz)
                          .reduce((sum, detail) => sum + detail.quantity, 0);

            const isSuccessOrder = order.status === 'SUCCESS';
            if (order) {
                const updatedOrder = await OrderRepository.update(orderId, {
                    status: 'CANCEL',
                    updateDate: new Date(),
                    commission: 0,
                    orderDescribe: cancelReason,
                });

                if (updatedOrder) {
                    if (isSuccessOrder) {
                        const month = updatedOrder.createDate.getMonth() + 1;
                        const year = updatedOrder.createDate.getFullYear();

                        let commissionRecord = await CommissionRepository.db.findFirst({
                            where: {
                                userId: order.userId,
                                month: month,
                                year: year,
                            },
                        });

                        if (commissionRecord) {
                            const bonusValue =
                                (await this.calculateBonus(commissionRecord.quantity - totalQuantity)) || 0;

                            commissionRecord = await CommissionRepository.db.update({
                                where: {
                                    id: commissionRecord.id,
                                },
                                data: {
                                    commission:
                                        order.shipMethod === 'GGDH'
                                            ? commissionRecord.commission - (order.CODPrice - order.shipFee)
                                            : commissionRecord.commission - commission,
                                    total:
                                        order.shipMethod === 'GGDH'
                                            ? commissionRecord.commission - (order.CODPrice - order.shipFee) + bonusValue
                                            : commissionRecord.commission - commission + bonusValue,
                                    quantity: commissionRecord.quantity - totalQuantity,
                                    bonus: bonusValue,
                                },
                            });
                        }
                    }
                    const notification = await NotificationRepository.db.create({
                        data: {
                            describe: `Đơn hàng đã bị hủy, mã đơn ${updatedOrder.id}`,
                            image: 'CancelOrder',
                            link: `/orders/cancel`,
                            userId: user.id,
                        },
                    });
                    if (notification) {
                        await UserRepository.update(user.id, {
                            notificationIdList: [...user.notificationIdList, notification.id],
                        });
                        ReqNotification(user.id);
                        return updatedOrder;
                    } else {
                        return 'Fail';
                    }
                } else {
                    return 'Fail';
                }
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async createOrder(orderId, token, orderNote) {
        try {
            const order = await OrderRepository.find(orderId);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: {
                    orderId: order.id,
                },
            });
            const commission =
                order.CODPrice -
                order.shipFee -
                orderDetails.reduce((total, detail) => {
                    return total + detail.ctvPrice * detail.quantity;
                }, 0);
            const commissionDH = order.CODPrice - order.shipFee;
            const totalQuantity =
                order.shipMethod === 'GGDH'
                    ? 0
                    : orderDetails
                          .filter((detail) => !detail.isJibbitz)
                          .reduce((sum, detail) => sum + detail.quantity, 0);
            let bonusValue = (await this.calculateBonus(totalQuantity)) || 0;
            if (order) {
                const orderData = {
                    GROUPADDRESS_ID: 20236399,
                    SENDER_FULLNAME: 'Shop Giày / Crocs',
                    SENDER_PHONE: '0768332739',
                    RECEIVER_FULLNAME: order.customerName,
                    RECEIVER_ADDRESS:
                        order.addressDetail +
                        ', ' +
                        order.address.ward.WARDS_NAME +
                        ', ' +
                        order.address.district.DISTRICT_NAME +
                        ', ' +
                        order.address.province.PROVINCE_NAME,
                    RECEIVER_PHONE: order.customerPhone,
                    PRODUCT_NAME: 'giày dép',
                    PRODUCT_QUANTITY: 1,
                    PRODUCT_PRICE: 999999,
                    PRODUCT_WEIGHT: 250,
                    PRODUCT_TYPE: 'HH',
                    ORDER_PAYMENT: 3,
                    ORDER_SERVICE: 'VSL7',
                    ORDER_SERVICE_ADD: order.shipMethod === 'VIETTELPOST' ? '' : 'GGDH',
                    ORDER_NOTE:
                        'Cho kiểm hàng, không được thử hàng. Có vấn đề đơn hàng lên trạng thái giúp shop. KHÔNG TỰ Ý HOÀN HÀNG VÀ CHO KHÁCH THỬ HÀNG. ( ĐỀN 100%)',
                    MONEY_COLLECTION: order.CODPrice,
                };
                const response = await axios.post('https://partner.viettelpost.vn/v2/order/createOrder', orderData, {
                    headers: {
                        Token: token,
                        'Content-Type': 'application/json',
                    },
                });
                if (response.data.message == 'OK') {
                    const updatedOrder = await OrderRepository.db.update({
                        where: {
                            id: order.id,
                        },
                        data: {
                            status: 'SUCCESS',
                            commission: order.shipMethod === 'GGDH' ? commissionDH : commission,
                            deliveryCode: response.data.data.ORDER_NUMBER,
                            adminNote: orderNote ? orderNote : null,
                        },
                    });
                    if (updatedOrder) {
                        const month = updatedOrder.createDate.getMonth() + 1;
                        const year = updatedOrder.createDate.getFullYear();

                        let commissionRecord = await CommissionRepository.db.findFirst({
                            where: {
                                userId: order.userId,
                                month: month,
                                year: year,
                            },
                        });
                        if (!commissionRecord) {
                            commissionRecord = await CommissionRepository.db.create({
                                data: {
                                    userId: order.userId,
                                    ctvName: order.ctvName,
                                    commission:
                                        order.shipMethod === 'GGDH' ? order.CODPrice - order.shipFee : commission,
                                    bonus: bonusValue,
                                    total: order.shipMethod === 'GGDH' ? order.CODPrice - order.shipFee : commission,
                                    quantity: totalQuantity,
                                    month: month,
                                    year: year,
                                },
                            });
                        } else {
                            bonusValue = (await this.calculateBonus(commissionRecord.quantity + totalQuantity)) || 0;
                            commissionRecord = await CommissionRepository.db.update({
                                where: {
                                    id: commissionRecord.id,
                                },
                                data: {
                                    commission:
                                        order.shipMethod === 'GGDH'
                                            ? commissionRecord.commission + order.CODPrice - order.shipFee
                                            : commissionRecord.commission + commission,
                                    total:
                                        order.shipMethod === 'GGDH'
                                            ? commissionRecord.commission + order.CODPrice - order.shipFee + bonusValue
                                            : commissionRecord.commission + commission + bonusValue,
                                    bonus: bonusValue,
                                    quantity: commissionRecord.quantity + totalQuantity,
                                },
                            });
                        }
                    }
                    return { success: true, data: response.data };
                } else return { success: false };
            } else return { success: false };
        } catch (error) {
            console.error(error.message);
            return { success: false };
        }
    }
    async cancelProcessingOrder(orderId, userId) {
        try {
            const user = await UserRepository.find(userId);
            if (user) {
                user.orderIdList = user.orderIdList.filter((id) => id !== orderId);
                await UserRepository.db.update({
                    where: { id: user.id },
                    data: { orderIdList: user.orderIdList },
                });
            }
            await OrderDetailRepository.db.deleteMany({
                where: {
                    orderId: orderId,
                },
            });
            await OrderRepository.db.delete({
                where: {
                    id: orderId,
                },
            });

            return 'Success';
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async getAnnualRevenue(year) {
        try {
            const revenue = await OrderRepository.getAnnualRevenue(year);
            return revenue;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async getRevenueInMonth(month) {
        try {
            const revenue = await OrderRepository.getRevenueInMonth(month);
            return revenue;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
}
export default new OrderService();
