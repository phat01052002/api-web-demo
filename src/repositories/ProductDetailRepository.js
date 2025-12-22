import BaseRepository from './BaseRepository.js';

class ProductDetailRepository extends BaseRepository {
    modelName = 'ProductDetail';

    constructor() {
        super();
        this.db = this.prisma.productDetail;
        this.dbProduct = this.prisma.product;
        this.dbDiscount = this.prisma.discount;
    }
    findById(producDetailId) {
        return this.db.findMany({
            where: { id: producDetailId },
        });
    }
    async findAllProductDetailByProduct(productId) {
        const productDetails = await this.db.findMany({
            where: {
                productId: productId,
                active: true,
                activeByShop: true,
            },
        });
        return productDetails;
    }
    findByProductId(productId) {
        return this.db.findMany({
            where: { productId: productId, active: true },
        });
    }
    async findProductByShop_Sorted(shopId, take) {
        const products = await this.dbProduct.findMany({
            where: {
                shopId: shopId,
                active: true,
                activeByShop: true,
            },
            select: {
                id: true, // Chỉ lấy trường listProductDetailId
            },
        });
        const productIdList = products.map((product) => product.id);
        const groupedProductDetails = await this.db.groupBy({
            by: ['productId'], // Nhóm theo productId
            where: {
                productId: {
                    in: productIdList, // Lọc theo danh sách productId
                },
                active: true,
            },
            _sum: {
                numberSold: true, // Tính tổng số lượng đã bán
            },
            orderBy: {
                _sum: {
                    numberSold: 'desc', // Sắp xếp theo tổng số lượng đã bán giảm dần
                },
            },
        });

        return groupedProductDetails;
    }

    async findProduct(take) {
        const products = await this.dbProduct.findMany({
            where: {
                active: true,
                activeByShop: true,
            },
            select: {
                id: true, // Chỉ lấy trường listProductDetailId
            },
        });

        const productIdList = products.map((product) => product.id);
        const groupedProductDetails = await this.db.groupBy({
            by: ['productId'], // Nhóm theo productId
            where: {
                productId: {
                    in: productIdList, // Lọc theo danh sách productId
                },
                active: true,
            },
            _sum: {
                numberSold: true, // Tính tổng số lượng đã bán
            },
            orderBy: {
                _sum: {
                    numberSold: 'desc', // Sắp xếp theo tổng số lượng đã bán giảm dần
                },
            },
            take: take,
        });

        return groupedProductDetails;
    }

    async findProductDetailMany(req) {
        let productDetails = await this.db.findMany({
            where: {
                id: {
                    in: req.body.listProductDetailId,
                },
                active: true,
            },
        });
        const listProductId = productDetails.map((item) => item.productId);
        const product = await this.dbProduct.findMany({
            where: {
                id: {
                    in: listProductId,
                },
            },
        });
        productDetails.map((productDetail) => {
            const index = product.findIndex((product) => product.productCIdList.includes(productDetail.id));
            if (index != -1) productDetail.shopId = product[index].shopId;
        });
        return productDetails;
    }
    async findProductDetailManyShop(productDetailIdList) {
        let productDetails = await this.db.findMany({
            where: {
                id: {
                    in: productDetailIdList,
                },
                activeByShop: true,
            },
            select: {
                id: true,
                name: true,
                discountId: true,
                option1: true,
                option2: true,
                productId: true,
                images: true,
            },
        });
        return productDetails;
    }
    async findProductDetailByProductId(productId) {
        let productDetails = await this.db.findMany({
            where: {
                productId: productId,
                activeByShop: true,
            },
        });
        return productDetails;
    }
}

export default new ProductDetailRepository();
