let Constants = {
    CONFIG_FILE_NAME: 'byobconfig.json'
};

Constants = {
    ...Constants,
    CONFIG_FILE_PATH: `./${Constants.CONFIG_FILE_NAME}`
}

export default Constants;
