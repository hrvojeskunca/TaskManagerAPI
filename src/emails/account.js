const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendWelcomeEmail = (email, name) => {
  sgMail.send({
    to: email,
    from: 'skunca.h@gmail.com',
    subject: 'Thanks for joining in!',
    text: `Welcome to the app, ${name}. Let me know how you get along!`,
  });
};

const sendCancelationEmail = (email, name) => {
  sgMail.send({
    to: email,
    from: 'skunca.h@gmail.com',
    subject: 'Sorry to see you go!',
    text: `Goodbye ${name}. Hope you had fun using our app, could we do anything more to keep you?`,
  });
};

module.exports = {
  sendWelcomeEmail,
  sendCancelationEmail,
};
