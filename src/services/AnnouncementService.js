import AnnouncementRepository from '../repositories/AnnouncementRepository.js';

class AnnouncementService {
    async getAllAnnouncements() {
        try {
            const announcements = await AnnouncementRepository.findAll();
            return announcements;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async saveAnnouncement(announcement) {
        try {
            const newAnnouncement = await AnnouncementRepository.saveNoReq(announcement);
            return newAnnouncement;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async deleteAnnouncement(announcementId) {
        try {
            await AnnouncementRepository.delete(announcementId);
            return 'Success';
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
}
export default new AnnouncementService();
