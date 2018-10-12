let Constants = {
    CONFIG_FILE_NAME: 'byobconfig.json'
};

Constants = {
    ...Constants,
    CONFIG_FILE_PATH: `./${Constants.CONFIG_FILE_NAME}`,
    TEMPLATE_DIR_PATH: 'templates'
};

export default Constants;
