'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var Constants = {
    CONFIG_FILE_NAME: 'byobconfig.json'
};

Constants = _extends({}, Constants, {
    CONFIG_FILE_PATH: './' + Constants.CONFIG_FILE_NAME,
    TEMPLATE_DIR_PATH: 'templates'
});

exports.default = Constants;