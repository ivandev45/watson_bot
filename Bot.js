const res = 'resources';
const defaultExt = '.jpg';
const defaultAnswer = "Just let me look at your photo and I'l tell you how much does it looks like Shibu Ibu";
const rejectAnswer = 'Wait, your pic is already on the server';
const errorAnswer = 'Wrong format. Expected : ' + defaultExt;
const users = res + '/u_users';
const config = require('./Config');

const telegramBot = require('node-telegram-bot-api');
const watson = require('watson-developer-cloud');
const https = require('https');
const fs = require('fs');
var Stream = require('stream').Transform;

//config data
//
const token = config.telegramToken;
const apiKey = config.watsonApiKey;
const classifierId = config.classifierId;
const version = config.version;
const version_date = config.version_date;
const getDownloadFileUri = config.downloadFileUri;
//
// create folder for cache and logs
if (!fs.existsSync(res)){
    fs.mkdirSync(res);
}
//
console.log('Server started, bot is working...');
//

/*
  *  creating Telegram Bot
  *  polling mode : node app goes to Telegram server (every second)
  *  and get new messages.
* */
const bot = new telegramBot(token, {polling: true});

/*
* watson visual recognition object
* */
const visual_recognition = watson.visual_recognition({
    api_key: apiKey,
    version: version,
    version_date: version_date
});

/**
 * @private
 * @param {String} descriptor
 */

let getParams = (descriptor) => {
    return new Promise((resolve) => {
       resolve({
           // file from cache
           images_file: fs.createReadStream(descriptor),
           // the only classifier used : custom classifier
           classifier_ids : [classifierId],
           // matching score > 0 (every)
           threshold : 0
       });
    });
};

/**
 * @private
 * @param {String} downloadUri
 * @param {Number} userId
 */

function saveImage(downloadUri, userId) {
    return new Promise((resolve) => {
        let name = 'f_' + userId + defaultExt;
        let uniqId = res + '/' + name;
        fs.readdir(res, (err, files) => {
            if (files.indexOf(name) > -1) resolve(false);
            else {
                https.request(downloadUri, (response) => {
                    let data = new Stream();
                    response.on('data', (chunk) => {
                        data.push(chunk);
                    });
                    response.on('end', () => {
                        fs.writeFile(uniqId, data.read(), () => {resolve(uniqId);});
                    });
                }).end();
            }
        });
    });
}

/**
 * @private
 * @param {String} text
 */

var log = (text) => {
    return new Promise(function(resolve, reject) {
        fs.appendFile(users, text+'\n', 'utf-8', function(err) {
            if (err) reject(err);
            else resolve();
        });
    })
};

// any kind of text messages
bot.onText(/.+/, (msg) => {
    bot.sendMessage(msg.from.id, defaultAnswer);
});

//
bot.on('message', async function (msg) {

    await log(new Date() + ' ::' + JSON.stringify(msg.from));

    let from = msg.from.id;
    let filePath = (msg.document) ? //
        // case : attachment
        (await bot.getFile(msg.document.file_id)).file_path : (msg.photo) ?
        // case : media
        (await bot.getFile(msg.photo[msg.photo.length-1].file_id)).file_path :
        // case : other message type
        null;
    // if there is no photo in message - exit
    if (!filePath) return;
    // if file has incorrect format // todo (weak checking)
    if (!filePath.endsWith(defaultExt)) {
        bot.sendMessage(from, errorAnswer);
        return;
    }
    let downloadUri = getDownloadFileUri(token, filePath);
    // download file from server
    let descriptor = await saveImage(downloadUri, from);
    // if photo from certain user is already on server - reject request
    if (!descriptor) {
        bot.sendMessage(from, rejectAnswer);
    }
    else {
        // get data about matching
        visual_recognition.classify(await getParams(descriptor), (err, res) => {
            if (err) throw err;
            else {
                // 1 image, 1 classifier
                res.images[0].classifiers[0].classes.forEach((e) => {
                    // print matching score
                    bot.sendMessage(from, e.class + ' : ' + (e.score*100).toFixed(2) + '%');
                });
                // delete file
                fs.unlinkSync(descriptor);
            }
        });
    }
});



