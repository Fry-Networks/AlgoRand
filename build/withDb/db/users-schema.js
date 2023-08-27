"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = exports.getUserByAddress = exports.usersSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.usersSchema = new mongoose_1.default.Schema({
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    byod: {
        licenses: { type: [String], default: [] },
        payments: { type: [Date], default: [] }
    }
});
const UserModel = mongoose_1.default.models.user || mongoose_1.default.model('user', exports.usersSchema);
exports.default = UserModel;
function getUserByAddress(address) {
    return __awaiter(this, void 0, void 0, function* () {
        let user = yield UserModel.findOne({ address: address });
        if (!user)
            user = yield UserModel.create({ address: address });
        return user;
    });
}
exports.getUserByAddress = getUserByAddress;
function getUser(email, address, noCreate) {
    return __awaiter(this, void 0, void 0, function* () {
        let user = email ? yield UserModel.findOne({ email: email }) : yield UserModel.findOne({ address: address });
        if (!user && !noCreate)
            user = yield UserModel.create({ email: email, address: address });
        return user;
    });
}
exports.getUser = getUser;
