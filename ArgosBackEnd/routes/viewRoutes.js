import express from 'express';

const router = express.Router();

router.get('/getAll', (req, res, next) => {
  res.send('respond with a resource');
});

router.get('/getById', (req, res, next) => {
  res.send('respond with a resource');
});

router.post('/createOne', (req, res, next) => {
  res.send('respond with a resource');
});

router.post('/updateOne', (req, res, next) => {
  res.send('respond with a resource');
});

export default router;
