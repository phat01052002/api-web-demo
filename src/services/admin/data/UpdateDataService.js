import { ReqNotification } from '../../../controllers/socket/EmitSocket.js';
import CategoryRepository from '../../../repositories/CategoryRepository.js';
import NotificationRepository from '../../../repositories/NotificationRepository.js';
import OrderDetailRepository from '../../../repositories/OrderDetailRepository.js';
import OrderRepository from '../../../repositories/OrderRepository.js';
import ProductDetailRepository from '../../../repositories/ProductDetailRepository.js';
import ProductRepository from '../../../repositories/ProductRepository.js';
import UserRepository from '../../../repositories/UserRepository.js';

class UpdateDataService {
    async saveProduct(req) {
        try {
            const product = await ProductRepository.saveUpload(req);
            return {
                message: 'Success',
                product: product,
            };
        } catch (e) {
            return {
                message: 'Fail',
                product: null,
            };
        }
    }
    async saveProductDetail(req) {
        try {
            const producDetail = await ProductDetailRepository.saveUpload(req);
            return {
                message: 'Success',
                producDetail: producDetail,
            };
        } catch (e) {
            return {
                message: 'Fail',
                producDetail: null,
            };
        }
    }
    async updateCategory(req) {
        try {
            await CategoryRepository.saveUpload(req);
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }
    async rejectRefundReportOrder(req) {
        try {
            const report = await ReportOrderDetailRepository.saveUpload(req);
            await ReportOrderDetailRepository.db.update({
                where: {
                    id: report.id,
                },
                data: {
                    checkByAdmin: true,
                },
            });
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }
    async confirmedOrder(orderId) {
        try {
            const order = await OrderRepository.find(orderId);
            const user = await UserRepository.find(order.userId);

            if (order.status === 'PROCESSING') {
                // Cập nhật trạng thái đơn hàng
                const updatedOrder = await OrderRepository.update(orderId, {
                    status: 'CONFIRMED',
                    updateDate: new Date(),
                });

                if (updatedOrder) {
                    // Tạo thông báo cho người dùng
                    const notification = await NotificationRepository.db.create({
                        data: {
                            describe: `Đã xác nhận đơn hàng ${order.id}, đơn hàng đang chờ vận chuyển.`,
                            image: 'OrderConfirmed',
                            link: `/user/order/confirmed`,
                            userId: order.userId,
                        },
                    });

                    if (notification) {
                        // Cập nhật danh sách thông báo của người dùng
                        await UserRepository.update(order.userId, {
                            notificationIdList: [...user.notificationIdList, notification.id],
                        });

                        // Gửi thông báo đến người dùng
                        ReqNotification(order.userId);

                        return updatedOrder; // Trả về đơn hàng đã cập nhật
                    } else {
                        return 'Fail';
                    }
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
    async deliverOrder(orderId) {
        try {
            const order = await OrderRepository.find(orderId);
            const user = await UserRepository.find(order.userId);

            // Kiểm tra xem đơn hàng có đang trong trạng thái PROCESSING không
            if (order.status === 'CONFIRMED') {
                // Cập nhật trạng thái đơn hàng
                const updatedOrder = await OrderRepository.update(orderId, {
                    status: 'DELIVERING',
                    updateDate: new Date(),
                });

                if (updatedOrder) {
                    // Tạo thông báo cho người dùng
                    const notification = await NotificationRepository.db.create({
                        data: {
                            describe: `Đơn hàng ${order.id} đang được vận chuyển.`,
                            image: 'OrderDelivering',
                            link: `/user/order/delivering`, // Link đến chi tiết đơn hàng
                            userId: order.userId,
                        },
                    });

                    if (notification) {
                        // Cập nhật danh sách thông báo của người dùng
                        await UserRepository.update(order.userId, {
                            notificationIdList: [...user.notificationIdList, notification.id],
                        });

                        // Gửi thông báo đến người dùng
                        ReqNotification(order.userId);

                        return updatedOrder; // Trả về đơn hàng đã cập nhật
                    } else {
                        return 'Fail';
                    }
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
    async completedOrder(orderId) {
        try {
            const order = await OrderRepository.find(orderId);
            const user = await UserRepository.find(order.userId);
            const shop = await ShopRepository.find(order.shopId);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: {
                    orderId: order.id,
                },
            });
            const walletShop = await WalletRepository.db.findMany({
                where: {
                    userId: shop.userId,
                },
            });

            if (order.status === 'DELIVERING') {
                let totalAmount = 0;
                for (const detail of orderDetails) {
                    await ProductDetailRepository.db.update({
                        where: {
                            id: detail.productDetailId,
                        },
                        data: {
                            numberSold: {
                                increment: detail.quantity,
                            },
                        },
                    });
                    const itemTotal = (detail.price - detail.discountPrice) * detail.quantity;
                    totalAmount += itemTotal;
                }

                const pointsUser = Math.floor(
                    (totalAmount - order.priceMember - order.priceVoucher + order.priceShip) / 1000,
                );
                const lockedBalance = (totalAmount * 95) / 100 - order.priceVoucher;
                if (order.paid) {
                    await WalletRepository.db.update({
                        where: {
                            id: walletShop[0].id,
                        },
                        data: {
                            balance: walletShop[0].balance + lockedBalance,
                            lockedBalance: walletShop[0].lockedBalance - lockedBalance,
                        },
                    });
                } else {
                    await WalletRepository.db.update({
                        where: {
                            id: walletShop[0].id,
                        },
                        data: {
                            balance: walletShop[0].balance + lockedBalance,
                        },
                    });
                    await TransactionRepository.db.create({
                        data: {
                            walletId: walletShop[0].id,
                            value: lockedBalance,
                            describe: 'transfer',
                            to: walletShop[0].id,
                            from: '/',
                        },
                    });
                }

                const updatedOrder = await OrderRepository.update(orderId, {
                    status: 'PROCESSED',
                    updateDate: new Date(),
                    paid: true,
                });

                if (updatedOrder) {
                    const notification = await NotificationRepository.db.create({
                        data: {
                            describe: `Đơn hàng ${order.id} đã được giao thành công`,
                            image: 'OrderDelivered',
                            link: `/user/order/processed`,
                            userId: order.userId,
                        },
                    });

                    if (notification) {
                        await UserRepository.update(order.userId, {
                            notificationIdList: [...user.notificationIdList, notification.id],
                            point: user.point + pointsUser,
                        });

                        ReqNotification(order.userId);

                        return updatedOrder;
                    } else {
                        return 'Fail';
                    }
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
    async refundOrder(reportOrderId) {
        try {
            const reportOrder = await ReportOrderDetailRepository.find(reportOrderId);
            const [user, orderDetailofReport] = await Promise.all([
                UserRepository.find(reportOrder.userId),
                OrderDetailRepository.find(reportOrder.orderDetailId),
            ]);
            const order = await OrderRepository.find(orderDetailofReport.orderId);
            const shop = await ShopRepository.find(order.shopId);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: {
                    orderId: order.id,
                },
            });
            const [walletUser, walletShop] = await Promise.all([
                WalletRepository.db.findMany({ where: { userId: user.id } }),
                WalletRepository.db.findMany({ where: { userId: shop.userId } }),
            ]);

            let refundAmount =
                (orderDetailofReport.price - orderDetailofReport.discountPrice) * orderDetailofReport.quantity;
            const effectivePoints = Math.min(user.point, 3000);
            const refundPriceMember = refundAmount * Math.trunc(effectivePoints / 1000) * 0.01;
            if (order) {
                let totalAmount = 0;

                orderDetails.forEach((detail) => {
                    const itemTotal = (detail.price - detail.discountPrice) * detail.quantity;
                    totalAmount += itemTotal;
                });
                const pureTotalAmount = totalAmount;
                totalAmount -= order.priceMember || 0;
                totalAmount -= order.priceVoucher || 0;
                const pointsUser = Math.floor(
                    (pureTotalAmount - order.priceMember - order.priceVoucher + order.priceShip) / 1000,
                );
                const lockedBalance = (pureTotalAmount * 95) / 100 - order.priceVoucher;
                let voucherReduce = 0;
                ////
                if (reportOrder.describe == 'Sản phẩm không đúng') {
                    const notification = await NotificationRepository.db.create({
                        data: {
                            describe: `Vui lòng mang sản phẩm của đơn hàng ${reportOrder.orderDetailId} đến địa điểm sau ... để hoàn trả`,
                            image: 'OrderReturn',
                            link: `/user/order/return`,
                            userId: user.id,
                        },
                    });
                    await ReportOrderDetailRepository.update(reportOrderId, {
                        check: true,
                    });
                    await ProductDetailRepository.db.update({
                        where: {
                            id: orderDetailofReport.productDetailId,
                        },
                        data: {
                            numberSold: {
                                decrement: orderDetailofReport.quantity,
                            },
                        },
                    });
                    if (notification) {
                        await UserRepository.update(user.id, {
                            notificationIdList: [...user.notificationIdList, notification.id],
                            point: user.point - Math.floor((refundAmount - refundPriceMember - voucherReduce) / 1000),
                        });

                        ReqNotification(order.userId);

                        return 'Success';
                    } else {
                        return 'Fail';
                    }
                }

                ////
                if (walletShop[0].balance < refundAmount) {
                    return 'Not enough money';
                }
                if (!order.isOnline) {
                    let notification;
                    if (order.orderDetailIdList.length == 1) {
                        await Promise.all([
                            ProductDetailRepository.db.update({
                                where: {
                                    id: orderDetailofReport.productDetailId,
                                },
                                data: {
                                    numberSold: {
                                        decrement: orderDetailofReport.quantity,
                                    },
                                },
                            }),
                            WalletRepository.db.update({
                                where: { id: walletShop[0].id },
                                data: { balance: walletShop[0].balance - lockedBalance },
                            }),
                            TransactionRepository.db.create({
                                data: {
                                    walletId: walletShop[0].id,
                                    value: lockedBalance,
                                    describe: 'to refund',
                                    to: walletUser[0].id,
                                    from: walletShop[0].id,
                                },
                            }),
                            OrderRepository.delete(order.id),
                            OrderDetailRepository.delete(orderDetailofReport.id),
                        ]);
                        notification = await NotificationRepository.db.create({
                            data: {
                                describe: `Một sản phẩm đã được hủy`,
                                image: 'OrderNotReceived',
                                link: `/user/order/received`,
                                userId: user.id,
                            },
                        });
                    } else {
                        if (order.voucherId) {
                            const voucher = await VoucherRepository.find(order.voucherId);
                            if (voucher.condition > pureTotalAmount - refundAmount) {
                                voucherReduce = voucher.reduce;
                                await OrderRepository.update(order.id, {
                                    updateDate: new Date(),
                                    priceVoucher: 0,
                                    voucherId: null,
                                });
                                const voucherUsedIdList = user.voucherUsedIdList.filter((id) => id !== voucher.id);
                                await Promise.all([
                                    UserRepository.update(user.id, {
                                        voucherUsedIdList: voucherUsedIdList,
                                    }),
                                    VoucherRepository.update(voucher.id, { quantity: voucher.quantity + 1 }),
                                ]);
                            }
                        }
                        await OrderRepository.update(order.id, {
                            updateDate: new Date(),
                            priceMember: order.priceMember - refundPriceMember,
                        });
                        await Promise.all([
                            ProductDetailRepository.db.update({
                                where: {
                                    id: orderDetailofReport.productDetailId,
                                },
                                data: {
                                    numberSold: {
                                        decrement: orderDetailofReport.quantity,
                                    },
                                },
                            }),
                            WalletRepository.db.update({
                                where: { id: walletUser[0].id },
                                data: {
                                    balance: walletUser[0].balance + refundAmount - refundPriceMember - voucherReduce,
                                },
                            }),
                            WalletRepository.db.update({
                                where: { id: walletShop[0].id },
                                data: {
                                    balance: walletShop[0].balance - (refundAmount * 95) / 100 + voucherReduce,
                                },
                            }),
                            TransactionRepository.db.create({
                                data: {
                                    walletId: walletUser[0].id,
                                    value: refundAmount - voucherReduce - refundPriceMember,
                                    describe: 'refund',
                                    to: walletUser[0].id,
                                    from: walletShop[0].id,
                                },
                            }),
                            TransactionRepository.db.create({
                                data: {
                                    walletId: walletShop[0].id,
                                    value: (refundAmount * 95) / 100 - voucherReduce,
                                    describe: 'to refund',
                                    to: walletUser[0].id,
                                    from: walletShop[0].id,
                                },
                            }),
                        ]);
                        notification = await NotificationRepository.db.create({
                            data: {
                                describe: `Một sản phẩm đã được hoản trả, kiểm tra lại ví`,
                                image: 'OrderNotReceived',
                                link: `/user/order/received`,
                                userId: user.id,
                            },
                        });
                        const orderDetailIdList = order.orderDetailIdList.filter((id) => id !== orderDetailofReport.id);
                        await OrderRepository.update(order.id, {
                            updateDate: new Date(),
                            orderDetailIdList: orderDetailIdList,
                        });
                        await OrderDetailRepository.delete(orderDetailofReport.id);
                    }
                    if (notification) {
                        await UserRepository.update(user.id, {
                            notificationIdList: [...user.notificationIdList, notification.id],
                            point: user.point - Math.floor((refundAmount - refundPriceMember - voucherReduce) / 1000),
                        });

                        ReqNotification(order.userId);

                        return 'Success';
                    } else {
                        return 'Fail';
                    }
                }
                /////
                if (order.orderDetailIdList.length == 1) {
                    await Promise.all([
                        ProductDetailRepository.db.update({
                            where: {
                                id: orderDetailofReport.productDetailId,
                            },
                            data: {
                                numberSold: {
                                    decrement: orderDetailofReport.quantity,
                                },
                            },
                        }),
                        WalletRepository.db.update({
                            where: { id: walletUser[0].id },
                            data: { balance: walletUser[0].balance + totalAmount + order.priceShip },
                        }),
                        WalletRepository.db.update({
                            where: { id: walletShop[0].id },
                            data: { balance: walletShop[0].balance - lockedBalance },
                        }),
                        TransactionRepository.db.create({
                            data: {
                                walletId: walletUser[0].id,
                                value: totalAmount + order.priceShip,
                                describe: 'refund',
                                to: walletUser[0].id,
                                from: walletShop[0].id,
                            },
                        }),
                        TransactionRepository.db.create({
                            data: {
                                walletId: walletShop[0].id,
                                value: lockedBalance,
                                describe: 'to refund',
                                to: walletUser[0].id,
                                from: walletShop[0].id,
                            },
                        }),
                        OrderRepository.delete(order.id),
                        OrderDetailRepository.delete(orderDetailofReport.id),
                    ]);
                } else {
                    if (order.voucherId) {
                        const voucher = await VoucherRepository.find(order.voucherId);
                        if (voucher.condition > pureTotalAmount - refundAmount) {
                            voucherReduce = voucher.reduce;
                            await OrderRepository.update(order.id, {
                                updateDate: new Date(),
                                priceVoucher: 0,
                                voucherId: null,
                            });
                            const voucherUsedIdList = user.voucherUsedIdList.filter((id) => id !== voucher.id);
                            await Promise.all([
                                UserRepository.update(user.id, {
                                    voucherUsedIdList: voucherUsedIdList,
                                }),
                                VoucherRepository.update(voucher.id, { quantity: voucher.quantity + 1 }),
                            ]);
                        }
                    }
                    await OrderRepository.update(order.id, {
                        updateDate: new Date(),
                        priceMember: order.priceMember - refundPriceMember,
                    });
                    await Promise.all([
                        ProductDetailRepository.db.update({
                            where: {
                                id: orderDetailofReport.productDetailId,
                            },
                            data: {
                                numberSold: {
                                    decrement: orderDetailofReport.quantity,
                                },
                            },
                        }),
                        WalletRepository.db.update({
                            where: { id: walletUser[0].id },
                            data: { balance: walletUser[0].balance + refundAmount - refundPriceMember - voucherReduce },
                        }),
                        WalletRepository.db.update({
                            where: { id: walletShop[0].id },
                            data: { balance: walletShop[0].balance - (refundAmount * 95) / 100 + voucherReduce },
                        }),
                        TransactionRepository.db.create({
                            data: {
                                walletId: walletUser[0].id,
                                value: refundAmount - refundPriceMember - voucherReduce,
                                describe: 'refund',
                                to: walletUser[0].id,
                                from: walletShop[0].id,
                            },
                        }),
                        TransactionRepository.db.create({
                            data: {
                                walletId: walletShop[0].id,
                                value: (refundAmount * 95) / 100 - voucherReduce,
                                describe: 'to refund',
                                to: walletUser[0].id,
                                from: walletShop[0].id,
                            },
                        }),
                    ]);
                    const orderDetailIdList = order.orderDetailIdList.filter((id) => id !== orderDetailofReport.id);
                    await OrderRepository.update(order.id, {
                        updateDate: new Date(),
                        orderDetailIdList: orderDetailIdList,
                    });
                    await OrderDetailRepository.delete(orderDetailofReport.id);
                }
                const notification = await NotificationRepository.db.create({
                    data: {
                        describe: `Một đơn hàng đã được hoàn trả, kiểm tra lại ví`,
                        image: 'OrderRefunded',
                        link: `/user/order/refunded`,
                        userId: user.id,
                    },
                });
                if (notification) {
                    await UserRepository.update(user.id, {
                        notificationIdList: [...user.notificationIdList, notification.id],
                        point: user.point - Math.floor((refundAmount - refundPriceMember - voucherReduce) / 1000),
                    });

                    ReqNotification(order.userId);

                    return 'Success';
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
    async refundOrderByAdmin(reportOrderId) {
        try {
            const reportOrder = await ReportOrderDetailRepository.find(reportOrderId);
            const [user, orderDetailofReport] = await Promise.all([
                UserRepository.find(reportOrder.userId),
                OrderDetailRepository.find(reportOrder.orderDetailId),
            ]);
            const order = await OrderRepository.find(orderDetailofReport.orderId);
            const shop = await ShopRepository.find(order.shopId);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: {
                    orderId: order.id,
                },
            });
            const [walletUser] = await Promise.all([WalletRepository.db.findMany({ where: { userId: user.id } })]);

            let refundAmount =
                (orderDetailofReport.price - orderDetailofReport.discountPrice) * orderDetailofReport.quantity;
            const effectivePoints = Math.min(user.point, 3000);
            const refundPriceMember = refundAmount * Math.trunc(effectivePoints / 1000) * 0.01;
            await ReportOrderDetailRepository.update(reportOrderId, {
                check: true,
            });
            if (order) {
                let totalAmount = 0;

                orderDetails.forEach((detail) => {
                    const itemTotal = (detail.price - detail.discountPrice) * detail.quantity;
                    totalAmount += itemTotal;
                });
                const pureTotalAmount = totalAmount;
                totalAmount -= order.priceMember || 0;
                totalAmount -= order.priceVoucher || 0;
                const pointsUser = Math.floor((refundAmount - refundPriceMember) / 1000);
                const lockedBalance = (pureTotalAmount * 95) / 100 - order.priceVoucher;
                let voucherReduce = 0;
                ////
                if (reportOrder.describe == 'Sản phẩm không đúng') {
                    const notification = await NotificationRepository.db.create({
                        data: {
                            describe: `Vui lòng mang sản phẩm của đơn hàng ${reportOrder.orderDetailId} đến địa điểm sau ... để hoàn trả`,
                            image: 'OrderReturn',
                            link: `/user/order/return`,
                            userId: user.id,
                        },
                    });

                    await ProductDetailRepository.db.update({
                        where: {
                            id: orderDetailofReport.productDetailId,
                        },
                        data: {
                            numberSold: {
                                decrement: orderDetailofReport.quantity,
                            },
                        },
                    });
                    if (notification) {
                        await UserRepository.update(user.id, {
                            notificationIdList: [...user.notificationIdList, notification.id],
                            point: user.point - Math.floor((refundAmount - refundPriceMember) / 1000),
                        });

                        ReqNotification(order.userId);

                        return 'Success';
                    } else {
                        return 'Fail';
                    }
                }

                if (!order.isOnline) {
                    let notification;
                    if (order.orderDetailIdList.length == 1) {
                        await Promise.all([
                            ProductDetailRepository.db.update({
                                where: {
                                    id: orderDetailofReport.productDetailId,
                                },
                                data: {
                                    numberSold: {
                                        decrement: orderDetailofReport.quantity,
                                    },
                                },
                            }),
                            OrderRepository.delete(order.id),
                            OrderDetailRepository.delete(orderDetailofReport.id),
                        ]);
                        notification = await NotificationRepository.db.create({
                            data: {
                                describe: `Một sản phẩm đã được hủy`,
                                image: 'OrderNotReceived',
                                link: `/user/order/received`,
                                userId: user.id,
                            },
                        });
                    } else {
                        if (order.voucherId) {
                            const voucher = await VoucherRepository.find(order.voucherId);
                            if (voucher.condition > pureTotalAmount - refundAmount) {
                                voucherReduce = voucher.reduce;
                                await OrderRepository.update(order.id, {
                                    updateDate: new Date(),
                                    priceVoucher: 0,
                                    voucherId: null,
                                });
                                const voucherUsedIdList = user.voucherUsedIdList.filter((id) => id !== voucher.id);
                                await Promise.all([
                                    UserRepository.update(user.id, {
                                        voucherUsedIdList: voucherUsedIdList,
                                    }),
                                    VoucherRepository.update(voucher.id, { quantity: voucher.quantity + 1 }),
                                ]);
                            }
                        }
                        await OrderRepository.update(order.id, {
                            updateDate: new Date(),
                            priceMember: order.priceMember - refundPriceMember,
                        });
                        await Promise.all([
                            ProductDetailRepository.db.update({
                                where: {
                                    id: orderDetailofReport.productDetailId,
                                },
                                data: {
                                    numberSold: {
                                        decrement: orderDetailofReport.quantity,
                                    },
                                },
                            }),
                            WalletRepository.db.update({
                                where: { id: walletUser[0].id },
                                data: {
                                    balance: walletUser[0].balance + refundAmount - refundPriceMember - voucherReduce,
                                },
                            }),

                            TransactionRepository.db.create({
                                data: {
                                    walletId: walletUser[0].id,
                                    value: refundAmount - voucherReduce - refundPriceMember,
                                    describe: 'refund',
                                    to: walletUser[0].id,
                                    from: '/',
                                },
                            }),
                        ]);
                        notification = await NotificationRepository.db.create({
                            data: {
                                describe: `Một sản phẩm đã được hoản trả, kiểm tra lại ví`,
                                image: 'OrderNotReceived',
                                link: `/user/order/received`,
                                userId: user.id,
                            },
                        });
                        const orderDetailIdList = order.orderDetailIdList.filter((id) => id !== orderDetailofReport.id);
                        await OrderRepository.update(order.id, {
                            updateDate: new Date(),
                            orderDetailIdList: orderDetailIdList,
                        });
                        await OrderDetailRepository.delete(orderDetailofReport.id);
                    }
                    if (notification) {
                        await UserRepository.update(user.id, {
                            notificationIdList: [...user.notificationIdList, notification.id],
                            point: user.point - Math.floor((refundAmount - refundPriceMember - voucherReduce) / 1000),
                        });

                        ReqNotification(order.userId);

                        return 'Success';
                    } else {
                        return 'Fail';
                    }
                }
                /////
                if (order.orderDetailIdList.length == 1) {
                    await Promise.all([
                        ProductDetailRepository.db.update({
                            where: {
                                id: orderDetailofReport.productDetailId,
                            },
                            data: {
                                numberSold: {
                                    decrement: orderDetailofReport.quantity,
                                },
                            },
                        }),
                        WalletRepository.db.update({
                            where: { id: walletUser[0].id },
                            data: { balance: walletUser[0].balance + totalAmount + order.priceShip },
                        }),

                        TransactionRepository.db.create({
                            data: {
                                walletId: walletUser[0].id,
                                value: totalAmount + order.priceShip,
                                describe: 'refund',
                                to: walletUser[0].id,
                                from: '/',
                            },
                        }),

                        OrderRepository.delete(order.id),
                        OrderDetailRepository.delete(orderDetailofReport.id),
                    ]);
                } else {
                    if (order.voucherId) {
                        const voucher = await VoucherRepository.find(order.voucherId);
                        if (voucher.condition > pureTotalAmount - refundAmount) {
                            voucherReduce = voucher.reduce;
                            await OrderRepository.update(order.id, {
                                updateDate: new Date(),
                                priceVoucher: 0,
                                voucherId: null,
                            });
                            const voucherUsedIdList = user.voucherUsedIdList.filter((id) => id !== voucher.id);
                            await Promise.all([
                                UserRepository.update(user.id, {
                                    voucherUsedIdList: voucherUsedIdList,
                                }),
                                VoucherRepository.update(voucher.id, { quantity: voucher.quantity + 1 }),
                            ]);
                        }
                    }
                    await OrderRepository.update(order.id, {
                        updateDate: new Date(),
                        priceMember: order.priceMember - refundPriceMember,
                    });
                    await Promise.all([
                        ProductDetailRepository.db.update({
                            where: {
                                id: orderDetailofReport.productDetailId,
                            },
                            data: {
                                numberSold: {
                                    decrement: orderDetailofReport.quantity,
                                },
                            },
                        }),
                        WalletRepository.db.update({
                            where: { id: walletUser[0].id },
                            data: { balance: walletUser[0].balance + refundAmount - refundPriceMember - voucherReduce },
                        }),

                        TransactionRepository.db.create({
                            data: {
                                walletId: walletUser[0].id,
                                value: refundAmount - refundPriceMember - voucherReduce,
                                describe: 'refund',
                                to: walletUser[0].id,
                                from: '/',
                            },
                        }),
                    ]);
                    const orderDetailIdList = order.orderDetailIdList.filter((id) => id !== orderDetailofReport.id);
                    await OrderRepository.update(order.id, {
                        updateDate: new Date(),
                        orderDetailIdList: orderDetailIdList,
                    });
                    await OrderDetailRepository.delete(orderDetailofReport.id);
                }
                const notification = await NotificationRepository.db.create({
                    data: {
                        describe: `Một đơn hàng đã được hoàn trả, kiểm tra lại ví`,
                        image: 'OrderRefunded',
                        link: `/user/order/refunded`,
                        userId: user.id,
                    },
                });
                if (notification) {
                    await UserRepository.update(user.id, {
                        notificationIdList: [...user.notificationIdList, notification.id],
                        point: user.point - Math.floor((refundAmount - refundPriceMember - voucherReduce) / 1000),
                    });

                    ReqNotification(order.userId);

                    return 'Success';
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
    
    async requestExplainReportProduct(reportProductId, productName) {
        try {
            const report = await ReportProductRepository.find(reportProductId);
            const product = await ProductRepository.find(report.productId)
            const shop = await ShopRepository.find(product.shopId)
            const user = await UserRepository.find(shop.userId)
            const notification = await NotificationRepository.db.create({
                data: {
                    describe: `Yêu cầu giải trình báo cáo sản phẩm "${productName}" từ quản trị viên"`,
                    image: '',
                    link: `/shop/reportProduct`,
                    isCTV: true,
                    userId: user.id
                },
            });
            if (notification) {

                await UserRepository.update(user.id, {
                    notificationIdList: [...user.notificationIdList, notification.id],
                });

                ReqNotification(user.id);

                return 'Success'
            } else {

                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async rejectReportOrder(reportOrderId) {
        try {
            const reportOrderDetail = await ReportOrderDetailRepository.db.update({
                where: {
                    id: reportOrderId,
                },
                data: {
                    check: true,
                },
            });
            if (reportOrderDetail) return 'Success';
            return 'Fail';
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async checkReportOrder(reportOrderId) {
        try {
            const reportOrderDetail = await ReportOrderDetailRepository.db.update({
                where: {
                    id: reportOrderId,
                },
                data: {
                    checkByAdmin: true,
                },
            });
            if (reportOrderDetail) return 'Success';
            return 'Fail';
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async checkReportProduct(id, shopReason) {
        try {
            const reportProductDetail = await ReportProductRepository.db.update({
                where: {
                    id: id,
                },
                data: {
                    check: true,
                    shopReason: shopReason,
                },
            });
            if (reportProductDetail) return 'Success';
            return 'Fail';
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async updateVoucher({ id, name, code, reduce, condition, quantity, expired, shopId }) {
        const updatedVoucher = await VoucherRepository.db.update({
            where: { id },
            data: {
                name,
                code,
                reduce,
                condition,
                quantity,
                expired: new Date(expired),
                shopId,
            },
        });
        return updatedVoucher;
    }
    async updateShopInfo({ id, name, phone, address, describe }) {
        const updatedShop = await ShopRepository.db.update({
            where: { id },
            data: {
                name,
                describeShop: describe,
                addressShop: address,
                phoneShop: phone,
            },
        });
        return updatedShop;
    }
    async updateDiscount({ id, name, percent, productDetailId, shopId, productId }) {
        const product = await ProductRepository.db.findUnique({
            where: { id: productId },
        });
        const productDetailIdList = product.productCIdList;

        const count = await ProductDetailRepository.db.count({
            where: {
                id: {
                    in: productDetailIdList,
                },
                discountId: id,
            },
        });
        if (count > 1) {
            const newDiscount = await DiscountRepository.db.create({
                data: {
                    name,
                    percent,
                    shopId,
                },
            });
            await ProductDetailRepository.db.update({
                where: {
                    id: productDetailId,
                },
                data: {
                    discountId: newDiscount.id,
                },
            });
            if (product.percentDiscountTop < newDiscount.percent)
                await ProductRepository.db.update({
                    where: { id: productId },
                    data: {
                        percentDiscountTop: newDiscount.percent,
                    },
                });
            return newDiscount;
        }
        const updatedDiscount = await DiscountRepository.db.update({
            where: { id },
            data: {
                name,
                percent,
                shopId,
            },
        });
        if (product.percentDiscountTop < updatedDiscount.percent)
            await ProductRepository.db.update({
                where: { id: productId },
                data: {
                    percentDiscountTop: updatedDiscount.percent,
                },
            });
        return updatedDiscount;
    }
}
export default new UpdateDataService();
