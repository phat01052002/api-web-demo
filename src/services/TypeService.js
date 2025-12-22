import TypeRepository from '../repositories/TypeRepository.js';

class TypeService {
    async findTypesByCategory(categoryId) {
        try {
            const types = await TypeRepository.db.findMany({
                where: {
                    categoryId: categoryId,
                },
            });
            if (types) {
                return types;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
    async addType(name, categoryId) {
        try {
            const type = await TypeRepository.db.create({
                data: {
                    categoryId: categoryId,
                    name: name,
                },
            });
            if (type) {
                return type;
            } else {
                return 'Fail';
            }
        } catch (e) {
            console.error(e.message);
            return 'Fail';
        }
    }
}
export default new TypeService();
