import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AuthService from '../../services/auth/AuthService.js';
import ProductDetailService from '../../services/ProductDetailService.js';
import ProductService from '../../services/ProductService.js';
import { publicUploadFile, publicUploadMultiFile } from '../../middleware/upload.middleware.js';
import ProductRepository from '../../repositories/ProductRepository.js';
import SizeService from '../../services/SizeService.js';
import TypeService from '../../services/TypeService.js';
import StyleService from '../../services/StyleService.js';
import CategoryService from '../../services/CategoryService.js';
import axios from 'axios';
import OrderService from '../../services/OrderService.js';
import UserService from '../../services/ctv/UserService.js';
import OrderDetailService from '../../services/OrderDetailService.js';
import CommissionService from '../../services/CommissionService.js';
import { isAdmin, isAuth } from '../../middleware/auth.middleware.js';
import AdminService from '../../services/admin/AdminService.js';
import UserRepository from '../../repositories/UserRepository.js';
import ColorService from '../../services/ColorService.js';
import AnnouncementService from '../../services/AnnouncementService.js';
import BannerService from '../../services/BannerService.js';
import OrderRepository from '../../repositories/OrderRepository.js';

class AdminController {
    initRoutes(app) {
        app.post('/admin/add/category', isAuth, this.addCategory);
        app.get('/admin/get/categories', isAuth, this.findAllCategories);
        app.get('/admin/get/products/:take/:step', this.findAllProducts);
        app.post('/admin/add/product', isAuth, this.addProduct);
        app.post('/admin/edit/product', isAuth, this.editProduct);
        app.get('/admin/disable-product/:productId', isAuth, this.disableProduct);
        app.get('/admin/enable-product/:productId', isAuth, this.enableProduct);

        app.get('/admin/get/tokenVTP', isAuth, this.getVTPToken);
        app.post('/admin/createVTPOrder', isAuth, this.createVTPOrder);

        app.post('/admin/add/size', isAuth, this.addSize);
        app.post('/admin/add/color', isAuth, this.addColor);

        app.post('/admin/add/type', isAuth, this.addType);
        app.post('/admin/add/style', isAuth, this.addStyle);

        app.post('/admin/get-new-orders/:take/:step', isAuth, this.findNewOrderByStep);
        app.post('/admin/get-new-orders-by-ctv/:ctvName/:take/:step', isAuth, this.findAllNewOrderByCTV);

        app.post('/admin/get-orders/:take/:step', isAuth, this.findAllOrderByStep);
        app.post('/admin/get-orders-by-ctv/:ctvName/:take/:step', isAuth, this.findAllOrderByCTVName);
        app.post(
            '/admin/search/return-order-by-phone-or-delivering-code',
            isAuth,
            this.findReturnOrderByPhoneOrDeliveringCode,
        );

        app.post('/admin/get-return-orders/:take/:step', isAuth, this.findAllReturnOrderByStep);
        app.post('/admin/get-return-orders-by-ctv/:ctvName/:take/:step', isAuth, this.findAllReturnOrderByCTVName);
        app.get('/admin/update-status-return-order/:orderId', isAuth, this.changeStatusReturnOrder);

        app.post(
            '/admin/get-orders-by-ctv-and-month/:ctvName/:month/:year/:take/:step',
            isAuth,
            this.findAllOrderByCTVNameInMonth,
        );
        app.post('/admin/get-orders-by-month/:month/:year/:take/:step', isAuth, this.findAllOrderByMonth);

        app.post('/admin/post/orderDetail-by-order', isAuth, this.findOrderDetailMany);

        app.post('/admin/update/order-confirmed/:orderId', isAuth, this.confirmedOrder);
        app.get('/admin/update/order-success/:orderId', isAuth, this.succeedOrder);
        app.get('/admin/update/order-boom/:orderId', isAuth, this.boomedOrder);
        app.post('/admin/update/order-cancelled/:orderId', isAuth, this.cancelledOrder);

        app.post('/admin/update/commission-note', isAuth, this.commissionNote);
        app.get('/admin/get/commission-by-month-year/:month/:year', isAuth, this.commissionStatistic);

        app.get('/admin/commission-paid-confirm/:commissionId', isAuth, this.confirmCommissionIsPaid);

        app.get('/admin/get/users', isAuth, this.findAllUsers);
        app.post('/admin/get/user-by-email', isAuth, this.findUserByEmail);
        app.post('/admin/ban-user/:userId', isAuth, isAdmin, this.banUser);
        app.post('/admin/unban-user/:userId', isAuth, isAdmin, this.unBanUser);
        app.post('/admin/confirm-user/:userId', isAuth, isAdmin, this.confirmCTV);

        app.get('/admin/get/ctvNameList', isAuth, this.getCTVNameList);

        app.get('/admin/get/order-count/:month/:year', isAuth, this.getOrderCountsByMonth);
        app.get('/admin/get/revenue-commission/:month/:year', isAuth, this.getRevenueAndCommissionByMonth);
        app.get(
            '/admin/get/revenue-commission-by-ctvName/:ctvName/:month/:year',
            isAuth,
            this.getRevenueAndCommissionByCTVNameAndMonth,
        );

        app.get('/admin/get/annual-revenue/:year', isAuth, this.getAnnualRevenue);

        app.post('/admin/search/order-by-phone-or-delivering-code', isAuth, this.findOrderByPhoneOrDeliveringCode);
        app.post('/admin/search/new-order-by-phone', isAuth, this.findNewOrderByPhone);

        app.post('/admin/search/product-by-name', isAuth, this.findProductByName);
        app.post('/admin/register-sub-admin', isAuth, this.registerSubAdmin);

        app.post('/admin/update/announcement', isAuth, this.saveAnnouncement);
        app.get('/admin/delete/announcement/:announcementId', isAuth, this.deleteAnnouncement);
        app.post('/admin/add/banner', isAuth, this.addBanner);
        app.get('/admin/get/banner/:position', isAuth, this.getBannerByPosition);
        app.get('/admin/delete/banner/:bannerId', isAuth, this.deleteAnnouncement);
        app.get('/admin/delete/category/:categoryId', isAuth, this.deleteCategory);
    }

