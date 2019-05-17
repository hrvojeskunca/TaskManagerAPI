const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const User = require('../models/user');
const auth = require('../middleware/auth');
const { sendWelcomeEmail, sendCancelationEmail } = require('../emails/account');

const router = express.Router();
const upload = multer({
  limits: {
    fileSize: 1000000,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Please upload a jpg/jpeg/png file!'));
    }

    cb(undefined, true);
  },
});

/* CREATE USERS */

router.post('/users', async (req, res) => {
  const user = new User(req.body);

  try {
    await user.save();
    sendWelcomeEmail(user.email, user.name);
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

/* LOGGING IN USERS */

router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password);
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

/* LOGGING OUT USERS */

router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(token => token.token !== req.token);
    await req.user.save();

    res.send('You have been logged out!');
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

/* LOGOUT ALL USERS */

router.post('/users/logoutAll', auth, async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();

    res.send('You have been logged out from all accounts!');
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

/* READ PROFILE */

router.get('/users/me', auth, async (req, res) => {
  res.send(req.user);
});


/* UPDATE PROFILE */

router.patch('/users/me', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'email', 'password', 'age'];
  const isValidOperation = updates.every(item => allowedUpdates.includes(item));

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid update(s)!' });
  }

  try {
    updates.forEach((update) => {
      req.user[update] = req.body[update];
    });

    await req.user.save();

    res.send(req.user);
  } catch (e) {
    if (e.name === 'ValidationError') {
      return res.status(404).send({ error: `Invalid input for ${e.message}!` });
    }
    res.status(500).send({ error: e.message });
  }
});

/* DELETE USERS */

router.delete('/users/me', auth, async (req, res) => {
  try {
    await User.findOneAndDelete({ _id: req.user._id });
    sendCancelationEmail(req.user.email, req.user.name);
    res.send(`You have deleted user: ${req.user.email}!`);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

/* UPLOADING FILES */

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer();
  req.user.avatar = buffer;
  await req.user.save();
  res.send('Avatar uploaded!');
  // eslint-disable-next-line no-unused-vars
}, (error, req, res, next) => {
  res.status(400).send({ error: error.message });
});

/* DELETING AVATAR FILERS */

router.delete('/users/me/avatar', auth, async (req, res) => {
  req.user.avatar = undefined;
  await req.user.save();
  res.send('Avatar deleted!');
  // eslint-disable-next-line no-unused-vars
}, (error, req, res, next) => {
  res.status(400).send({ error: error.message });
});

/* SERVING UP AVATARS */

router.get('/users/:id/avatar', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || !user.avatar) {
      throw new Error();
    }
    res.set('Content-Type', 'image/png');
    res.send(user.avatar);
  } catch (e) {
    res.status(404).send({ error: e.message });
  }
});

module.exports = router;
