var firebase = require("firebase");
var request = require('request');
var FCM = require('fcm-node');
var colors = require('colors/safe');
var AsciiBanner = require('ascii-banner');
var serverKey = 'AAAAV0D5mJE:APA91bGLdwaaz39JtLYf1REQm8BIurU_D8n07DT0rQrpcZblp78tWBnckQQaDIPDVPhGrm7I587EnDRrKr1S5hFp91GBuybcKS0m7F4cLUgoxYqC_UaDC9fv8nTLmbkqGNYhupnkxvgI';
var fcm = new FCM(serverKey);
var config = {
    apiKey: "AIzaSyDg8YcVLOmtGpGk-8PB6nZcnf9MUVxbEoo",
    authDomain: "fcm-starter-e6fb1.firebaseapp.com",
    databaseURL: "https://fcm-starter-e6fb1.firebaseio.com",
    projectId: "fcm-starter-e6fb1",
    storageBucket: "fcm-starter-e6fb1.appspot.com",
    messagingSenderId: "374752254097"
};
var timeout = 10000;
var devices = [];
var ethInfo = {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    rank: '0',
    price_usd: '0',
    price_btc: '0',
    '24h_volume_usd': '0',
    market_cap_usd: '0',
    available_supply: '0',
    total_supply: '0',
    percent_change_1h: '0',
    percent_change_24h: '0',
    percent_change_7d: '0',
    last_updated: '0'
};
firebase.initializeApp(config);
var rootRef = firebase.database().ref();

AsciiBanner
    .write('Ethereum Notifier')
    .color('red')
    .after('>v{{version}}', 'yellow')
    .before('>[{{name}}<')
    .out();

var objectToArray = function (obj) {
    var arr = [];
    if ('object' !== typeof obj || 'undefined' === typeof obj || Array.isArray(obj)) {
        return obj;
    } else if (obj !== null) {
        Object.keys(obj).map(x => arr.push(obj[x]));
    }
    return arr;
};
function getDevices() {
    info('Requesting list of devices...');
    rootRef.child('Devices').on('value', function (snapshot) {
        devices = objectToArray(snapshot.val());
        log('Number of total devices : ', devices.length);
        log('Number of devices status ON : ', getNumberDevicesByStatus(true));
        log('Number of devices OFF : ', getNumberDevicesByStatus(false));   
    });
};

function getNumberDevicesByStatus(status) {
    var n = 0;
    for (var i = 0; i <= devices.length - 1; i++) {
        if (devices[i].status == status)
            n++;
    }
    return n;
};

function getDate() {
    var d = new Date();
    return d.toLocaleTimeString()
};

function log(text, value) {
    console.log(colors.white(getDate()) + ' | ' + colors.yellow(text) + colors.green(value));
};

function info(text) {
    console.log(colors.white(getDate()) + ' | ' + colors.cyan(text));
};

function notifySuccess(text) {
    console.log(colors.white(getDate()) + ' | ' + colors.green('Successfully sent message with response -> ') + colors.magenta(text));
};

function notifyError(text) {
    console.log(colors.white(getDate()) + ' | ' + colors.red('Error message send width response -> ') + colors.magenta(text));
};
function printFirebaseDatabaseInfo() {
    info('Init Service Ethereum Notifier...');
    info('Firebase Database Information : ')
    log('Firebase API Key : ', config.apiKey);
    log('Firebase Auth Domain : ', config.authDomain);
    log('Firebase Database URL : ', config.databaseURL);
    log('Firebase Project ID : ', config.projectId);
    log('Firebase Storage Bucket : ', config.storageBucket);
    log('Firebase Messaging Sender ID : ', config.messagingSenderId);
    getDevices();
    getEthInfo();
};

function getEthInfo() {
    info('Requesting Ethereum Information From --> https://api.coinmarketcap.com/v1/ticker/ethereum/');
    request('https://api.coinmarketcap.com/v1/ticker/ethereum/', function (error, response, data) {
        if (!error && response.statusCode == 200) {
            ethInfo = JSON.parse(data)[0];
            log('Ethereum Price USD : ', ethInfo.price_usd);
            checkDevicesNotifications();
        }
    });
};

function checkDevicesNotifications() {
    info('Checking Price with Devices Ranges for notification...');
    for (var i = 0; i <= devices.length - 1; i++) {
        var device = devices[i];
        if (device.status && parseInt(device.timestamp) !== parseInt(ethInfo.last_updated)) {
            if (ethInfo.price_usd < device.min || ethInfo.price_usd > device.max) {
                sendNotification(device.token , device.uuid);
            }
        }
    }
    setTimeout(getEthInfo, timeout);
};

function sendNotification(tokenDevice , uuid) {
    var message = {
        to: tokenDevice,
        notification: {
            title: 'Ethereum Price Notify',
            body: 'Ethereum Price ' + ethInfo.price_usd + ' $'
        },
        data:{           
            title: 'Ethereum Price Notify',
            body: 'Ethereum Price ' + ethInfo.price_usd + ' $'
        }

    };   
    fcm.send(message, function (err, response) {
        
        if (err) {
            notifyError(JSON.stringify(err));
        } else {
            notifySuccess(JSON.stringify(response).replace("\\" , ""));
            rootRef.child('Devices/' + uuid + '/timestamp').set(parseInt(ethInfo.last_updated));
        }
    });
};

setTimeout(printFirebaseDatabaseInfo, 2000);