    async registerSubAdmin(req, res) {
        try {
            const registerRes = await AuthService.registerSubAdmin(req);
            if (registerRes === 'Success') {
                return res.status(httpStatus.OK).json({ message: 'Success' });
            } else if (registerRes == 'Account have already exist') {
                return res.status(httpStatus.OK).json({ message: 'Account have already exist' });
            } else {
                return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Account creation fail ' });
            }
        } catch (e) {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async addProduct(req, res) {
        try {
            publicUploadMultiFile(req, res, async function (err) {
                if (err) {
                    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Upload Fail', error: err });
                }

                if (!req.files || req.files.length === 0) {
                    return res.status(httpStatus.BAD_REQUEST).json({ message: 'At least one image is required' });
                }

                req.body.imageList = req.files.map((file) => file.path.slice(file.path.indexOf('uploads')));
                req.body.image = req.body.imageList[0];

                req.body.sellPrice = Number(req.body.sellPrice);
                req.body.importPrice = Number(req.body.importPrice);
                req.body.virtualPrice = Number(req.body.virtualPrice);
                req.body.ctvPrice = Number(req.body.ctvPrice);

                if (req.body.styleIds) {
                    req.body.styleIds = JSON.parse(req.body.styleIds);
                }

                const resProduct = await ProductService.saveProduct(req);

                if (resProduct.message === 'Fail') {
                    return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
                }
                const selectedSizes = JSON.parse(req.body.selectedSizes);
                const product = resProduct.product;
                const productDetails = selectedSizes.map((size) => ({
                    productId: product.id,
                    sizeId: size.sizeId,
                    colorId: product.colorId,
                    quantity: size.quantity,
                    name: product.name,
                    sellPrice: req.body.sellPrice,
                    virtualPrice: req.body.virtualPrice,
                    ctvPrice: req.body.ctvPrice,
                    importPrice: req.body.importPrice,
                    imageList: req.body.imageList,
                    image: req.body.image,
                }));

                await Promise.all(productDetails.map((detail) => ProductDetailService.saveProductDetail(detail)));

                return res.status(httpStatus.OK).json({ message: 'Success', product });
            });
        } catch (error) {
            console.error(error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
    }
    async findAllProducts(req, res) {
        try {
            const take = req.params.take;
            const step = req.params.step;
            const products = await ProductService.getAllProductByStep(take, step);
            if (products !== 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', products });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }
    async editProduct(req, res) {
        try {
            publicUploadMultiFile(req, res, async function (err) {
                if (err) {
                    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Upload Fail', error: err });
                }
                if (req.body.oldImageList) {
                    req.body.oldImageList = JSON.parse(req.body.oldImageList);
                } else {
                    req.body.oldImageList = [];
                }
                const newImagePaths = req.files.map((file) => file.path.slice(file.path.indexOf('uploads')));
                req.body.imageList = [...req.body.oldImageList, ...newImagePaths];
                req.body.image = req.body.imageList[0];

                req.body.sellPrice = Number(req.body.sellPrice);
                req.body.importPrice = Number(req.body.importPrice);
                req.body.virtualPrice = Number(req.body.virtualPrice);
                req.body.ctvPrice = Number(req.body.ctvPrice);

                if (req.body.styleIds) {
                    req.body.styleIds = JSON.parse(req.body.styleIds);
                }

                const resProduct = await ProductService.saveProduct(req);

                if (resProduct.message === 'Fail') {
                    return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
                }
                const selectedSizes = JSON.parse(req.body.selectedSizes);
                const product = resProduct.product;
                const productDetails = selectedSizes.map((size) => ({
                    id: size.productDetailId || undefined,
                    productId: product.id,
                    sizeId: size.sizeId,
                    colorId: product.colorId,
                    quantity: size.quantity,
                    name: product.name,
                    sellPrice: req.body.sellPrice,
                    virtualPrice: req.body.virtualPrice,
                    ctvPrice: req.body.ctvPrice,
                    importPrice: req.body.importPrice,
                    imageList: req.body.imageList,
                    image: req.body.image,
                }));
                await Promise.all(productDetails.map((detail) => ProductDetailService.saveProductDetail(detail)));

                return res.status(httpStatus.OK).json({ message: 'Success', product });
            });
        } catch (error) {
            console.error(error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
    }

    async disableProduct(req, res) {
        try {
            if (AuthService.isAdmin(req)) {
                const productId = req.params.productId;
                const product = await ProductRepository.find(productId);
                if (!product) {
                    return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
                }
                const new_product = await ProductRepository.update(productId, { active: false });
                if (!new_product) {
                    return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
                }
                return res.status(httpStatus.OK).json({ message: 'Success' });
            } else {
                return res.status(httpStatus.FORBIDDEN).json({ message: 'Access denied' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async enableProduct(req, res) {
        try {
            if (AuthService.isAdmin(req)) {
                const productId = req.params.productId;
                const product = await ProductRepository.find(productId);
                if (!product) {
                    return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
                }
                const new_product = await ProductRepository.update(productId, { active: true });
                if (!new_product) {
                    return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
                }
                return res.status(httpStatus.OK).json({ message: 'Success' });
            } else {
                return res.status(httpStatus.FORBIDDEN).json({ message: 'Access denied' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async addBanner(req, res) {
        try {
            publicUploadFile(req, res, async function (err) {
                if (err) {
                    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Upload Fail', error: err });
                }

                if (req.file) {
                    req.body.image = req.file.path.slice(req.file.path.indexOf('uploads'));
                    console.log(req.body.image);
                } else {
                    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Image is required' });
                }
                req.body.position = 1;
                const banner = await BannerService.saveBanner(req);
                if (banner === 'Fail') {
                    return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
                }
                return res.status(httpStatus.OK).json({ message: 'Success', banner });
            });
        } catch (error) {
            console.error(error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
    }

    async addCategory(req, res) {
        try {
            const category = await CategoryService.saveCategory(req.body);
            if (category === 'Fail') {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
            return res.status(httpStatus.OK).json({ message: 'Success', category });
        } catch (error) {
            console.error(error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
    }

    async addSize(req, res) {
        try {
            const sizeName = req.body.otherSizeName;
            const categoryId = req.body.categoryIdSelect;
            const size = await SizeService.addSize(sizeName, categoryId);
            if (size === 'Fail') {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
            return res.status(httpStatus.OK).json({ message: 'Success', size });
        } catch (error) {
            console.error(error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
    }

    async addColor(req, res) {
        try {
            const colorName = req.body.otherColorName;
            const categoryId = req.body.categoryIdSelect;
            const color = await ColorService.addColor(colorName, categoryId);
            if (color === 'Fail') {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
            return res.status(httpStatus.OK).json({ message: 'Success', color });
        } catch (error) {
            console.error(error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
    }

    async addType(req, res) {
        try {
            const typeName = req.body.otherTypeName;
            const categoryId = req.body.categoryIdSelect;
            const type = await TypeService.addType(typeName, categoryId);
            if (type === 'Fail') {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
            return res.status(httpStatus.OK).json({ message: 'Success', type });
        } catch (error) {
            console.error(error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
    }

    async addStyle(req, res) {
        try {
            const styleName = req.body.otherStyleName;
            const categoryId = req.body.categoryIdSelect;
            const style = await StyleService.addStyle(styleName, categoryId);
            if (style === 'Fail') {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
            return res.status(httpStatus.OK).json({ message: 'Success', style });
        } catch (error) {
            console.error(error);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
        }
    }

    async findAllCategories(req, res) {
        try {
            const categories = await CategoryService.getAllCategories();
            if (categories) {
                return res.status(httpStatus.OK).json({ message: 'Success', categories });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async getVTPToken(req, res) {
        try {
            const response = await axios.post('https://partner.viettelpost.vn/v2/user/Login', {
                USERNAME: process.env.VTP_USERNAME,
                PASSWORD: process.env.VTP_PASSWORD,
            });
            const token = response.data.data.token;
            const expired = response.data.data.expired;

            if (token && expired) {
                return res.status(httpStatus.OK).json({ message: 'Success', token, expired });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async createVTPOrder(req, res) {
        try {
            const token = req.body.VTPToken;
            const orderId = req.body.orderId;
            const orderNote = req.body.orderNote;
            const result = await OrderService.createOrder(orderId, token, orderNote);

            if (result.success) {
                return res.status(httpStatus.OK).json({ message: 'Success', data: result.data });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Fail', error: result.error });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async getCTVNameList(req, res) {
        try {
            const ctvNameList = await UserService.getCTVNameList();
            if (ctvNameList) {
                return res.status(httpStatus.OK).json({ message: 'Success', ctvNameList });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async findNewOrderByStep(req, res) {
        try {
            const take = req.params.take;
            const step = req.params.step;
            const shipMethod = req.body.shipMethod;

            const orders = await OrderService.getNewOrderByStep(take, step, shipMethod);
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
    async findAllNewOrderByCTV(req, res) {
        try {
            const ctvName = req.params.ctvName;
            const take = req.params.take;
            const step = req.params.step;
            const shipMethod = req.body.shipMethod;
            const orders = await OrderService.getAllNewOrderByCTVName(ctvName, take, step, shipMethod);
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
    async findAllOrderByStep(req, res) {
        try {
            const take = req.params.take;
            const step = req.params.step;
            const status = req.body.status;
            const shipMethod = req.body.shipMethod;
            const orders = await OrderService.getAllOrderByStep(take, step, status, shipMethod);
            if (orders != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', orders });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async findAllOrderByCTVName(req, res) {
        try {
            const ctvName = req.params.ctvName;
            const take = req.params.take;
            const step = req.params.step;
            const status = req.body.status;
            const shipMethod = req.body.shipMethod;
            const orders = await OrderService.getAllOrderByCTVName(ctvName, take, step, status, shipMethod);
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

    async findAllReturnOrderByStep(req, res) {
        try {
            const take = req.params.take;
            const step = req.params.step;
            const status = req.body.status;
            const shipMethod = req.body.shipMethod;
            const isReturn = req.body.isReturn;
            const orders = await OrderService.getAllReturnOrderByStep(take, step, status, shipMethod, isReturn);
            if (orders != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', orders });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async findAllReturnOrderByCTVName(req, res) {
        try {
            const ctvName = req.params.ctvName;
            const take = req.params.take;
            const step = req.params.step;
            const status = req.body.status;
            const shipMethod = req.body.shipMethod;
            const isReturn = req.body.isReturn;
            const orders = await OrderService.getAllReturnOrderByCTVName(
                ctvName,
                take,
                step,
                status,
                shipMethod,
                isReturn,
            );
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

    async findAllOrderByCTVNameInMonth(req, res) {
        try {
            const ctvName = req.params.ctvName;
            const month = parseInt(req.params.month);
            const year = parseInt(req.params.year);
            const take = req.params.take;
            const step = req.params.step;
            const status = req.body.status;
            const shipMethod = req.body.shipMethod;
            const orders = await OrderService.getAllOrderByCTVNameInMonth(
                ctvName,
                month,
                year,
                take,
                step,
                status,
                shipMethod,
            );
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

    async findAllOrderByMonth(req, res) {
        try {
            const month = parseInt(req.params.month);
            const year = parseInt(req.params.year);
            const take = req.params.take;
            const step = req.params.step;
            const status = req.body.status;
            const shipMethod = req.body.shipMethod;
            const orders = await OrderService.getAllOrderByMonth(month, year, take, step, status, shipMethod);
            if (orders !== 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', orders });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async getAnnualRevenue(req, res) {
        try {
            const year = parseInt(req.params.year);
            const revenueData = await OrderService.getAnnualRevenue(year);

            if (revenueData) {
                return res.status(httpStatus.OK).json({ message: 'Success', data: revenueData });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async getRevenueAndCommissionByMonth(req, res) {
        try {
            const month = parseInt(req.params.month);
            const year = parseInt(req.params.year);
            const data = await OrderService.getRevenueAndCommissionByMonth(month, year);
            if (data) {
                return res.status(httpStatus.OK).json({ message: 'Success', data });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }
    async getRevenueAndCommissionByCTVNameAndMonth(req, res) {
        try {
            const month = parseInt(req.params.month);
            const year = parseInt(req.params.year);
            const ctvName = req.params.ctvName;
            const data = await OrderService.getRevenueAndCommissionByCtvNameAndMonth(month, year, ctvName);
            if (data) {
                return res.status(httpStatus.OK).json({ message: 'Success', data });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }
    async getOrderCountsByMonth(req, res) {
        try {
            const month = parseInt(req.params.month);
            const year = parseInt(req.params.year);
            const orderCounts = await OrderService.getOrderCountByMonth(month, year);
            if (orderCounts) {
                return res.status(httpStatus.OK).json({ message: 'Success', orderCounts });
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

    async confirmedOrder(req, res) {
        try {
            const orderId = req.params.orderId;
            const orderNote = req.body.orderNote;
            const order = await OrderService.confirmedOrder(orderId, orderNote);
            if (order != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', order });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Fail' });
            }
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async succeedOrder(req, res) {
        try {
            const orderId = req.params.orderId;
            const order = await OrderService.succeedOrder(orderId);
            if (order != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', order });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Fail' });
            }
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async boomedOrder(req, res) {
        try {
            const orderId = req.params.orderId;
            const order = await OrderService.boomedOrder(orderId);
            if (order != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', order });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Fail' });
            }
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async cancelledOrder(req, res) {
        try {
            const orderId = req.params.orderId;
            const cancelReason = req.body.cancelReason;
            const order = await OrderService.cancelledOrder(orderId, cancelReason);
            if (order != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', order });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Fail' });
            }
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async findOrderByPhoneOrDeliveringCode(req, res) {
        try {
            const searchTerm = req.body.searchTerm;
            const order = await OrderService.getOrderByPhoneOrDeliveringCode(searchTerm);
            if (order) {
                return res.status(httpStatus.OK).json({ message: 'Success', order });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }
    async findReturnOrderByPhoneOrDeliveringCode(req, res) {
        try {
            const searchTerm = req.body.searchTerm;
            const order = await OrderService.getReturnOrderByPhoneOrDeliveringCode(searchTerm);
            if (order) {
                return res.status(httpStatus.OK).json({ message: 'Success', order });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async changeStatusReturnOrder(req, res) {
        try {
            const orderId = req.params.orderId;
            const order = await OrderRepository.find(orderId);
            if (!order) {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }

            const new_order = await OrderRepository.update(orderId, { isReturn: !order.isReturn });
            if (!new_order) {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
            return res.status(httpStatus.OK).json({ message: 'Success' });
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async findNewOrderByPhone(req, res) {
        try {
            const searchTerm = req.body.searchTerm;
            const order = await OrderService.getNewOrderByPhone(searchTerm);
            if (order) {
                return res.status(httpStatus.OK).json({ message: 'Success', order });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }
    async commissionNote(req, res) {
        try {
            const commission = req.body.commission;
            const newCommission = await CommissionService.saveCommission(commission);
            if (newCommission != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', newCommission });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Fail' });
            }
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async saveAnnouncement(req, res) {
        try {
            const announcement = req.body.announcement;
            const newAnnouncement = await AnnouncementService.saveAnnouncement(announcement);
            if (newAnnouncement != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', newAnnouncement });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Fail' });
            }
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async deleteAnnouncement(req, res) {
        try {
            const announcementId = req.params.announcementId;
            const result = await AnnouncementService.deleteAnnouncement(announcementId);
            if (result != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success' });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Fail' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async deleteCategory(req, res) {
        try {
            const categoryId = req.params.categoryId;
            const result = await CategoryService.deleteCategory(categoryId);
            if (result != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success' });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Fail' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async getBannerByPosition(req, res) {
        try {
            const position = req.params.position;
            const banner = await BannerService.getBannerByPosition(position);
            if (banner != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', banner });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Fail' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async confirmCommissionIsPaid(req, res) {
        try {
            const commissionId = req.params.commissionId;
            const commission = await CommissionService.ConfirmCommissionIsPaid(commissionId);
            if (commission != 'Fail') {
                return res.status(httpStatus.OK).json({ message: 'Success', commission });
            } else {
                return res.status(httpStatus.OK).json({ message: 'Fail' });
            }
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async findAllUsers(req, res) {
        try {
            const users = await UserService.getAllUsers();
            if (users) {
                return res.status(httpStatus.OK).json({ message: 'Success', users });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async findUserByEmail(req, res) {
        try {
            const email = req.body.email;
            const user = await UserService.getUserByEmail(email);
            if (user) {
                return res.status(httpStatus.OK).json({ message: 'Success', user });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async banUser(req, res) {
        try {
            const userId = req.params.userId;
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ message: 'Invalid userId' });
            }
            const user = await UserRepository.find(userId);
            if (!user) {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
            const new_user = await UserRepository.update(userId, { active: false });
            if (!new_user) {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
            return res.status(httpStatus.OK).json({ message: 'Success' });
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async unBanUser(req, res) {
        try {
            if (AuthService.isAdmin(req)) {
                const userId = req.params.userId;
                const user = await UserRepository.find(userId);
                if (!user) {
                    return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
                }
                const new_user = await UserRepository.update(userId, { active: true });
                if (!new_user) {
                    return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
                }
                return res.status(httpStatus.OK).json({ message: 'Success' });
            } else {
                return res.status(httpStatus.FORBIDDEN).json({ message: 'Access denied' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async confirmCTV(req, res) {
        try {
            const userId = req.params.userId;

            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ message: 'Invalid userId' });
            }

            const registerRes = await AdminService.confirmCTV(userId);
            if (registerRes === 'Success') {
                return res.status(httpStatus.OK).json({ message: 'Success' });
            } else {
                return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async commissionStatistic(req, res) {
        try {
            const month = parseInt(req.params.month);
            const year = parseInt(req.params.year);

            const commissions = await CommissionService.getCommissionByMonthAndYear(month, year);
            if (commissions) {
                return res.status(httpStatus.OK).json({ message: 'Success', commissions });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }

    async findProductByName(req, res) {
        try {
            const searchTerm = req.body.name;
            const products = await ProductService.findProductByName(searchTerm);
            if (products) {
                return res.status(httpStatus.OK).json({ message: 'Success', products });
            } else {
                return res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
            }
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Fail' });
        }
    }
}
export default new AdminController();
