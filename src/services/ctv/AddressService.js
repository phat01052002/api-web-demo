import { ObjectId } from 'mongodb';
import AddressRepository from '../../repositories/AddressRepository.js';
import UserRepository from '../../repositories/UserRepository.js';

class AddressService {
    async save(req) {
        try {
            req.body.userId = req.user.id;

            const resSaveAddress = await AddressRepository.save(req);
            //
            if (resSaveAddress) {
                await UserRepository.update(req.user.id, {
                    addressIdList: [...req.user.addressIdList, resSaveAddress.id],
                });
            }
            if (req.user.defaultAddressId == '') {
                await UserRepository.update(req.user.id, {
                    defaultAddressId: resSaveAddress.id,
                });
            }
            //
            return resSaveAddress;
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async get(req) {
        try {
            const addressIdList = req.user.addressIdList;
            if (addressIdList != []) {
                const addressPromises = addressIdList.map(async (addressId) => {
                    const address = await AddressRepository.find(addressId);
                    return address || null;
                });
                const addresses = await Promise.all(addressPromises);
                return addresses;
            } else {
                return [];
            }
        } catch (e) {
            return 'Fail';
        }
    }

    async remove(req, addressId) {
        try {
            await AddressRepository.delete(addressId);
            return 'Success';
        } catch {
            return 'Fail';
        }
    }

    async update(req, addressId) {
        try {
            const resUpdate = await AddressRepository.update(addressId, req.body);
            return resUpdate;
        } catch {
            return 'Fail';
        }
    }
}
export default new AddressService();
