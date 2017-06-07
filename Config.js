/**
 * Created by root on 06.06.17.
 */

const config = {
    watsonApiKey : '98627e88a32c1b7c730e7140d0e2a3dda2b70243',
    telegramToken : '346855979:AAFzYCtm5HWagYnQfsVNBjUGLlB_VoKfPbg',
    classifierId : "Dog_1456209710",
    version : 'v3',
    version_date: '2016-05-20',
    downloadFileUri : (token, path) => {
        return 'https://api.telegram.org/file/bot' + token + '/' + path;
    }
};

module.exports = config;
