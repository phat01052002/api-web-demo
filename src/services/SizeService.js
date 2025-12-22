import SizeRepository from '../repositories/SizeRepository.js';

class SizeService {
    async findSizesByCategory(categoryId) {
        try {
            const sizes = await SizeRepository.db.findMany({
                where: {
                    categoryId: categoryId,
                },
            });
            if (sizes) {
                return sizes;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async addSize(sizeName, categoryId) {
        try {
            const size = await SizeRepository.db.create({
                data: {
                    categoryId: categoryId,
                    name: sizeName,
                },
            });
            if (size) {
                return size;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
}
export default new SizeService();
