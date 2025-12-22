import BannerRepository from '../repositories/BannerRepository.js';

class BannerService {
    async getBannerByPosition(position) {
        try {
            const banner = await BannerRepository.db.findFirst({
                where: {
                    position: position,
                },
            });
            return banner;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async getAllBanners() {
        try {
            const banners = await BannerRepository.findAll();
            return banners;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async saveBanner(req) {
        try {
            const newBanner = await BannerRepository.saveUpload(req);
            return newBanner;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async deleteBanner(bannerId) {
        try {
            await BannerRepository.delete(bannerId);
            return 'Success';
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
}
export default new BannerService();
