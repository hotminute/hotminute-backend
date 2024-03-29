const {RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole} = require('agora-access-token');

const AppID = 'b1350a7f93bc4fe18bdc2e3b3a8952e1';
const AppCertificate = '9b06228fbb2f4248a6c6ad5bd8badd05';
const Role = RtcRole.PUBLISHER;

const EXPIRY_IN_SECONDS = 240

exports.generateRTCToken = function generateRTCToken(uid, channel){
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const expiryTime = currentTimestamp + EXPIRY_IN_SECONDS
    const token = RtcTokenBuilder.buildTokenWithAccount(AppID, AppCertificate, channel, uid, Role, 0);
    console.log(`UID: ${uid}, Channel: ${channel}, Token: ${token}`);
    return token;
}

// TEST FUNCTION
// generateRTCToken(Math.floor(Math.random() * 100000), "TestChannel")
