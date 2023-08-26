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
exports.newApiKeyEvent = exports.connect = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
const node_events_1 = require("node:events");
function connect() {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error('MONGO_URI not set!');
        }
        console.log('Connecting to MongoDB...');
        yield mongoose_1.default.connect(uri);
        mongoose_1.default.connection.useDb('weather');
        mongoose_1.default.connection.on('connected', () => {
            console.log('Connected to MongoDB!');
        });
        mongoose_1.default.connection.on('error', (err) => {
            console.error(`Mongoose connection error:\n${err.stack}`);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('Disconnected from MongoDB!');
        });
    });
}
exports.connect = connect;
exports.newApiKeyEvent = new node_events_1.EventEmitter();
