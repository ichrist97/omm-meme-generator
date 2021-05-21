# meme-generator backend

## Setup

Create **.env** file for local configurations containing the following key-value-pairs: (optional)

```
APP_PORT=<PORT_BACKEND_SHOULD_RUN>
DATABASE_PORT=<PORT_DATABASE_RUNS>
DATABASE=<NAME_OF_DB_IN_MONGO>
```

Install dependencies:

```
$ yarn install
```

Link **meme-generator-lib** locally, after you linked it (see README of `lib` folder):

```
$ yarn link meme-generator-lib
```

### Database

#### Windows

Install MongoDB:
[Download](https://www.mongodb.com/try/download/community)

Download and install MongoDB DatabaseTools:
[Download](https://www.mongodb.com/try/download/database-tools?tck=docs_databasetools)

You should register the MongoDB services in your PATH variable:

Set only for one session in `cmd.exe`:
```
set PATH=%PATH%;C:\Program Files\MongoDB\Server\4.4\bin;C:\Program Files\MongoDB\Tools\100\bin
```

Set forever:
- Search for `Environment Variable`
- In the tab `Advanced` go to `Environment Variables...`
- Under `System variables` → `Path` → `New`:
    - `C:\Program Files\MongoDB\Server\4.4\bin`
    - `C:\Program Files\MongoDB\Tools\100\bin`

#### Linux

Further descriptions for commands down below:
[Installation Docs](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)

```
$ wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -

$ echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list

$ sudo apt-get update

$ sudo apt-get install -y mongodb-org
```

#### Start database

Database can be started manually with:

Linux:

```
$ sudo systemctl start mongod
```

To start it automatically on every system boot, enable the systemd service:

```
$ sudo systemctl enable mongod
```

Windows:

```
$ mongod
```

#### Import prepopulated database (dump)

```
$ mongorestore -h localhost:<PORT> --drop -d meme-generator <PATH_TO_DUMP>
```

_Default mongo-db port_ (`PORT`): `27017`

_Default dump path_ (`PATH_TO_DUMP`): `<path/to/project>/development_assets/database/meme-generator`

#### Export existing database (dump)

```
$ mongodump --db <DB_NAME>
```

**<DB_NAME>**: name of the database in mongo to be exported

This command will create the folder **dump**. Then you can copy the export into the development assets.

#### Drop database

```
$ mongo
> use <DB_NAME>
> db.dropDatabase()
```

### Debug server

Start application in development mode and live reloading. To start **debugging**, run the application in a terminal and then attach the debugger by starting it in VSCode / IntelliJ.

```
$ yarn start
```

See docs for REST endpoints by accessing the following URL in your browser:

```
localhost:<PORT>/docs
```

### Deploy server

Either start the application in production mode:

```
$ yarn start:prod
```

Or run it directly via node:

```
$ yarn run build
$ node build/app.js
```

## Postman

### Import collections

In Postman you can import prepopulated testing requests by importing the following file:

```
<path-to-project>/project/development_assets/api/postman_collection_x.x.json
```

Always make sure to import the most recent version!

### Authentication

For every secured route an authentication token must be attached to the request. In order for this create the variable '**token**' in Postman by:

```
OMM-Meme-Generator-Collection (left hand side) -> Edit -> Variables
```
### Testing

To run the Tests:
```
$ yarn test --forceExit
```
To see the Test Coverage:
```
$ yarn test -- --coverage --forceExit
```
