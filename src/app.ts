import express, { Application, urlencoded } from 'express';
import bodyParser from 'body-parser';
import userRoutes from './routes/user.routes';
import { camelCaseResponseKeys } from './middlewares/camelCaseResponse';
import inventoryRoutes from './routes/inventory.routes';
import machinesRoutes from './routes/machines.routes';
import ordersRoutes from './routes/orders.routes';

const cors = require('cors');

// import { config } from 'dotenv';


//config(); // Load environment variables

const app: Application = express();

const api_version = 'v1';  

// Enable CORS for all requests
app.use(cors());

app.use(bodyParser.json());
app.use(urlencoded({ extended: true }));

// Use the middleware to transform response keys to camel case
app.use(camelCaseResponseKeys);

app.use(`/api/${api_version}/users`, userRoutes);
app.use(`/api/${api_version}/inventory`, inventoryRoutes);
app.use(`/api/${api_version}/machines`, machinesRoutes);
app.use(`/api/${api_version}/orders`, ordersRoutes);

export default app;
