
import * as dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import app from './app';

console.log(process.env.DB_NAME); 

// Define a port for the server to listen on
const PORT = process.env.PORT || 3009;


app.get('/', (req, res) => {
    res.send('Hello from the Sheeba Inventory System Backend!');
  });


// Start the server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
