import UserRepository from "../../repositories/UserRepository.js";

class AdminService {
    async confirmCTV(userId) {
        try {
            const user = await UserRepository.find(userId);
            if (user) {
                await UserRepository.update(user.id, { status: 'ACTIVE' });
                return 'Success';
            }
            else return 'Fail';
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
}
export default new AdminService();
