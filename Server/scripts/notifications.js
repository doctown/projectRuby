var twillio = require('twilio');

// TODO: Ensure environment variables are set for using twilio
//var accountSid = process.env.TWILIO_SID;
//var authToken = process.env.TWILIO_TOKEN;
//var client = require('twilio')(accountSid, authToken);

module.exports.sendSMSNotification = function(senderNumber, recipientNumber, message) {
  client.messages.create({
    to: recipientNumber,
    from: senderNumber,
    body: message
  }, function (error, message) {
    if (error) {
      console.log('Twilio Error: ', error.message);
    }
  });
};
