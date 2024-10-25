TICKETING SYSTEM

The applications is built with Node.js, Express and EJS as the templating engine.
Authentication is managed with Auth0. A MYSQL-compatible MariaDB database is used for storing tickets, users and categories. This application is used as a Ticketing-System to create and resolve tickets.


Architecture Overview
- Backend: Node.js and Express, utilizing MariaDB for database management
- Frontend: EJS templating engine for server-side rendering and HTML.
- Authentication: Managed by Auth0, handling user login and session management.
- Database: MariaDB used with MySQL syntax for table storage and stored procedures.


Prerequisites
- To get started, install the following:
- Install Node.js in your Linux environment:
    - sudo apt update
    - sudo apt install nodejs npm

- Install MariaDB within the Linux environment
    - sudo apt install mariadb-server

- Auth0 Account: Register fo Auth0 account _ and configure your enviroment variables as following:
    - Create a regular web application
    - Add 'http://localhost:1337/callback' to allowed callback URLs and 'http://localhost:1337' to allowed logout URLs
    - Ensure that the Username-Password-Authentication is toggled on
    - Enable Password in Authentication Methods
    - In APIs, go to Machine to Machine Applications and ensure that read:users, update:users, create:users is enabled.

- Mail Setup (GMAIL)
    - Ensure that 2-step verification is enabled
    - Go to app passwords and create an app specific password
    - Save this to use in .env file


Build and Run Application
- Project setup
    - git clone <>
    - cd Ticketing-System
- Install dependencies
    - npm install
- Setup .env file
    - Create the .env file in root
    - This should contain the variables
        - SESSION_SECRET=your-session-secret
        - AUTH0_CLIENT_ID=your-auth0-client-id
        - AUTH0_CLIENT_SECRET=your-auth0-client-secret
        - AUTH0_DOMAIN=your-auth0-domain
        - BASE_URL=http://localhost:1337
        - AUTH0_MANAGEMENT_API_AUDIENCE=your-auth0-identifier
        - DB_HOST=
        - DB_USER=
        - DB_PASSWORD=
        - DB_NAME=ticketing_system
        - MAIL=your-email@gmail.com
        - PASS=app-specific-password

- Database Setup
    - Open new terminal and run MariaDB
        - mariadb -u <your-db-username> -p
    - Run the SQL file
        - source Ticketing-System/sql/database.sql

- Start the application
    - node index.js


MIT License

Copyright (c) 2024 Anton Forsberg

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.