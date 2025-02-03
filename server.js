const express = require('express');
const mysql = require('mysql2/promise'); 
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

dotenv.config();
