import ProductDetailRepository from '../repositories/ProductDetailRepository.js';
import ProductRepository from '../repositories/ProductRepository.js';
import removeAccents from 'remove-accents';
import fs from 'fs/promises';
import path from 'path';
import DiscountRepository from '../repositories/DiscountRepository.js';
class GuestService {
    productDAO = (product) => {
        return {
            id: product.id,
            name: product.name,
            active: product.active,
            materialId: product.materialId,
            originId: product.originId,
            styleId: product.styleId,
            brandId: product.brandId,
            materialOrther: product.materialOrther,
            originOrther: product.originOrther,
            styleOrther: product.styleOrther,
            brandOrther: product.brandOrther,
            describe: product.describe,
            price: product.price,
            image: product.image,
            userFavoriteIdList: product.userFavoriteIdList,
            productCIdList: product.productCIdList,
            reviewIdList: product.reviewIdList,
            //{"color":"[red,green,blue]","size":"[M,L,XL]"}
            options: product.options,
            categoryId: product.categoryId,
            shopId: product.shopId,
        };
    };
    ////////////////////////////////////
    async findProductById(productId) {
        try {
            const product = await ProductRepository.findById(productId);
            if (product) {
                if (product.active && product.activeByShop) {
                    return product;
                } else {
                    return 'Product block';
                }
            } else {
                return '404';
            }
        } catch (e) {
            console.error(e.message);
            // throw new Error('Error retrieving product');
            return '404'
        }
    }
    ////////////////////////////////////////
    async findProductsByShop_Sorted(shopId, take) {
        try {
            const products = await ProductDetailRepository.findProductByShop_Sorted(shopId, 10);
            if (products) {
                return products;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);

            return 'Fail';
        }
    }

    async findProductsTopByShop(shopId, listProductsId) {
        try {
            const productsHot = await ProductRepository.findTopProductsByShop(shopId, listProductsId);
            if (productsHot) {
                return productsHot;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);

            return 'Fail';
        }
    }
    async findProduct(take) {
        try {
            const products = await ProductDetailRepository.findProduct(take);
            if (products) {
                return products;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);

            return 'Fail';
        }
    }
    async findProductByName(req) {
        try {
            const product = await ProductRepository.findProductByName(req.body.name, req.body.take);
            if (product) {
                return product;
            } else {
                return 'Fail';
            }
        } catch {
            return 'Fail';
        }
    }
    async findProductSimilar(productId, take) {
        try {
            const productCurrent = await ProductRepository.find(productId);
            if (productCurrent) {
                const productsSimilar = await ProductRepository.findProductSimilar(
                    productCurrent.categoryId,
                    productCurrent.shopId,
                    productId,
                    take,
                );
                return productsSimilar;
            } else {
                return 'Fail';
            }
        } catch {
            return 'Fail';
        }
    }

    async findKeywordHot(limit) {
        try {
            const logFilePath = path.join(process.cwd(), 'search.log');
            if (logFilePath) {
                try {
                    let keywords = [];
                    const data = await fs.readFile(logFilePath, 'utf8'); // Đọc file log với await
                    const keywordCounts = {};
                    // Phân tích
                    const logs = data
                        .split(/(?<=})/)
                        .map((line) => line.trim())
                        .filter((line) => line !== '');

                    logs.forEach((line) => {
                        console.log(line);
                        const log = JSON.parse(line);
                        const keyword = log.message
                            .match(/User searched for: (.+)/)[1]
                            .trim()
                            .toLowerCase(); // Lấy từ khóa
                        if (keyword) {
                            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1; // Đếm
                        }
                    });

                    const sortedKeywords = Object.entries(keywordCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, limit);
                    sortedKeywords.forEach(([keyword, count]) => {
                        keywords.push({ keyword, count });
                    });
                    return keywords;
                } catch (err) {
                    console.error('Error reading log file:', err);
                    return [];
                }
            } else {
                return [];
            }
        } catch {
            return 'Fail';
        }
    }

    async findProductTop() {
        try {
            const productsTop = await ProductRepository.findProductTop();
            if (productsTop) {
                return productsTop;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async findProductNew() {
        try {
            const productsNew = await ProductRepository.findProductNew();
            if (productsNew) {
                return productsNew;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async findProductByShop(shopId, take, step, req) {
        try {
            const products = await ProductRepository.findProductByShop(shopId, take, step, req);
            if (products) {
                if (req.body.options.sort == null) {
                    return products;
                }
                if (req.body.options.sort == 'desc') {
                    const sortedProducts = products.sort((a, b) => {
                        const finalPriceA = a.price * (1 - (a.percentDiscountTop != null ? a.percentDiscountTop : 0));
                        const finalPriceB = b.price * (1 - (b.percentDiscountTop != null ? b.percentDiscountTop : 0));

                        return finalPriceB - finalPriceA; // Sắp xếp giảm dần
                    });
                    return sortedProducts;
                }
                if (req.body.options.sort == 'asc') {
                    const sortedProducts = products.sort((a, b) => {
                        const finalPriceA = a.price * (1 - (a.percentDiscountTop != null ? a.percentDiscountTop : 0));
                        const finalPriceB = b.price * (1 - (b.percentDiscountTop != null ? b.percentDiscountTop : 0));

                        return finalPriceA - finalPriceB; // Sắp xếp giảm dần
                    });
                    return sortedProducts;
                }
                if (req.body.options.sort == 'discount') {
                    const productDiscounts = products.map((item) => {
                        if (item.percentDiscountTop > 0) {
                            return item;
                        }
                    });
                    return productDiscounts;
                }
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async findProductByCategory(categoryId, take, step, req) {
        try {
            const products = await ProductRepository.findProductByCategory(categoryId, take, step, req);
            if (products) {
                if (req.body.options.sort == null) {
                    return products;
                }
                if (req.body.options.sort == 'desc') {
                    const sortedProducts = products.sort((a, b) => {
                        const finalPriceA = a.price * (1 - (a.percentDiscountTop != null ? a.percentDiscountTop : 0));
                        const finalPriceB = b.price * (1 - (b.percentDiscountTop != null ? b.percentDiscountTop : 0));

                        return finalPriceB - finalPriceA; // Sắp xếp giảm dần
                    });
                    return sortedProducts;
                }
                if (req.body.options.sort == 'asc') {
                    const sortedProducts = products.sort((a, b) => {
                        const finalPriceA = a.price * (1 - (a.percentDiscountTop != null ? a.percentDiscountTop : 0));
                        const finalPriceB = b.price * (1 - (b.percentDiscountTop != null ? b.percentDiscountTop : 0));

                        return finalPriceA - finalPriceB; // Sắp xếp giảm dần
                    });
                    return sortedProducts;
                }
                if (req.body.options.sort == 'discount') {
                    const productDiscounts = products.map((item) => {
                        if (item.percentDiscountTop > 0) {
                            return item;
                        }
                    });
                    return productDiscounts;
                }
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async findProductDetailMany(req) {
        try {
            const productDetails = await ProductDetailRepository.findProductDetailMany(req);
            if (productDetails) {
                return productDetails;
            } else {
                return 'Fail';
            }
        } catch {
            return 'Fail';
        }
    }

    async findDiscountById(discountId) {
        try {
            const discount = await DiscountRepository.findDiscountById(discountId);
            if (discount) {
                return discount;
            } else {
                return undefined;
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async findDiscountMany(req) {
        try {
            const discountMany = await DiscountRepository.findDiscountMany(req);
            if (discountMany) {
                return discountMany;
            } else {
                return 'Fail';
            }
        } catch {
            return 'Fail';
        }
    }
}

export default new GuestService();
