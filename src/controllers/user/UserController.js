import httpStatus from 'http-status';
import nodemailer from 'nodemailer';
import md5 from 'md5';
import { isAuth } from '../../middleware/auth.middleware.js';
import UserService from '../../services/ctv/UserService.js';
import UserRepository from '../../repositories/UserRepository.js';
import {
    publicUploadFile,
    publicUploadFileTemporary,
    publicUploadMultiFile,
} from '../../middleware/upload.middleware.js';
import NotificationRepository from '../../repositories/NotificationRepository.js';
import OrderService from '../../services/OrderService.js';
import OrderDetailService from '../../services/OrderDetailService.js';

class UserController {
    initRoutes(app) {
        app.get('/user/get-role', isAuth, this.getRole);
        app.get('/user/get-user', isAuth, this.getUser);
        app.post('/user/logout', isAuth, this.logout);
        app.post('/user/update-user-info', isAuth, this.updateUserInfo);
        app.post('/user/update-image', isAuth, this.updateImage);
        app.post('/user/update-default-address', isAuth, this.updateDefaultAddress);
        app.post('/user/change-password', isAuth, this.changePassword);
        app.post('/user/change-password-2fa', isAuth, this.changePassword_2fa);
        app.post('/user/handle-order', isAuth, this.handleOrder);
        app.post('/user/edit-order', isAuth, this.editOrder);
        app.get('/user/cancel-order/:orderId', isAuth, this.cancelProcessingOrder);

        app.get('/user/get-notification', isAuth, this.getNotificationByUser);
        app.get('/user/read-notification/:notificationId', isAuth, this.handleReadNotification);
        app.get('/user/get-orders-by-ctv/:userId/:month/:year', isAuth, this.findAllOrderByCTV);
        app.post('/user/post/orderDetail-by-order', isAuth, this.findOrderDetailMany);
        app.get('/user/get/orderDetail/:orderId', isAuth, this.findOrderDetail);
        app.get('/user/get/ctvList', isAuth, this.getCTVList);
    }
    async getCTVList(req, res) {
        try {
            const ctvList = await UserService.getCTVList();
            if (ctvList) {
                return res.status(httpStatus.OK).json({ message: 'Success', ctvList });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async changePassword(req, res) {
        try {
            const resChangePassword = await UserService.changePassword(req);
            if (resChangePassword == 'Fail') {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            } else if (resChangePassword == 'Incorrect password') {
                return res.status(httpStatus.OK).json({ message: 'Incorrect password' });
            } else {
                const fiveMinutesFromNow = new Date(new Date().getTime() + 5 * 60 * 1000);
                const randomOTP = Math.floor(100000 + Math.random() * 900000);
                await UserRepository.update(req.user.id, { code: randomOTP, codeExpiry: fiveMinutesFromNow });
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'chauthuanphat10@gmail.com',
                        pass: process.env.GGP,
                    },
                });
                const mailOptions = {
                    from: 'chauthuanphat10@gmail.com',
                    to: req.body.email,
                    subject: 'Your OTP ',
                    text: String(randomOTP),
                };
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
                    } else {
                        return res.status(200).json({ message: 'Email sent successfully' });
                    }
                });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async changePassword_2fa(req, res) {
        try {
            const resChangePassword2Fa = await UserService.changePassword_2fa(req);
            if (resChangePassword2Fa == 'Code expiry') {
                return res.status(httpStatus.OK).json({ message: 'Code expiry' });
            } else if (resChangePassword2Fa == 'Fail') {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Success', user: resChangePassword2Fa });
            }
        } catch (e) {
            console.error(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async updateDefaultAddress(req, res) {
        try {
            const resUpdate = await UserRepository.update(req.user.id, { defaultAddressId: req.body.addressId });
            if (resUpdate) {
                const resUser = await UserService.getUser(req.user.email);
                if (resUser != 'Fail') {
                    return res.status(httpStatus.OK).json({ message: 'Success', user: resUser });
                } else {
                    return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
                }
            } else {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async updateImage(req, res) {
        try {
            publicUploadFile(req, res, async function (err) {
                if (err) {
                    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Fail' });
                }
                if (req.file) {
                    req.body.image = req.file.path.slice(req.file.path.indexOf('uploads'));
                }
                const resUser = await UserRepository.update(req.user.id, { image: req.body.image });
                return res.status(httpStatus.OK).json({ message: 'Success', user: resUser });
            });
        } catch {
            return res.status(httpStatus.OK).json({ message: 'Success', user: resUser });
        }
    }
    async updateUserInfo(req, res) {
        const resUser = await UserService.updateUserInfo(req);
        if (resUser == 'Fail') {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        } else {
            return res.status(httpStatus.OK).json({ message: 'Success', user: resUser });
        }
    }
    async logout(req, res) {
        try {
            await UserRepository.update(req.user.id, { refreshToken: '' });
            return res.status(httpStatus.OK).json({ message: 'Success' });
        } catch (e) {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async getRole(req, res) {
        try {
            return res.status(httpStatus.OK).json({ message: 'Success', role: req.user.role });
        } catch (e) {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Get role fail' });
        }
    }
    async getUser(req, res) {
        try {
            const user = await UserService.getUser(req.user.email);
            if (user == 'Fail') {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
            return res.status(httpStatus.OK).json({ message: 'Success', user });
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async handleOrder(req, res) {
        try {
            publicUploadMultiFile(req, res, async function (err) {
                if (err) {
                    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Upload Fail', error: err });
                }

                if (req.files) {
                    req.body.noteImageList = req.files.map((file) => file.path.slice(file.path.indexOf('uploads')));
                }

                const {
                    userId,
                    ctvName,
                    ctvNote,
                    customerName,
                    customerPhone,
                    addressDetail,
                    address,
                    shipMethod,
                    paid,
                    CODPrice,
                    shipFee,
                    listOrderDetail,
                } = req.body;
                const orders = await UserService.handleOrder({
                    userId,
                    ctvName,
                    ctvNote,
                    customerName,
                    customerPhone,
                    addressDetail,
                    address: address ? JSON.parse(address) : null,
                    shipMethod,
                    paid: paid === 'true',
                    CODPrice: parseFloat(CODPrice),
                    shipFee: parseFloat(shipFee),
                    listOrderDetail: JSON.parse(listOrderDetail),
                    noteImageList: req.body.noteImageList ? req.body.noteImageList : [],
                });
                if (orders != 'Fail') {
                    return res.status(httpStatus.OK).json({ message: 'Success', orders });
                } else {
                    return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
    }
    async editOrder(req, res) {
        try {
            publicUploadMultiFile(req, res, async function (err) {
                if (err) {
                    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Upload Fail', error: err });
                }

                if (req.body.oldNoteImageList) {
                    req.body.oldNoteImageList = JSON.parse(req.body.oldNoteImageList);
                } else {
                    req.body.oldNoteImageList = [];
                }
                const newImagePaths = req.files.map((file) => file.path.slice(file.path.indexOf('uploads')));
                req.body.noteImageList = [...req.body.oldNoteImageList, ...newImagePaths];
                req.body.address = req.body.address ? JSON.parse(req.body.address) : null;
                req.body.paid = req.paid === 'true';
                req.body.CODPrice = parseFloat(req.body.CODPrice);
                req.body.shipFee = parseFloat(req.body.shipFee);

                const order = await OrderService.saveOrder(req);

                if (order != 'Fail') {
                    return res.status(httpStatus.OK).json({ message: 'Success', order });
                } else {
                    return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
    }
    async cancelProcessingOrder(req, res) {
        try {
            const orderId = req.params.orderId;
            const userId = req.user.id;
            const orderRes = await OrderService.cancelProcessingOrder(orderId, userId);
            if (orderRes != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success' });
            } else {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
        } catch (error) {
            console.error(error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
    }
    async getNotificationByUser(req, res) {
        try {
            const userId = req.user.id;
            const notifications = await UserService.getNotificationByUser(userId);
            if (notifications) {
                return res.status(httpStatus.OK).json({ message: 'Success', notifications });
            } else {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
        } catch (e) {
            console.error(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async handleReadNotification(req, res) {
        try {
            const notificationId = req.params.notificationId;
            const notification = await NotificationRepository.find(notificationId);
            if (notification.userId != req.user.id) {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
            const notification_new = await NotificationRepository.update(notificationId, { status: 'SEEN' });
            if (notification_new) {
                return res.status(httpStatus.OK).json({ message: 'Success' });
            } else {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
        } catch (e) {
            console.error(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async findAllOrderByCTV(req, res) {
        try {
            const userId = req.params.userId;
            const month = parseInt(req.params.month);
            const year = parseInt(req.params.year);
            const orders = await OrderService.getAllOrderByCTV(userId, month, year);
            if (orders) {
                return res.status(httpStatus.OK).json({ message: 'Success', orders });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }
    async findOrderDetailMany(req, res) {
        try {
            const orderDetailIdList = req.body.orderDetailIdList;
            const orderDetails = await OrderDetailService.getOrderDetailByListId(orderDetailIdList);
            if (orderDetails) {
                return res.status(httpStatus.OK).json({ message: 'Success', orderDetails });
            } else {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async findOrderDetail(req, res) {
        try {
            const orderId = req.params.orderId;
            const order = await OrderService.getOrderById(orderId);
            const orderDetails = await OrderDetailService.getOrderDetailByOrderId(orderId);
            if (order && orderDetails) {
                return res.status(httpStatus.OK).json({ message: 'Success', order, orderDetails });
            } else {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
}
export default new UserController();
