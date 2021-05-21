# Online Multimedia - Winter Semester 2020 - Group Tasks

## Contributors

- Ivo Christ - ivo.christ@campus.lmu.de
- Sebastian Müller - seb.mueller@campus.lmu.de
- Sophia Münch - sophia.muench@campus.lmu.de
- August Oberhauser - august.oberhauser@campus.lmu.de

---

Online accessible at:

- Frontend (http://memes.reb0.org/)
- Backend (http://api.memes.reb0.org/)

---

## Setup using Docker

1. Install Docker ([Download](https://www.docker.com/products/docker-desktop))

The production version of this application can be directly started using `docker-compose`. Run the following commands:

```
$ cd project
$ docker-compose up
```

The first startup will take a while, so better go grab a coffee instead ☕. Once you see a message like 'Connected correctly to mongo db' the application is ready to use in the browser at `http://localhost:5555`.

Further you can inspect the OpenAPI-specification for our backend at `http://localhost:5554/docs` in your browser.

Additionally each API-endpoint can be tested in Postman using a predefined postman collection from project/development_assets/api/postman_collection.json. Be aware that for most routes you must provide a valid JWT-token for authentication. Therefore use the login-route first, extract the accessToken and set its value as the token variable in the collection's variables. Then the access token will be used for all other routes. Also be sure to set the `host`-variable to `localhost:5554`.

Should the docker setup not work, then you can try the **manual setup** below.

---

## Manual Setup

We can only guarantee every feature to work if the backend is running on a **Linux-system** (Ubuntu, Debian, etc.). Most things might but are **not** guaranteed to work in Windows. Running the frontend in a Windows-environment is fine. Preferably everything should be started in a native Linux environment or a Windows Linux Subsystem ([WSL](https://docs.microsoft.com/en-us/windows/wsl/install-win10)).

Furthermore we can only guarantee all features to work for **Google Chrome**. Other chrome-based browsers like Edge, Opera or other browsers like Firefox work most of the time but some features, like speech-to-text and possibly more, are not supported for these browsers.

### Software requirements

- Node.js (>=14) & NPM ([Download](https://nodejs.org/en/download/))
- Yarn (`npm install --global yarn`)
- MongoDB ([Download](https://docs.mongodb.com/manual/installation/))
- Additionally for Windows: MongoDB DatabaseTools ([Download](https://www.mongodb.com/try/download/database-tools?tck=docs_databasetools))

### Run the application

#### Database

Initialize the database. Make sure MongoDB is running on port **27017**:

```
$ mongorestore -h localhost:27017 --drop -d meme-generator project/development_assets/database/meme-generator
```

#### Shared library

Build and make the shared library linkable:

```
$ cd project/lib
$ yarn install
$ yarn link
$ yarn build
```

#### Backend

Open a new terminal: build and run the backend:

```
$ cd project/backend

# Link the shared library
$ yarn link meme-generator-lib

# Install dependencies
$ yarn install

# Run production build
$ yarn run start:prod
```

As the backend is running, you can inspect the [OpenAPI](https://swagger.io/specification/)-specification for our backend at `localhost:3000/docs` in your browser.

Additionally each API-endpoint can be tested in [Postman](https://www.postman.com/downloads/) using a predefined postman collection from `project/development_assets/api/postman_collection.json`. Be aware that for most routes you must provide a valid JWT-token for authentication. Therefore use the `login`-route first, extract the accessToken and set its value as the token variable in the collection's variables. Then the access token will be used for all other routes.

#### Frontend

Open another terminal: build and run the frontend:

```
$ cd project/meme-generator

# Link the shared library
$ yarn link meme-generator-lib

# Install dependencies
$ yarn install

# Run production build
$ yarn run start:prod
```

### Run tests

First you need to complete all prior building steps from the section 'Run the application'

#### Backend

```
$ cd project/backend

# with coverage
$ yarn run test:coverage

# without coverage
$ yarn run test
```

#### Frontend

```
$ cd project/meme-generator

# with coverage
$ yarn run test:coverage

# without coverage
$ yarn run test
```

---

## Development

### Editor

Any editor of your choice is fine, but it is advised to install following extensions for your editor to use project specific settings, if available:

- Prettier (formatting)
  - [IntelliJ](https://www.jetbrains.com/help/idea/prettier.html#ws_prettier_reformat_code):
    Enable live formatting: File → Settings → Languages & Frameworks → Javascript → Prettier → `On code reformat` / `On save`
- ESLint (linting)
  - [IntelliJ](https://www.jetbrains.com/help/idea/eslint.html):
    File → Settings → Languages & Frameworks → Javascript → Code Quality Tools → ESLint → `Automatic ESLint configuration`
- Editorconfig (formatting & encoding)
  - [IntelliJ](https://plugins.jetbrains.com/plugin/7294-editorconfig):
    Should be enabled by default

IntelliJ:

- Installation: Plugins → Marketplace → _YourPlugin_
- Search: `Ctrl + Shift + A`

### Configurations

We provide configurations for IntelliJ and VSCode in the development assets (`project/development_assets/configurations`).

- IntelliJ: copy files to `.run` folder in your root folder
- VSCode: copy files to `.vscode` folder in your root folder
