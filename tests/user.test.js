const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user');
const { userOneId, userOne, populateDatabase } = require('./fixtures/db');

beforeEach(populateDatabase);

afterAll(async () => {
  await mongoose.disconnect();
});

/* TEST - CREATE */
test('Should signup a new user', async () => {
  const response = await request(app).post('/users').send({
    name: 'Toni',
    email: 'toni@gmail.com',
    password: 'Purple123!',
  }).expect(201);

  const user = await User.findById(response.body.user._id);
  expect(user).not.toBeNull();

  expect(response.body).toMatchObject({
    user: {
      name: 'Toni',
      email: 'toni@gmail.com',
    },
  });

  expect(user.password).not.toBe('Purple123!');
});

/* TEST - LOGIN */
test('Should login Mike', async () => {
  const response = await request(app)
    .post('/users/login')
    .send({
      email: userOne.email,
      password: userOne.password,
    })
    .expect(200);

  const user = await User.findById(response.body.user._id);
  expect(response.body.token).toBe(user.tokens[1].token);
});

test('Should not login a nonexistent user', async () => {
  await request(app).post('/users/login').send({
    email: userOne.email,
    password: 'password',
  }).expect(400);
});

/* TEST - READ PROFILE */
test('Should get profile for user', async () => {
  await request(app)
    .get('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200);
});

test('Should not get the profile for user', async () => {
  await request(app)
    .get('/users/me')
    .send()
    .expect(401);
});

/* TEST - DELETE */
test('Should delete account for user', async () => {
  await request(app)
    .delete('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200);

  const user = await User.findById(userOne._id);
  expect(user).toBeNull();
});

test('Should not delete account for unauthenticated user', async () => {
  await request(app)
    .delete('/users/me')
    .send()
    .expect(401);
});

/* TEST - UPLOAD AVATAR */
test('Should upload avatar image', async () => {
  await request(app)
    .post('/users/me/avatar')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .attach('avatar', 'tests/fixtures/profile-pic.jpg')
    .expect(200);

  const user = await User.findById(userOneId);
  expect(user.avatar).toEqual(expect.any(Buffer));
});

/* TEST - UPDATE */
test('Should update valid user fields', async () => {
  await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
      name: 'Jess',
      age: 45,
    })
    .expect(200);

  const user = await User.findById(userOneId);
  expect(user.name).toEqual('Jess');
  expect(user.age).toEqual(45);
});

test('Should not update invalid user fields', async () => {
  await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
      eyes: 'Blue',
    })
    .expect(400);
});
