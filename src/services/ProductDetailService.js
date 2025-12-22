import ColorRepository from '../repositories/ColorRepository.js';
import ProductDetailRepository from '../repositories/ProductDetailRepository.js';
import ProductRepository from '../repositories/ProductRepository.js';
import SizeRepository from '../repositories/SizeRepository.js';

class ProductDetailService {
    async saveProductDetail(data) {
        try {
            console.log(data)
            const productDetail = await ProductDetailRepository.saveNoReq(data);
            
            await ProductRepository.db.update({
                where: {
                    id: productDetail.productId,
                },
                data: {
                    productCIdList: {
                        push: productDetail.id,
                    },
                },
            });
    
            return {
                message: 'Success',
                productDetail: productDetail,
            };
        } catch (e) {
            console.error(e);
            return {
                message: 'Fail',
                productDetail: null,
            };
        }
    }
    async getProductDetailByProductId(productId) {
        try {
            const productDetails = await ProductDetailRepository.db.findMany({
                where: {
                    productId: productId,
                },
            });
            const sizeIds = productDetails.map((detail) => detail.sizeId);

            const sizes = await Promise.all(sizeIds.map((sizeId) => SizeRepository.find(sizeId)));

            const productDetailsWithSizeName = productDetails.map((detail, index) => ({
                ...detail,
                sizeName: sizes[index] ? sizes[index].name : null,
            }));

            return productDetailsWithSizeName;
        } catch (e) {
            console.log(e.message)
            return 'Fail';
        }
    }

    async findProductDetailMany(req) {
        try {
            const productDetails = await ProductDetailRepository.db.findMany({
                where: {
                    id: {
                        in: req.body.listProductDetailId
                    }
                }
            });
            const sizeIds = productDetails.map((detail) => detail.sizeId);

            const sizes = await Promise.all(sizeIds.map((sizeId) => SizeRepository.find(sizeId)));

            const colorIds = productDetails.map((detail) => detail.colorId);

            const colors = await Promise.all(colorIds.map((colorId) => ColorRepository.find(colorId)));

            const productDetailsWithSizeAndColorName = productDetails.map((detail, index) => ({
                ...detail,
                sizeName: sizes[index] ? sizes[index].name : null,
                colorName: colors[index] ? colors[index].name : null,
            }));
            if (productDetailsWithSizeAndColorName) {
                return productDetailsWithSizeAndColorName;
            } else {

                return 'Fail';
            }
        } catch(e) {
            console.log(e.message)
            return 'Fail';
        }
    }
}
export default new ProductDetailService();
