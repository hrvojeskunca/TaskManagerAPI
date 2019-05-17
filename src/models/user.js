const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Task = require('./task');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error('Email is invalid!');
      }
    },
  },
  password: {
    type: String,
    required: true,
    trim: true,
    minlength: 7,
    validate(value) {
      if (value.toLowerCase().includes('password')) {
        throw new Error('Password cannot contain "password"!');
      }
    },
  },
  age: {
    type: Number,
    default: 0,
    validate(value) {
      if (value < 0) {
        throw new Error('Age must be a positive number!');
      }
    },
  },
  tokens: [{
    token: {
      type: String,
      required: true,
    },
  }],
  avatar: {
    type: Buffer,
  },
}, {
  timestamps: true,
});

/* CREATING VIRTUAL REFERENCE */

userSchema.virtual('tasksBySpecificUser', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'owner',
});

/* DELETING PASSWORD AND TOKENS ARRAY */

userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.tokens;
  delete userObject.avatar;

  return userObject;
};

/* GENERATING JWT */

userSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = await jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);

  user.tokens = user.tokens.concat({ token });
  await user.save();

  return token;
};

/* FIND BY EMAIL AND PASSWORD */

userSchema.statics.findByCredentials = async (email, password) => {
  // eslint-disable-next-line no-use-before-define
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('Unable to log in!');
  }

  const passwordIsMatching = await bcrypt.compare(password, user.password);

  if (!passwordIsMatching) {
    throw new Error('Unable to log in!');
  }

  return user;
};

/* HASHING PASSWORDS */

userSchema.pre('save', async function (next) {
  const user = this;

  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }

  next();
});

/* DELETE USER TASKS WHEN USER IS DELETED */

userSchema.pre('findOneAndDelete', async function (next) {
  const user = this;
  const { _id } = user.getQuery();
  await Task.deleteMany({ owner: _id });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
