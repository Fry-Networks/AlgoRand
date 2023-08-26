"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceModel = exports.devicesSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.devicesSchema = new mongoose_1.default.Schema({
    user_id: mongoose_1.default.Schema.Types.ObjectId,
    miner_key: String,
    name: String,
    created_at: { type: Date, default: Date.now },
    is_registered: { type: Boolean, default: false },
    registered_at: Date
});
exports.DeviceModel = mongoose_1.default.model('devices', exports.devicesSchema);
