import CategoryRepository from '../repositories/CategoryRepository.js';
import ColorRepository from '../repositories/ColorRepository.js';
import ProductRepository from '../repositories/ProductRepository.js';
import StylesRepository from '../repositories/StylesRepository.js';
import TypeRepository from '../repositories/TypeRepository.js';

class ProductService {
    async findProductByCategory(categoryId, take, step, req) {
        try {
            const products = await ProductRepository.findProductByCategory(categoryId, take, step, req);
            if (products) {
                if (req.body.options.sort == null) {
                    return products;
                }
                if (req.body.options.sort == 'desc') {
                    const sortedProducts = products.products.sort((a, b) => {
                        return b.sellPrice - a.sellPrice; // Sắp xếp giảm dần
                    });
                    return sortedProducts;
                }
                if (req.body.options.sort == 'asc') {
                    const sortedProducts = products.sort((a, b) => {
                        return a.sellPrice - b.sellPrice; // Sắp xếp tăng dần
                    });
                    return sortedProducts;
                }
                if (req.body.options.sort == 'discount') {
                    const productDiscounts = products.map((item) => {
                        if (item.virtualPrice > 0) {
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
    async findRelatedProductByCategory(categoryId, take, step) {
        try {
            const products = await ProductRepository.findRelatedProductByCategory(categoryId, take, step);
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
    async findNewProducts(take, step, req) {
        try {
            const products = await ProductRepository.findNewProducts(take, step, req);
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
    async findProductByCategoryName(categoryName, take, step, req) {
        try {
            const products = await ProductRepository.findProductByCategoryName(categoryName, take, step, req);
            if (products) {
                return products;
            } else {
                return [];
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async findProductByName(searchTerm) {
        try {
            const product = await ProductRepository.db.findMany({
                where: {
                    name: { contains: searchTerm, mode: 'insensitive' },
                },
            });
            if (product) {
                return product;
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }

    async findProductByNameForGuest(req) {
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

    async getProductById(productId) {
        try {
            const product = await ProductRepository.find(productId);
            if (!product) {
                return 'Product not found';
            }
            const category = await CategoryRepository.find(product.categoryId);

            let type = null;
            if (product.typeId) type = await TypeRepository.find(product.typeId);

            const color = await ColorRepository.find(product.colorId);

            const styles = await Promise.all(product.styleIds.map((styleId) => StylesRepository.find(styleId)));

            return {
                ...product,
                categoryName: category ? category.name : null,
                typeName: type ? type.name : null,
                colorName: color ? color.name : null,
                colorCode: color ? color.colorCode : null,
                styleNames: styles.map((style) => (style ? style.name : null)),
            };
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async getAllProductByStep(take, step) {
        try {
            const products = await ProductRepository.findAllProductByStep(take, step);
            const count = await ProductRepository.getProductCount();
            return {
                message: 'Success',
                products: products,
                count: count,
            };
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async getAllProducts() {
        try {
            const products = await ProductRepository.findAll();
            return products;
        } catch (e) {
            return 'Fail';
        }
    }
    async getProducts(req) {
        try {
            const products = await ProductRepository.findProductsByListId(req);
            return products;
        } catch (e) {
            return 'Fail';
        }
    }
    async saveProduct(req) {
        try {
            const product = await ProductRepository.saveUpload(req);

            return {
                message: 'Success',
                product: get,
            };
        } catch (e) {
            console.log(e.message);
            return {
                message: 'Fail',
                product: null,
            };
        }
    }
    async searchProductByName(searchTerm, categoryName) {
        try {
            const category = await CategoryRepository.db.findFirst({
                where: {
                    name: categoryName,
                },
                select: {
                    id: true,
                },
            });
            const product = await ProductRepository.db.findMany({
                where: {
                    name: { contains: searchTerm, mode: 'insensitive' },
                    categoryId: category.id,
                    active: true,
                },
            });
            if (product) {
                return product;
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
}
export default new ProductService();
