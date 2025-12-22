import OrderDetailRepository from "../repositories/OrderDetailRepository.js";

class OrderDetailService {
    async getOrderDetailByListId(orderDetailIdList) {
        try {
            const orderDetails = await OrderDetailRepository.findOrderDetailByListId(orderDetailIdList);
            return orderDetails;
        } catch (e) {
            return 'Fail';
        }
    }
    async getOrderDetailByOrderId(orderId) {
        try {
            const orderDetails = await OrderDetailRepository.db.findMany({where: {
                orderId: orderId
            }});
            return orderDetails;
        } catch (e) {
            return 'Fail';
        }
    }

}
export default new OrderDetailService();