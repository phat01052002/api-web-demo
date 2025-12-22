import AuthController from '../controllers/auth/AuthController.js';
import ProvinceController from '../controllers/ProvinceController.js';
import UserController from '../controllers/user/UserController.js';
import AdminController from '../controllers/admin/AdminController.js';
import GuestController from '../controllers/guest/GuestController.js';
export function initApplication(app) {
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };

    initRoutes(app);
    //Scheduled.initJobs();
}
export function initRoutes(app) {
    AdminController.initRoutes(app);
    AuthController.initRoutes(app);
    UserController.initRoutes(app);
    ProvinceController.initRoutes(app);
    GuestController.initRoutes(app);
}
