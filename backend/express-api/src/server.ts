import app from './app';

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`API3 listening on ${port}`);
}); 