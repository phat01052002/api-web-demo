import { ReqNotificationMany } from '../../../controllers/socket/EmitSocket.js';
import BannerRepository from '../../../repositories/BannerRepository.js';
import CategoryRepository from '../../../repositories/CategoryRepository.js';
import DiscountRepository from '../../../repositories/DiscountRepository.js';
import NotificationRepository from '../../../repositories/NotificationRepository.js';
import ProductDetailRepository from '../../../repositories/ProductDetailRepository.js';
import ProductRepository from '../../../repositories/ProductRepository.js';
import ShopRepository from '../../../repositories/ShopRepository.js';
import TransactionRepository from '../../../repositories/TransactionRepository.js';
import UserRepository from '../../../repositories/UserRepository.js';
import VoucherRepository from '../../../repositories/VoucherRepository.js';
import WalletRepository from '../../../repositories/WalletRepository.js';

class AddDataService {
    async saveBanner(req, userId) {
        try {
            const walletShop = await WalletRepository.db.findFirst({
                where: {
                    userId: userId,
                },
            });
            if (req.level == 'COMMON') {
                if (walletShop.balance < 30000) return 'Not enough money';
                await WalletRepository.db.update({
                    where: {
                        id: walletShop.id,
                    },
                    data: {
                        balance: {
                            decrement: 30000,
                        },
                    },
                });
                await TransactionRepository.db.create({
                    data: {
                        walletId: walletShop.id,
                        value: 30000,
                        describe: 'banner fee',
                        to: '/',
                        from: walletShop.id,
                    },
                });
            } else {
                if (walletShop.balance < 100000) return 'Not enough money';
                await WalletRepository.db.update({
                    where: {
                        id: walletShop.id,
                    },
                    data: {
                        balance: {
                            decrement: 100000,
                        },
                    },
                });
                await TransactionRepository.db.create({
                    data: {
                        walletId: walletShop.id,
                        value: 100000,
                        describe: 'banner fee',
                        to: '/',
                        from: walletShop.id,
                    },
                });
            }

            await BannerRepository.saveUpload(req);
            return 'Success';
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async saveCategory(req) {
        try {
            const newCategory = await CategoryRepository.saveUpload(req);
            const newId = newCategory.id;
            const previousId = newCategory.previousId;

            await updateParentCategory(previousId, newId);
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }

    async saveProduct(req) {
        try {
            const product = await ProductRepository.saveUpload(req);

            const shop = await ShopRepository.find(product.shopId);
            if (product) {
                for (const userId of shop.userFollowIdList) {
                    const notification = await NotificationRepository.db.create({
                        data: {
                            describe: `Có sản phẩm mới nè bạn iu ơiii`,
                            image: `${product.image}`,
                            link: `/product/${product.id}`,
                            userId: userId,
                        },
                    });
                    const user = await UserRepository.find(userId);
                    await UserRepository.update(userId, {
                        notificationIdList: [...user.notificationIdList, notification.id],
                    });
                }
                ReqNotificationMany(shop.userFollowIdList);
            }
            return {
                message: 'Success',
                product: product,
            };
        } catch (e) {
            console.log(e.message);
            return {
                message: 'Fail',
                product: null,
            };
        }
    }
    async saveProductDetail(req) {
        try {
            const product = await ProductRepository.find(req.productId);
            const producDetail = await ProductDetailRepository.saveUpload(req);
            await ProductRepository.db.update({
                where: {
                    id: producDetail.productId,
                },
                data: {
                    productCIdList: [...product.productCIdList, producDetail.id],
                },
            });
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

    async saveVoucher(voucherData) {
        try {
            const newVoucher = await VoucherRepository.db.create({
                data: voucherData,
            });
            const shop = await ShopRepository.find(newVoucher.shopId);
            if (newVoucher) {
                for (const userId of shop.userFollowIdList) {
                    const notification = await NotificationRepository.db.create({
                        data: {
                            describe: `Cửa hàng ${shop.name} có mã voucher mới, nhanh tay thu thập kẻo hết`,
                            image: ``,
                            link: `/view-shop/${shop.id}`,
                            userId: userId,
                        },
                    });
                    const user = await UserRepository.find(userId);
                    await UserRepository.update(userId, {
                        notificationIdList: [...user.notificationIdList, notification.id],
                    });
                }
                ReqNotificationMany(shop.userFollowIdList);
                return newVoucher;
            } else {
                return 'Fail';
            }
        } catch (e) {
            throw new Error('Fail' + e.message);
        }
    }

    async saveDiscount({ name, percent, shopId, productDetailId, all, productId }) {
        try {
            const product = await ProductRepository.db.findUnique({
                where: { id: productId },
            });
            const shop = await ShopRepository.find(shopId);
            if (all) {
                const newDiscount = await DiscountRepository.db.create({
                    data: {
                        name,
                        percent,
                        shopId,
                    },
                });
                await ProductRepository.db.update({
                    where: { id: productId },
                    data: {
                        percentDiscountTop: newDiscount.percent,
                    },
                });
                const productDetailIdList = product.productCIdList;
                await ProductDetailRepository.db.updateMany({
                    where: {
                        id: {
                            in: productDetailIdList,
                        },
                    },
                    data: { discountId: newDiscount.id },
                });
                if (newDiscount) {
                    for (const userId of shop.userFollowIdList) {
                        const notification = await NotificationRepository.db.create({
                            data: {
                                describe: `Cửa hàng ${shop.name} có khuyến mãi mới`,
                                image: `${product.image}`,
                                link: `/view-shop/${shop.id}`,
                                userId: userId,
                            },
                        });
                        const user = await UserRepository.find(userId);
                        await UserRepository.update(userId, {
                            notificationIdList: [...user.notificationIdList, notification.id],
                        });
                    }
                    ReqNotificationMany(shop.userFollowIdList);
                    return newDiscount;
                } else {
                    return 'Fail';
                }
            } else {
                const newDiscount = await DiscountRepository.db.create({
                    data: {
                        name,
                        percent,
                        shopId,
                    },
                });
                const updatedProductDetail = await ProductDetailRepository.db.update({
                    where: { id: productDetailId },
                    data: { discountId: newDiscount.id },
                });
                if (product.percentDiscountTop < newDiscount.percent)
                    await ProductRepository.db.update({
                        where: { id: productId },
                        data: {
                            percentDiscountTop: newDiscount.percent,
                        },
                    });
                if (newDiscount) {
                    for (const userId of shop.userFollowIdList) {
                        const notification = await NotificationRepository.db.create({
                            data: {
                                describe: `Cửa hàng ${shop.name} có khuyến mãi mới`,
                                image: `${product.image}`,
                                link: `/view-shop/${shop.id}`,
                                userId: userId,
                            },
                        });
                        const user = await UserRepository.find(userId);
                        await UserRepository.update(userId, {
                            notificationIdList: [...user.notificationIdList, notification.id],
                        });
                    }
                    ReqNotificationMany(shop.userFollowIdList);
                    return newDiscount;
                } else {
                    return 'Fail';
                }
            }
        } catch (e) {
            throw new Error('Fail' + e.message);
        }
    }
    async saveMaterial(req) {
        try {
            await CategoryRepository.save(req);
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }

    async saveStyles(req) {
        try {
            await CategoryRepository.save(req);
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }

    async saveBrand(req) {
        try {
            await CategoryRepository.save(req);
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }

    async saveOrigin(req) {
        try {
            await CategoryRepository.save(req);
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }
}
async function updateParentCategory(previousId, newId) {
    if (!previousId) return;
    const parentCategory = await CategoryRepository.find(previousId);

    if (parentCategory) {
        await CategoryRepository.db.update({
            where: {
                id: parentCategory.id,
            },
            data: {
                categoryIdClIST: [...parentCategory.categoryIdClIST, newId],
            },
        });

        await updateParentCategory(parentCategory.previousId, newId);
    }
}
export default new AddDataService();
