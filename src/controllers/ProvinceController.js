import axios from 'axios';
import httpStatus from 'http-status';

class ProvinceController {
    initRoutes(app) {
        app.get('/province', this.getCity);
        app.get('/province/district/:id', this.getDistrict);
        app.get('/province/ward/:id', this.getWard);
    }
    async test(req, res) {
        return res.status(httpStatus.OK).json({ message: 'HELLO KLTN' });
    }
    async getCity(req, res) {
        try {
            const resCity = await axios.get('https://vapi.vnappmob.com/api/v2/province');
            return res.status(httpStatus.OK).json(resCity.data);
        } catch (e) {
            console.log(e.message);
            return res.status(httpStatus.BAD_REQUEST).json({ message: 'Fail' });
        }
    }

    async getDistrict(req, res) {
        try {
            const resDistrict = await axios.get(`https://vapi.vnappmob.com/api/v2/province/district/${req.params.id}`);
            return res.status(httpStatus.OK).json(resDistrict.data);
        } catch (e) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: 'Fail' });
        }
    }

    async getWard(req, res) {
        try {
            const resWard = await axios.get(`https://vapi.vnappmob.com/api/v2/province/ward/${req.params.id}`);
            return res.status(httpStatus.OK).json(resWard.data);
        } catch (e) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: 'Fail' });
        }
    }
}

export default new ProvinceController();
