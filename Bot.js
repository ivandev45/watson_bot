const res = 'resources';
const defaultExt = '.jpg';
const config = require('./Config');

const telegramBot = require('node-telegram-bot-api');
const watson = require('watson-developer-cloud');
const https = require('https');
const fs = require('fs');

const token = config.telegramToken;
const apiKey = config.watsonApiKey;
const classifierId = config.classifierId;
const getDownloadFileUri = config.downloadFileUri;

const bot = new telegramBot(token, {polling: true});

var visual_recognition = watson.visual_recognition({
    api_key: apiKey,
    version: 'v3',
    version_date: '2016-05-20'
});

var getParams = (descriptor) => {
    return new Promise((resolve) => {
       resolve({
           images_file: fs.createReadStream(descriptor),
           classifier_ids : [classifierId]
       });
    });
};

bot.on('message', async function (msg) {
    let filePath = (await bot.getFile(msg.document.file_id)).file_path;
    let downloadUri = getDownloadFileUri(token, filePath);
    let descriptor = await saveImage(downloadUri, msg.from.id);
    if (!descriptor) {
        // wait, only 1 img at the moment for user.
    }
    else {
        let params = await getParams(descriptor);
        console.log(params);
        visual_recognition.classify(params, (err, res) => {
            if (err) throw err;
            else {
                console.log(JSON.stringify(res, null, 2));
                bot.sendMessage(msg.from.id, JSON.stringify(res, null, 2));
                //fs.unlinkSync(descriptor); // todo
            }
        });
    }
});

function saveImage(downloadUri, userId) {
    return new Promise((resolve) => {
        let uniqId = res + '/f_' + userId + defaultExt;
        console.log(uniqId);
        fs.readdir(res, (err, files) => {
            if (files.indexOf(uniqId) > -1) resolve(false);
            else {
                let file = fs.createWriteStream(uniqId);
                https.get(downloadUri, async (response) => {
                    await response.pipe(file);
                    resolve(uniqId);
                });
            }
        });
    });
}

// successful test
visual_recognition.classify({
    images_file: fs.createReadStream('resources/f_274883283.jpg'),
    classifier_ids : [classifierId]
}, function(err, res) {
    if (err) console.log(err);
    else console.log(JSON.stringify(res, null, 2));
});