import ProductRepository from '../../repositories/ProductRepository.js';
import UserRepository from '../../repositories/UserRepository.js';
import OrderDetailRepository from '../../repositories/OrderDetailRepository.js';
import OrderRepository from '../../repositories/OrderRepository.js';
import fs from 'fs';
import md5 from 'md5';
import NotificationRepository from '../../repositories/NotificationRepository.js';
import { socketIo } from '../../index.js';
import { ReqMessageNew, ReqNotification } from '../../controllers/socket/EmitSocket.js';
import path from 'path';
import ProductDetailRepository from '../../repositories/ProductDetailRepository.js';
import CategoryRepository from '../../repositories/CategoryRepository.js';

class UserService {
    /////////////////////////
    userDAO = (user) => {
        return {
            id: user.id,
            phone: user.phone,
            name: user.name,
            image: user.image,
            email: user.email,
            sex: user.sex,
            birthDay: user.birthDay,
            role: user.role,
            rank: user.rank,
            point: user.point,
            orderIdList: user.orderIdList,
            reviewIdList: user.reviewIdList,
            shopFollowIdList: user.shopFollowIdList,
            productFavoriteIdList: user.productFavoriteIdList,
            notificationIdList: user.notificationIdList,
            orderDetailReportIdList: user.orderDetailReportIdList,
            shopReportIdList: user.shopReportIdList,
            productReportIdList: user.productReportIdList,
            voucherIdList: user.voucherIdList,
            voucherUsedIdList: user.voucherUsedIdList,
            shopId: user.shopId,
            walletId: user.walletId,
            active: user.active,
        };
    };

    //////////////////////////
    async changePassword(req) {
        try {
            if (req.user.password == md5(req.body.passwordOld)) {
                return 'Let sent otp';
            } else {
                return 'Incorrect password';
            }
        } catch {
            return 'Fail';
        }
    }
    async changePassword_2fa(req) {
        try {
            const user = await UserRepository.findByEmail(req.user.email);
            if (user.codeExpiry > new Date().getTime()) {
                if (req.body.code == String(user.code)) {
                    const resUpdate = await UserRepository.update(req.user.id, {
                        password: md5(req.body.passwordNew),
                        codeExpiry: new Date(),
                    });
                    if (resUpdate) {
                        return this.userDAO(resUpdate);
                    } else {
                        return 'Fail';
                    }
                }
            } else {
                return 'Code expiry';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async getUser(email) {
        try {
            const user = await UserRepository.findByEmail(email);
            if (user) {
                return this.userDAO(user);
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async getAllUsers() {
        try {
            const users = await UserRepository.findAll();
            if (users) {
                return users;
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async getUserByEmail(email) {
        try {
            const user = await UserRepository.db.findMany({
                where: { email: { contains: email, mode: 'insensitive' } },
            });
            if (user) {
                return user;
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async getCTVNameList() {
        try {
            const users = await UserRepository.db.findMany({
                where: {
                    role: 'CTV',
                },
                select: {
                    name: true,
                },
            });
            if (users) {
                return users;
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async getCTVList() {
        try {
            const users = await UserRepository.db.findMany({
                where: {
                    role: 'CTV',
                },
                select: {
                    name: true,
                    id: true,
                },
            });
            if (users) {
                return users;
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async updateUserInfo(req) {
        try {
            const new_user = await UserRepository.update(req.user.id, req.body);
            return this.userDAO(new_user);
        } catch {
            return 'Fail';
        }
    }

    async handleOrder(orderData) {
        try {
            const { listOrderDetail, ...order } = orderData;

            const [user, admin, subAdmins] = await Promise.all([
                UserRepository.find(order.userId),
                UserRepository.db.findFirst({
                    where: {
                        role: 'ADMIN',
                    },
                }),
                UserRepository.db.findMany({
                    where: {
                        role: 'SUB_ADMIN',
                    },
                }),
            ]);
            const currentDate = new Date();
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

            const orderCountInMonth = await OrderRepository.db.count({
                where: {
                    userId: order.userId,
                    shipMethod: {not: "GGDH"},
                    createDate: {
                        gte: startOfMonth,
                    },
                },
            });

            const lastName = order.ctvName.split(' ').pop();
            let orderCode = `${lastName}_T${month}_${year}_${orderCountInMonth + 1}`;
            if(order.shipMethod === "GGDH")
                orderCode = `${lastName}_T${month}_${year}_DH`;
            if (listOrderDetail.length > 0) {
                order.status = 'PROCESSING';
                order.orderCode = orderCode;
                const orderRes = await OrderRepository.db.create({ data: order });

                if (orderRes) {
                    //
                    const orderIdList_new = [...user.orderIdList, orderRes.id];
                    await UserRepository.update(user.id, { orderIdList: orderIdList_new });
                    //
                    const listOrderDetailId = await Promise.all(
                        listOrderDetail.map(async (orderDetail) => {
                            orderDetail.orderId = orderRes.id;
                            const productDetail = await ProductDetailRepository.find(orderDetail.productDetailId);
                            if (!productDetail) {
                                return 'Fail';
                            }
                            if (productDetail.quantity < orderDetail.quantity) {
                                await OrderRepository.delete(orderRes.id);
                                return 'Fail';
                            }
                            await ProductDetailRepository.update(productDetail.id, {
                                quantity: productDetail.quantity - orderDetail.quantity,
                            });
                            const resOrderDetail = await OrderDetailRepository.db.create({ data: orderDetail });
                            if (resOrderDetail) {
                                return resOrderDetail.id;
                            }
                        }),
                    );
                    const filteredOrderDetailId = listOrderDetailId.filter((id) => id !== null);
                    const orderRes_2 = await OrderRepository.update(orderRes.id, {
                        orderDetailIdList: filteredOrderDetailId,
                    });
                    if (orderRes_2) {
                        const notification = await NotificationRepository.db.create({
                            data: {
                                describe: `Có đơn hàng mới`,
                                image: 'NewOrder',
                                link: `/orders/processing`,
                                userId: admin.id,
                            },
                        });
                        const notificationPromises = subAdmins.map(async (subAdmin) => {
                            const notification = await NotificationRepository.db.create({
                                data: {
                                    describe: `Có đơn hàng mới`,
                                    image: 'NewOrder',
                                    link: `/orders/processing`,
                                    userId: subAdmin.id,
                                },
                            });
                            ReqNotification(subAdmin.id);
                            return notification;
                        });
                        await Promise.all(notificationPromises);
                        if (notification) {
                            await UserRepository.update(admin.id, {
                                notificationIdList: [...admin.notificationIdList, notification.id],
                            });
                            ReqNotification(admin.id);
                            return orderRes_2;
                        } else {
                            return 'Fail';
                        }
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

    async getNotificationByUser(userId) {
        try {
            const notifications = await NotificationRepository.getNotificationByUserisCTV(userId);
            if (notifications) {
                return notifications;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async handleReadNotification(notificationId) {
        try {
            const notification = await NotificationRepository.find(notificationId);
            if (notification) {
                const notification_new = await NotificationRepository.update(notificationId, { status: 'SEEN' });
                if (notification_new) {
                    return res.status(httpStatus.OK).json({ message: 'Success' });
                } else {
                    return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
                }
            } else {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
        } catch (e) {
            console.error(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
}
export default new UserService();
