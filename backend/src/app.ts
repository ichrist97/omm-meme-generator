import express from "express";
import path from "path";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import logger from "morgan";
import fileUpload from "express-fileupload";
import swaggerUi from "swagger-ui-express";
import swaggerDoc from "./api/swagger/swagger.json";
import { authenticateJWT, getSecrets } from "./middleware/auth";
import { privateLoginRouter, publicLoginRouter } from "./routes/loginRouter";
import { privateTemplateRouter, publicTemplateRouter } from "./routes/templatesRouter";
import { privateMemeRouter, publicMemeRouter } from "./routes/memesRouter";
import { publicFileRouter, privateFileRouter } from "./routes/filesRouter";
import monk from "monk";
import cors from "cors";
import { CommonRequest } from "./types/Types";
import { initLiveVideoStream } from "./controllers/memes/memesVideoController";
import https from "https";
import fs from "fs";
import http from "http";

// read .env config file
dotenv.config();

// root path
global["appRoot"] = path.resolve(__dirname);

// database
const mongohost = process.env.MONGO_HOST || "localhost:27017";
const databaseName = process.env.DATABASE_NAME || "meme-generator";
const databaseUrl = `${mongohost}/${databaseName}`;

const db = monk(databaseUrl);

db.then(() => {
  console.log("Connected correctly to mongo db");
}).catch((e) => {
  console.log("Failed to connect to mongo db: " + e.message);
});

const app = express();

/**
 * SSL Certs
 */
const sslKeyPath: string | null = process.env.SSL_KEY_PATH ?? null;
const sslCertPath: string | null = process.env.SSL_CERT_PATH ?? null;
const sslChainPath: string | null = process.env.SSL_CHAIN_PATH ?? null;
let server: http.Server | https.Server;

if (sslKeyPath && sslCertPath && sslChainPath) {
  server = https.createServer(
    {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath),
      ca: fs.readFileSync(sslChainPath),
    },
    app
  );
} else {
  server = http.createServer(app);
}

/**
 * MIDDLEWARE
 */

// Trust proxy on localhost to use http if public connection is https
app.enable("trust proxy");

// Trust every origin or you set CORS_ORIGIN in Environment variables.
let corsOptions: cors.CorsOptions;
if (process.env.CORS_ORIGIN) {
  corsOptions = {
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "X-Access-Token"],
    credentials: true,
    methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
    origin: process.env.CORS_ORIGIN,
    preflightContinue: false,
  };
} else {
  corsOptions = {
    origin: "*",
  };
}
const corsMiddleware = cors(corsOptions);
app.use(corsMiddleware);
app.options("*", corsMiddleware); //enable pre-flight

// miscellaneous middleware
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json());

// enable files upload
app.use(
  fileUpload({
    createParentPath: true,
  })
);

// chain database to every request
app.use((req, res, next) => {
  (<CommonRequest>req).db = db;
  next();
});

// chain jwt secrets to every request
app.use(async (req, res, next) => {
  getSecrets((<CommonRequest>req).db).then((secrets) => {
    (<CommonRequest>req).secrets = secrets;
    next();
  });
});

/**
 * ROUTES
 */

// exclude these routes from authentication
app.use(express.static(path.join(__dirname, "public")));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
app.use("/login", publicLoginRouter);
app.use("/files", publicFileRouter); // Uses bearer token in queryParams
app.use("/memes", publicMemeRouter);
initLiveVideoStream(server, { path: "/memes-socket", cors: corsOptions }, db);
app.use("/templates", publicTemplateRouter);

// authentication middleware
app.use(async (req, res, next) => {
  await authenticateJWT(<CommonRequest>req, res, next);
});

// secured routes
app.use("/login", privateLoginRouter);
app.use("/files", privateFileRouter);
app.use("/memes", privateMemeRouter);
app.use("/templates", privateTemplateRouter);

// close db session at end of request
app.use(async (req, res, next) => {
  await (<CommonRequest>req).db.close();
});

// start app
const PORT = process.env.APP_PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running in http://localhost:${PORT}`);
});

export { app };
