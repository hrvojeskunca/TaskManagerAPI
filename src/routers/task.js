const express = require('express');
const Task = require('../models/task');
const auth = require('../middleware/auth');

const router = express.Router();

/* CREATE TASKS */

router.post('/tasks', auth, async (req, res) => {
  const task = new Task({
    ...req.body,
    owner: req.user._id,

  });

  try {
    await task.save();
    res.status(201).send(task);
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

/* READING TASKS */

router.get('/tasks', auth, async (req, res) => {
  const match = {};
  const sort = {};

  if (req.query.completed) {
    match.completed = req.query.completed === 'true';
  }

  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(':');
    sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
  }

  try {
    await req.user.populate({
      path: 'tasksBySpecificUser',
      match,
      options: {
        limit: parseInt(req.query.limit, 10),
        skip: parseInt(req.query.skip, 10),
        sort,
      },
    }).execPopulate();
    res.send(req.user.tasksBySpecificUser);
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

/* READING TASKS BY ID */

router.get('/tasks/:id', auth, async (req, res) => {
  const _id = req.params.id;

  try {
    const task = await Task.findOne({ _id, owner: req.user._id });

    if (!task) {
      return res.status(404).send({ error: 'Task not found!' });
    }

    res.send(task);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

/* UPDATE TASKS BY ID */

router.patch('/tasks/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['description', 'completed'];
  const isUpdateValid = updates.every(update => allowedUpdates.includes(update));

  if (!isUpdateValid) {
    return res.status(400).send({ error: 'Invalid update(s)!' });
  }

  try {
    const updatedTask = await Task.findOne({ _id: req.params.id, owner: req.user._id });

    if (!updatedTask) {
      return res.status(404).send({ error: 'Task not found!' });
    }

    updates.forEach((update) => {
      updatedTask[update] = req.body[update];
    });

    await updatedTask.save();
    res.send(updatedTask);
  } catch (e) {
    if (e.name === 'ValidationError') {
      return res.status(400).send({ error: `Invalid input for ${e.message}!` });
    }
    res.status(500).send();
  }
});

/* DELETE TASKS BY ID */

router.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id });

    if (!task) {
      return res.status(404).send({ error: `Unable to find task by id: ${req.params.id}!` });
    }

    res.send(task);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

module.exports = router;
