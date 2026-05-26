const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');

const app = express();

app.engine('hbs', exphbs.engine({

    extname: '.hbs'

}));

app.set(
    'view engine',
    'hbs'
);

app.use(express.urlencoded({

    extended: true

}));

app.use(express.json());

app.use(

    express.static(

        path.join(
            __dirname,
            'public'
        )

    )

);

const indexRoutes =
    require('./routes/index');

const compararTxtRoutes =
    require('./routes/compararTxt');

const removerLogRoutes =
    require('./routes/removerLog');

app.use(
    '/',
    indexRoutes
);

app.use(
    '/',
    compararTxtRoutes
);

app.use(
    '/',
    removerLogRoutes
);

const PORT = 3000;

app.listen(PORT, () => {

    console.log(

        `Servidor rodando em http://localhost:${PORT}`

    );

});