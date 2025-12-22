import CategoryRepository from '../repositories/CategoryRepository.js';

class CategoryService {
    async saveCategory(req) {
        try {
            const newCategory = await CategoryRepository.saveNoReq(req);
            return newCategory;
        } catch (e) {
            console.log(e.message)
            return 'Fail';
        }
    }
    async getCategory(categoryId) {
        try {
            const category = await CategoryRepository.find(categoryId);
            return category;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async getAllCategories() {
        try {
            const categories = await CategoryRepository.findAll();
            return categories;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async deleteCategory(categoryId) {
        try {
            await CategoryRepository.delete(categoryId);
            return 'Success';
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
}
export default new CategoryService();
