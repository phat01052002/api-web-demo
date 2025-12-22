import BaseRepository from "./BaseRepository.js";

class UserRepository extends BaseRepository {
    modelName = 'User';

    constructor() {
        super();
        this.db = this.prisma.user;
    }

    findByEmail(email) {
        return this.db.findUnique({
            where: { email: email },
        });
    }

    findUserByEmailAndPassword(email, password) {
        return this.db.findUnique({
            where: { email: email, password: password },
        });
    }

    findByRefreshToken(refreshToken) {
        return this.db.findFirst({ where: { refreshToken: refreshToken } });
    }

    async findUserReview(userId) {
        return this.db.findFirst({ where: { id: userId }, select: { email: true, image: true,reviewIdList:true } });
    }
}

export default new UserRepository();
