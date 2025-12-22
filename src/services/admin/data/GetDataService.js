import BannerRepository from '../../../repositories/BannerRepository.js';
import CategoryRepository from '../../../repositories/CategoryRepository.js';
import OrderDetailRepository from '../../../repositories/OrderDetailRepository.js';
import OrderRepository from '../../../repositories/OrderRepository.js';
import ProductDetailRepository from '../../../repositories/ProductDetailRepository.js';
import ProductRepository from '../../../repositories/ProductRepository.js';
import UserRepository from '../../../repositories/UserRepository.js';

class GetDataService {
    async getDataOrderEmail(order) {
        try {
            const shop = await ShopRepository.find(order.shopId);

            const orderDetails = await OrderDetailRepository.db.findMany({
                where: {
                    id: {
                        in: order.orderDetailIdList || [], // Đảm bảo là một mảng hợp lệ
                    },
                },
            });

            const productDetailIds = orderDetails.map((detail) => detail.productDetailId);
            const productDetails = await ProductDetailRepository.db.findMany({
                where: {
                    id: {
                        in: productDetailIds, // Sử dụng 'in' với một mảng
                    },
                },
            });

            const items = orderDetails.map((detail, index) => {
                const product = productDetails.find((pd) => pd.id === detail.productDetailId);
                return {
                    name: product.name,
                    color: product.option2,
                    size: product.option1,
                    quantity: detail.quantity,
                    price: product.price,
                    shopDiscount: detail.discountPrice || 0,
                };
            });
            const total = items.reduce((acc, item) => {
                return acc + (item.price - (item.shopDiscount || 0)) * item.quantity;
            }, 0);

            let voucherCode = 'Không có';
            if (order.voucherId) {
                const voucher = await VoucherRepository.find(order.voucherId);
                voucherCode = voucher ? voucher.code : 'Không có';
            }

            const invoiceData = {
                orderId: order.id,
                orderDate: order.createDate,
                recipient: shop.name,
                items: items,
                total: total,
                shippingFee: order.priceShip,
                shopVoucher: order.priceVoucher,
                voucherCode: voucherCode,
                member: order.priceMember,
                finalAmount: total + order.priceShip - order.priceVoucher - order.priceMember,
            };
            return invoiceData;
        } catch (e) {
            return 'Fail';
        }
    }
    async getInfoShop(userId) {
        try {
            const shop = await ShopRepository.findByUserId(userId);
            if (!shop || shop.length === 0) {
                return { error: 'Shop not found' };
            }
            const dataShop = shop[0];

            const orders = await OrderRepository.db.findMany({
                where: {
                    shopId: dataShop.id,
                },
            });

            const totalOrder = orders.length;
            const totalCancelOrder = orders.filter((order) => order.status === 'CANCEL').length;

            const products = await ProductRepository.findAllProductByShop(dataShop.id);

            const totalReviews = products.reduce((total, product) => {
                return total + (product.reviewIdList ? product.reviewIdList.length : 0);
            }, 0);

            return {
                dataShop,
                totalOrder: totalOrder,
                totalCancelOrder: totalCancelOrder,
                totalReviews: totalReviews,
            };
        } catch (error) {
            console.error(error);
            return { error: 'Fail' };
        }
    }
    async getDailyOrderCommission(month, year) {
        try {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const orders = await OrderRepository.db.findMany({
                where: {
                    paid: true,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            const dailyOrderCommission = {};

            for (let day = 1; day <= endOfMonth.getDate(); day++) {
                dailyOrderCommission[day] = 0;
            }

            for (const order of orders) {
                const orderDetailIds = order.orderDetailIdList;
                const orderDetails = await OrderDetailRepository.db.findMany({
                    where: { id: { in: orderDetailIds } },
                });

                for (const detail of orderDetails) {
                    const productDetail = await ProductDetailRepository.db.findUnique({
                        where: { id: detail.productDetailId },
                    });

                    if (!productDetail) continue;

                    const revenue = (detail.price - (detail.discountPrice || 0)) * detail.quantity;

                    const orderDate = order.createDate.getDate();
                    dailyOrderCommission[orderDate] += (revenue * 95) / 100 - order.priceMember;
                }
            }

            const result = Object.keys(dailyOrderCommission).map((day) => ({
                day: parseInt(day),
                revenue: dailyOrderCommission[day],
            }));

            return result;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getTotalOrderCommission(month, year) {
        try {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const orders = await OrderRepository.db.findMany({
                where: {
                    paid: true,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });
            const orderDetailIds = orders.flatMap((order) => order.orderDetailIdList);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: { id: { in: orderDetailIds } },
            });
            let totalOrderCommission = 0;

            for (const order of orders) {
                const orderDetailList = orderDetails.filter((detail) => order.orderDetailIdList.includes(detail.id));
                const orderRevenue = orderDetailList.reduce((acc, detail) => {
                    const revenue = (detail.price - (detail.discountPrice || 0)) * detail.quantity;
                    return acc + revenue;
                }, 0);

                totalOrderCommission += (orderRevenue * 95) / 100 - order.priceMember;
            }

            return totalOrderCommission;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getDailyBannerCommissionByMonth(month, year) {
        try {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const banners = await BannerRepository.db.findMany({
                where: {
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            const dailyBannerCommission = {};

            for (let day = 1; day <= endOfMonth.getDate(); day++) {
                dailyBannerCommission[day] = 0;
            }

            for (const banner of banners) {
                const bannerDate = banner.createDate.getDate();
                const commission = banner.level === 'PREMIUM' ? 100000 : 30000; // Giá hoa hồng

                dailyBannerCommission[bannerDate] += commission;
            }

            const result = Object.keys(dailyBannerCommission).map((day) => ({
                day: parseInt(day),
                commission: dailyBannerCommission[day],
            }));

            return result;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getTotalBannerCommission(month, year) {
        try {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const banners = await BannerRepository.db.findMany({
                where: {
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });
            const AD_PRICES = {
                PREMIUM: 100000,
                COMMON: 30000,
            };

            const totalBannerCommission = banners.reduce((total, banner) => {
                return total + (banner.level === 'PREMIUM' ? AD_PRICES.PREMIUM : AD_PRICES.COMMON);
            }, 0);

            return totalBannerCommission;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getTotalUsers() {
        try {
            const totalUsers = await UserRepository.db.count();
            return totalUsers;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getTotalNewUsersByMonth(month, year) {
        try {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const totalNewUsers = await UserRepository.db.count({
                where: {
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            return totalNewUsers;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getTotalNewShopsByMonth(month, year) {
        try {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const totalNewShops = await ShopRepository.db.count({
                where: {
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            return totalNewShops;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getTotalShops() {
        try {
            const totalShops = await ShopRepository.db.count();
            return totalShops;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getTotalRevenueDeliveringByMonth(userId, month, year) {
        try {
            const shop = await ShopRepository.findByUserId(userId);

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const orders = await OrderRepository.db.findMany({
                where: {
                    status: 'DELIVERING',
                    shopId: shop[0].id,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            const orderDetailIds = orders.flatMap((order) => order.orderDetailIdList);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: { id: { in: orderDetailIds } },
            });
            let totalRevenue = 0;

            for (const order of orders) {
                const orderDetailList = orderDetails.filter((detail) => order.orderDetailIdList.includes(detail.id));
                const orderRevenue = orderDetailList.reduce((acc, detail) => {
                    const revenue = (detail.price - (detail.discountPrice || 0)) * detail.quantity;
                    return acc + revenue;
                }, 0);
                const revenue = (orderRevenue * 95) / 100 - order.priceVoucher;
                totalRevenue += revenue;
            }

            return totalRevenue;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async dailyOrderCountForAdmin(month, year) {
        try {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const orders = await OrderRepository.db.findMany({
                where: {
                    paid: true,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            const dailyOrderCount = {};

            for (let day = 1; day <= endOfMonth.getDate(); day++) {
                dailyOrderCount[day] = 0;
            }

            for (const order of orders) {
                const orderDate = order.createDate.getDate();
                dailyOrderCount[orderDate] += 1;
            }

            const result = Object.keys(dailyOrderCount).map((day) => ({
                day: parseInt(day),
                count: dailyOrderCount[day],
            }));

            return result;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getTotalOrdersByMonthForAdmin(month, year) {
        try {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const totalOrders = await OrderRepository.db.count({
                where: {
                    paid: true,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            return totalOrders;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getTotalOrdersByMonth(userId, month, year) {
        try {
            const shop = await ShopRepository.findByUserId(userId);

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const totalOrders = await OrderRepository.db.count({
                where: {
                    status: {
                        in: ['PROCESSED', 'DELIVERING'],
                    },
                    shopId: shop[0].id,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            return totalOrders;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getTotalOrdersDeliveringByMonth(userId, month, year) {
        try {
            const shop = await ShopRepository.findByUserId(userId);

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const orderDelivering = await OrderRepository.db.count({
                where: {
                    status: 'DELIVERING',
                    shopId: shop[0].id,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            return orderDelivering;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getTotalProductsSoldByMonth(userId, month, year) {
        try {
            const shop = await ShopRepository.findByUserId(userId);

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const orders = await OrderRepository.db.findMany({
                where: {
                    paid: true,
                    shopId: shop[0].id,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            let totalProductsSold = 0;

            for (const order of orders) {
                const orderDetailIds = order.orderDetailIdList;
                const orderDetails = await OrderDetailRepository.db.findMany({
                    where: { id: { in: orderDetailIds } },
                });

                for (const detail of orderDetails) {
                    totalProductsSold += detail.quantity;
                }
            }

            return totalProductsSold;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async dailyOrderCount(userId, month, year) {
        try {
            const shop = await ShopRepository.findByUserId(userId);
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const orders = await OrderRepository.db.findMany({
                where: {
                    paid: true,
                    shopId: shop[0].id,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            const dailyOrderCount = {};

            for (let day = 1; day <= endOfMonth.getDate(); day++) {
                dailyOrderCount[day] = 0;
            }

            for (const order of orders) {
                const orderDate = order.createDate.getDate();
                dailyOrderCount[orderDate] += 1;
            }

            const result = Object.keys(dailyOrderCount).map((day) => ({
                day: parseInt(day),
                count: dailyOrderCount[day],
            }));

            return result;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async dailyRevenue(userId, month, year) {
        try {
            const shop = await ShopRepository.findByUserId(userId);

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const orders = await OrderRepository.db.findMany({
                where: {
                    status: 'PROCESSED',
                    paid: true,
                    shopId: shop[0].id,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            const dailyRevenue = {};

            for (let day = 1; day <= endOfMonth.getDate(); day++) {
                dailyRevenue[day] = 0;
            }

            for (const order of orders) {
                const shippingCost = order.priceShip || 0;
                const voucherCost = order.priceVoucher || 0;
                const memberCost = order.priceMember || 0;

                const orderDetailIds = order.orderDetailIdList;
                const orderDetails = await OrderDetailRepository.db.findMany({
                    where: { id: { in: orderDetailIds } },
                });

                for (const detail of orderDetails) {
                    const productDetail = await ProductDetailRepository.db.findUnique({
                        where: { id: detail.productDetailId },
                    });

                    if (!productDetail) continue;

                    const revenue = (detail.price - (detail.discountPrice || 0)) * detail.quantity;
                    const netRevenue = (revenue * 95) / 100 - voucherCost;

                    const orderDate = order.createDate.getDate();
                    dailyRevenue[orderDate] += netRevenue;
                }
            }

            const result = Object.keys(dailyRevenue).map((day) => ({
                day: parseInt(day),
                revenue: dailyRevenue[day],
            }));

            return result;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }
    async getOrderRevenueByMonth(userId, month, year) {
        try {
            const shop = await ShopRepository.findByUserId(userId);

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const orders = await OrderRepository.db.findMany({
                where: {
                    status: 'PROCESSED',
                    paid: true,
                    shopId: shop[0].id,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            const revenueData = [];

            for (const order of orders) {
                const orderDetailIds = order.orderDetailIdList;
                const orderDetails = await OrderDetailRepository.db.findMany({
                    where: { id: { in: orderDetailIds } },
                });

                let totalAmount = 0;

                for (const detail of orderDetails) {
                    const revenue = (detail.price - (detail.discountPrice || 0)) * detail.quantity;
                    totalAmount += revenue;
                }

                const transactionFee = totalAmount * 0.05; // 5% transaction fee
                const voucherReduce = order.priceVoucher || 0;
                const revenue = totalAmount - transactionFee - voucherReduce;
                // Tạo đối tượng RevenueModel
                revenueData.push({
                    orderId: order.id,
                    totalAmount: totalAmount,
                    voucherReduce: voucherReduce,
                    transactionFee: transactionFee,
                    revenue: revenue,
                });
            }

            return revenueData;
        } catch (error) {
            return 'Fail';
        }
    }
    async getTotalRevenueByMonth(userId, month, year) {
        try {
            const shop = await ShopRepository.findByUserId(userId);

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            const orders = await OrderRepository.db.findMany({
                where: {
                    status: 'PROCESSED',
                    paid: true,
                    shopId: shop[0].id,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });
            const orderDetailIds = orders.flatMap((order) => order.orderDetailIdList);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: { id: { in: orderDetailIds } },
            });
            let totalRevenue = 0;

            for (const order of orders) {
                const orderDetailList = orderDetails.filter((detail) => order.orderDetailIdList.includes(detail.id));
                const orderRevenue = orderDetailList.reduce((acc, detail) => {
                    const revenue = (detail.price - (detail.discountPrice || 0)) * detail.quantity;
                    return acc + revenue;
                }, 0);

                // Trừ đi các khoản phí
                const totalOrderCost = (orderRevenue * 95) / 100 - (order.priceVoucher || 0);
                totalRevenue += totalOrderCost;
            }

            return totalRevenue;
        } catch (error) {
            console.error(error);
            return 'Fail';
        }
    }

    async topSellProduct(userId, month, year) {
        try {
            const shop = await ShopRepository.findByUserId(userId);

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            // Lấy danh sách đơn hàng đã thanh toán trong tháng
            const orders = await OrderRepository.db.findMany({
                where: {
                    status: 'PROCESSED',
                    paid: true,
                    shopId: shop[0].id,
                    createDate: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            const orderDetailIds = orders.flatMap((order) => order.orderDetailIdList);
            const orderDetails = await OrderDetailRepository.db.findMany({
                where: { id: { in: orderDetailIds } },
            });
            const productStats = {};

            for (const order of orders) {
                const voucherCost = order.priceVoucher / order.orderDetailIdList.length;

                for (const detail of orderDetails) {
                    if (!order.orderDetailIdList.includes(detail.id)) continue;

                    const productDetail = await ProductDetailRepository.db.findUnique({
                        where: { id: detail.productDetailId },
                    });

                    if (!productDetail) continue;

                    const productId = productDetail.productId;
                    const revenue = (detail.price - (detail.discountPrice || 0)) * detail.quantity;

                    const netRevenue = (revenue * 95) / 100 - voucherCost;

                    if (!productStats[productId]) {
                        productStats[productId] = {
                            totalRevenue: 0,
                            totalSold: 0,
                            productName: '',
                        };
                    }

                    productStats[productId].totalRevenue += netRevenue;
                    productStats[productId].totalSold += detail.quantity;
                }
            }

            const productIds = Object.keys(productStats);
            const products = await ProductRepository.db.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true },
            });

            const productMap = {};
            products.forEach((product) => {
                productMap[product.id] = product.name;
            });

            for (const productId in productStats) {
                productStats[productId].productName = productMap[productId];
            }

            const result = Object.values(productStats).sort((a, b) => b.totalRevenue - a.totalRevenue);
            const topN = result.slice(0, 4);

            return topN;
        } catch (error) {
            console.log(error.message);
            return 'Fail';
        }
    }
    async getAllCategories() {
        try {
            const categories = await CategoryRepository.findAll();
            return categories;
        } catch (e) {
            console.log(e.message)
            return 'Fail';
        }
    }
    async getAllProducts(req) {
        try {
            const products = await ProductRepository.db.findMany({
                where: {
                    active: true,
                },
            });
            return products;
        } catch (e) {
            return 'Fail';
        }
    }
    async getAllProductByShop(shopId) {
        try {
            const products = await ProductRepository.findAllProductByShop(shopId);
            return products;
        } catch (e) {
            return 'Fail';
        }
    }

    async getAllProductDetailByProductId(productId) {
        try {
            const productDetail = await ProductDetailRepository.findAllProductDetailByProduct(productId);
            return productDetail;
        } catch (e) {
            return 'Fail';
        }
    }
    async getProductDetailById(producDetailId) {
        try {
            const productDetail = await ProductDetailRepository.findById(producDetailId);
            return productDetail;
        } catch (e) {
            return 'Fail';
        }
    }
    async getProductDetailMany(productDetailIdList) {
        try {
            const productDetails = await ProductDetailRepository.findProductDetailManyShop(productDetailIdList);
            return productDetails;
        } catch (e) {
            return 'Fail';
        }
    }
    async getProductDetailByProductId(productId) {
        try {
            const productDetails = await ProductDetailRepository.findProductDetailByProductId(productId);
            return productDetails;
        } catch (e) {
            return 'Fail';
        }
    }
    async getCategory(categoryId) {
        try {
            const category = await CategoryRepository.find(categoryId);
            return category;
        } catch (e) {
            return 'Fail';
        }
    }
    async getAllOrderByShop(shopId) {
        try {
            const orders = await OrderRepository.findOrderByShop(shopId);
            return orders;
        } catch (e) {
            return 'Fail';
        }
    }
    async getOrderDetailByListId(orderDetailIdList) {
        try {
            const orderDetails = await OrderDetailRepository.findOrderDetailByListId(orderDetailIdList);
            return orderDetails;
        } catch (e) {
            return 'Fail';
        }
    }
}
export default new GetDataService();
