import StylesRepository from '../repositories/StylesRepository.js';

class StyleService {
    async findStylesByCategory(categoryId) {
        try {
            const styles = await StylesRepository.db.findMany({
                where: {
                    categoryId: categoryId,
                },
            });
            if (styles) {
                return styles;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async addStyle(name, categoryId) {
        try {
            const style = await StylesRepository.db.create({
                data: {
                    categoryId: categoryId,
                    name: name,
                },
            });
            if (style) {
                return style;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
}
export default new StyleService();
