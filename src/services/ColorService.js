import ColorRepository from '../repositories/ColorRepository.js';

class ColorService {
    async findColorsByCategory(categoryId) {
        try {
            const colors = await ColorRepository.db.findMany({
                where: {
                    categoryId: categoryId,
                },
            });
            if (colors) {
                return colors;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async addColor(name, categoryId) {
        try {
            const color = await ColorRepository.db.create({
                data: {
                    categoryId: categoryId,
                    name: name,
                },
            });
            if (color) {
                return color;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
}
export default new ColorService();
