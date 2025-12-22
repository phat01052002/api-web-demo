import { getDbFields } from '../helpers/dbhelper.js';
import { prisma } from '../services/prisma.js';

export default class BaseRepository {
    modelName;
    db;
    prisma;

    constructor() {
        this.prisma = prisma;
    }

    getFields() {
        if (!this.modelName) {
            return null;
        }
        return getDbFields(this.modelName);
    }

    getSelectFields(except = []) {
        let select = {};
        const fields = this.getFields();
        fields.forEach((field) => {
            if (!except.includes(field.name)) {
                select[field.name] = true;
            }
        });
        return select;
    }

    // https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#filter-conditions-and-operators
    getSearchOptions(req, options = {}) {
        let select = options.select || null;
        if (!select) {
            select = this.getSelectFields();
        }

        let where = {},
            whereOptions = options.whereOptions || {};
        let fieldTypes = options.fieldTypes || {};

        // check from query params
        for (let key in req.query) {
            if (['page', 'limit', 'sort', 'sortType'].includes(key)) {
                continue;
            }

            if (!req.query[key] || !select[key]) {
                continue;
            }

            let operator = whereOptions[key] || 'equals';
            let fieldType = fieldTypes[key] || 'String';
            let fieldValue = '';

            switch (fieldType) {
                case 'DateTime':
                    fieldValue = new Date(req.query[key]).toISOString();
                    break;
                case 'Int':
                    fieldValue = parseInt(req.query[key]);
                    break;
                case 'Float':
                    fieldValue = parseFloat(req.query[key]);
                    break;
                default:
                    fieldValue = req.query[key];
                    break;
            }

            where[key] = {
                [operator]: fieldValue,
            };
        }

        // Custom query meta by zId
        if (req.query.bookContactId) {
            where.meta = {
                path: '$.id',
                equals: req.query.bookContactId,
            };
        }

        let orderBy = [];
        if (req.query.sort) {
            const sort = JSON.parse(req.query.sort);
            for (let key in sort) {
                if (select[key]) {
                    const sortType = ['desc', 'descend'].includes(sort[key]) ? 'desc' : 'asc';
                    orderBy.push({ [key]: sortType });
                }
            }
        }

        return { select, where, orderBy };
    }

    find(id, options = {}) {
        let select = options.select || null;
        // if (!select) {
        //   select = this.getSelectFields();
        // }

        return this.db.findUnique({
            where: { id: id },
            select: select,
        });
    }

    findAll(options = {}) {
        const { select, where, orderBy } = options;
        return this.db.findMany({
            select: select || this.getSelectFields(),
            where: where || {},
            orderBy: orderBy || [],
        });
    }

    query(options = {}) {
        return this.db.findMany(options);
    }

    queryOne(options = {}) {
        return this.db.findFirst(options);
    }

    save(req) {
        const id = req.params?.id || req.id;
        const body = req.body || {};
        let data = {};
        const fields = this.getFields();
        fields.forEach((field) => {
            let fieldName = field.name;
            if (fieldName === 'createdAt' || fieldName === 'modifiedAt') {
                data[fieldName] = new Date();
            }
            if (fieldName === 'createdBy') {
                data[fieldName] = (req.user && req.user.id) || 0;
            }
            if (fieldName !== 'id') {
                if (typeof body[fieldName] !== 'undefined') {
                    data[fieldName] = body[fieldName];
                }
            }
        });
        if (id) {
            return this.db.update({
                where: { id: id },
                data: data,
            });
        }

        return this.db.create({ data: data });
    }

    saveNoReq(body) {
        const id = body?.id;
        let data = {};
        const fields = this.getFields();
        fields.forEach((field) => {
            let fieldName = field.name;
            if (fieldName === 'createdAt' || fieldName === 'modifiedAt') {
                data[fieldName] = new Date();
            }
            if (fieldName === 'createdBy') {
                data[fieldName] = (req.user && req.user.id) || 0;
            }
            if (fieldName !== 'id') {
                if (typeof body[fieldName] !== 'undefined') {
                    data[fieldName] = body[fieldName];
                }
            }
        });
        if (id) {
            return this.db.update({
                where: { id: id },
                data: data,
            });
        }

        return this.db.create({ data: data });
    }

    saveUpload(req) {
        const id = req?.body.id;
        const body = req.body || {};
        let data = {};
        const fields = this.getFields();
        fields.forEach((field) => {
            let fieldName = field.name;
            if (fieldName === 'createdAt' || fieldName === 'modifiedAt') {
                data[fieldName] = new Date();
            }
            if (fieldName === 'createdBy') {
                data[fieldName] = (req.user && req.user.id) || 0;
            }
            if (fieldName !== 'id') {
                if (typeof body[fieldName] !== 'undefined') {
                    data[fieldName] = body[fieldName];
                }
            }
        });
        if (id) {
            return this.db.update({
                where: { id: id },
                data: data,
            });
        }

        return this.db.create({ data: data });
    }
    update(id, data) {
        if (id) {
            return this.db.update({
                where: { id: id },
                data: data,
            });
        }
    }
    delete(id) {
        return this.db.delete({
            where: { id: id },
        });
    }
}
