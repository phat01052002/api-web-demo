import BannerRepository from '../../../repositories/BannerRepository.js';
import CategoryRepository from '../../../repositories/CategoryRepository.js';
import DiscountRepository from '../../../repositories/DiscountRepository.js';
import ProductDetailRepository from '../../../repositories/ProductDetailRepository.js';
import ProductRepository from '../../../repositories/ProductRepository.js';
import VoucherRepository from '../../../repositories/VoucherRepository.js';

class DeleteDataService {
    async deleteProductDetailsByProductId(productId, existingDetails, newKeys) {
        const existingKeys = existingDetails.map((detail) => `${detail.option1}-${detail.option2}`);
        const detailsToDelete = existingKeys.filter((key) => !newKeys.includes(key));

        for (const key of detailsToDelete) {
            const detail = existingDetails.find((d) => `${d.option1}-${d.option2}` === key);
            if (detail) {
                const deleteResult = await ProductDetailRepository.delete(detail.id);
                if (deleteResult.message === 'Fail') {
                    return { message: 'Fail' };
                }
            }
        }
        return { message: 'Success' };
    }
    async deleteProductDetail(productId, options) {
        try {
            const existingDetails = await ProductDetailRepository.db.findMany({
                where: {
                    productId: productId,
                },
            });
            const existingKeys = existingDetails.map((detail) => `${detail.option1}-${detail.option2}`);
            const newKeys = createCombinations(options.size, options.color).map(
                (combo) => `${combo.size}-${combo.color}`,
            );

            const detailsToDelete = existingKeys.filter((key) => !newKeys.includes(key));

            // Xóa các productDetail không còn tồn tại
            await Promise.all(
                detailsToDelete.map(async (key) => {
                    const detail = existingDetails.find((d) => `${d.option1}-${d.option2}` === key);
                    if (detail) {
                        await ProductDetailRepository.delete(detail.id);
                    }
                }),
            );
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }
    async deleteCategory(categoryId) {
        try {
            await CategoryRepository.update(categoryId, { active: false });
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }
    async deleteProduct(productId) {
        try {
            const product = await ProductRepository.db.update({
                where: {
                    id: productId,
                },
                data: {
                    activeByShop: false,
                },
            });
            const productDetailIdList = product.productCIdList;

            await ProductDetailRepository.db.updateMany({
                where: {
                    id: {
                        in: productDetailIdList,
                    },
                },
                data: {
                    activeByShop: false,
                },
            });
            return 'Success';
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async deleteVoucher(voucherId) {
        try {
            await VoucherRepository.delete(voucherId);
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }
    async cancelBanner(bannerId) {
        try {
            await BannerRepository.delete(bannerId);
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }

    async deleteDiscount(discountId, productDetailId) {
        try {
            await ProductDetailRepository.db.update({
                where: {
                    id: productDetailId,
                },
                data: {
                    discountId: null,
                },
            });
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }
    async deleteDiscountProduct(productId) {
        try {
            const product = await ProductRepository.db.update({
                where: {
                    id: productId,
                },
                data: {
                    percentDiscountTop: 0,
                },
            });

            const productDetailIdList = product.productCIdList;

            const productDetails = await ProductDetailRepository.db.findMany({
                where: {
                    id: {
                        in: productDetailIdList,
                    },
                },
                select: {
                    discountId: true,
                },
            });

            const discountIdList = productDetails.map((detail) => detail.discountId).filter((id) => id !== undefined);

            for (const discountId of discountIdList) {
                const count = await ProductDetailRepository.db.count({
                    where: {
                        discountId: discountId,
                    },
                });

                if (count === 1) {
                    await DiscountRepository.db.delete({
                        where: {
                            id: discountId,
                        },
                    });
                }
            }

            await ProductDetailRepository.db.updateMany({
                where: {
                    id: {
                        in: productDetailIdList,
                    },
                },
                data: {
                    discountId: null, // Xóa discountId
                },
            });

            return 'Success';
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async deleteVoucherMany(voucherIds) {
        try {
            await VoucherRepository.deleteVoucherMany(voucherIds);
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }
    async deleteProductDetail(productDetailId) {
        try {
            await ProductDetailRepository.db.update({
                where: {
                    id: productDetailId,
                },
                data: {
                    activeByShop: false,
                },
            });
            return 'Success';
        } catch (e) {
            return 'Fail';
        }
    }
}
function createCombinations(sizes, colors) {
    const combinations = [];
    sizes.forEach((size) => {
        colors.forEach((color) => {
            combinations.push({ size, color });
        });
    });
    return combinations;
}
export default new DeleteDataService();
