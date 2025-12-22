import CommissionRepository from '../repositories/CommissionRepository.js';

class CommissionService {
    async saveCommission(commission) {
        try {
            const newCommission = await CommissionRepository.saveNoReq(commission);
            return newCommission;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async getCommissionByMonthAndYear(month, year) {
        try {
            const commissions = await CommissionRepository.findByMonthAndYear(month, year);
            return commissions;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async ConfirmCommissionIsPaid(commissionId) {
        try {
            const commission = await CommissionRepository.db.findFirst({ where: { id: commissionId } });
            if (!commission.isPaid) await CommissionRepository.update(commissionId, { isPaid: true });
            return commission;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
}
export default new CommissionService();
