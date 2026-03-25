import 'dotenv/config';
import server from './app.js'; 

const port = process.env.PORT ?? 3000;
const ip = process.env.SERVICE_IP ?? 'localhost';

// Configura el motor de vistas antes de levantar
server.set('view engine', 'pug');

server.listen(port, ip, () => {
    console.log(`Server is running on http://${ip}:${port}/...`);
});
