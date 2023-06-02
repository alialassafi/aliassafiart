require('dotenv').config();

const express = require('express');
const app = express();

const _ = require('lodash');

const ejs = require('ejs');
app.set('view engine', 'ejs');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

const https = require("https");


// ------------------------- Public -------------------------
app.use(express.static(`${__dirname}/public`));

// ------------------------- DB -------------------------

var mysql = require('mysql');
var con = mysql.createConnection({
    host: process.env.DATABASEHOST,
    user: process.env.DATABASEUSER,
    password: process.env.DATABASEPASSWORD,
    database: process.env.DATABASE,
    port: '3306',
    multipleStatements: true
});

// ------------------------- Server -------------------------

app.listen(process.env.PORT || 3000, function () {
    console.log("server is running on port 3000")
});

app.get('/', (req, res) => {
    res.render('home.ejs');
});

app.get('/about', (req, res) => {
    res.render('about.ejs');
});

app.get('/portfolio', (req, res) => {
    res.render('portfolio.ejs');
});


// -------------- /books --------------

app.get('/books', (req, res) => {
    res.render('books.ejs');
});

// ----- /books/books -----

// FREE SAMPLE

app.get('/books/download/:bookName', (req, res) => {
    const bookName = req.params.bookName;
    const fileName = `${__dirname}/downloadFiles/books/${bookName}.zip`;
    const options = {};

    res.sendFile(fileName, options, function (err) {
        if (err) {
            res.render('404.ejs');
        }
    });
});

// BUY BOOKS

app.get('/buy/book/:bookName', (req, res) => {
    let book = _.upperCase(req.params.bookName);

    var sql = "SELECT @book_id:= id FROM books WHERE title = " + mysql.escape(book) + "; SELECT * FROM links WHERE id = @book_id";
    con.query(sql, [book], function (err, result) {
        if (err) throw err;
        if (result[1].length !== 0) {
            const inParams = {
                book: book,
                apple: result[1][0].apple,
                kobo: result[1][0].kobo,
                scribd: result[1][0].scribd,
                thalia: result[1][0].thalia,
                barnesAndNoble: result[1][0].barnesAndNoble,
                angusAndRobertson: result[1][0].angusAndRobertson,
                vivlio: result[1][0].vivlio,
                mondadori: result[1][0].mondadori,
                palace: result[1][0].palace,
                smashWords: result[1][0].smashWords, 
            };
            res.render('buyBook.ejs', inParams);
        } else {
            res.render('404.ejs')
        }

    });

});

// -------------- Email Subscription --------------

app.post("/newsletter", function (req, res) {
    const firstName = _.upperCase(req.body.firstName);
    const lastName = _.upperCase(req.body.lastName);
    const email = _.toLower(req.body.email);



    var sql = "SELECT id FROM newsletter WHERE email = " + mysql.escape(email);
    con.query(sql, (err, result) => {
        if (err) throw err;
        if (result.length !== 0) {
            var sql = "UPDATE newsletter SET firstName= " + mysql.escape(firstName) + ", lastName= " + mysql.escape(lastName) + ", email= " + mysql.escape(email) + "WHERE id = " + result[0].id;
            con.query(sql, (err, result) => {
                if (err) throw err;
                if (err) {
                    res.render('emailSubRes.ejs', { status: "Failure!", description: "Failed To Sign You Up For The Newsletter. If you think this should not happen, please contact us and report this issue." });
                } else {
                    console.log('1 record updated');
                    res.render('emailSubRes.ejs', { status: "Updated!", description: "Successfully Updated Your Info" });
                }
            });
        } else {

            var sql = "INSERT INTO newsletter (firstName, lastName, email) VALUES (" + mysql.escape(firstName) + "," + mysql.escape(lastName) + "," + mysql.escape(email) + ")";
            console.log(sql);
            con.query(sql, function (err, result) {
                if (err) throw err;
                if (err) {
                    res.render('emailSubRes.ejs', { status: "Failure!", description: "Failed To Sign You Up For The Newsletter. If you think this should not happen, please contact us and report this issue." });
                } else {
                    console.log("1 record inserted");
                    res.render('emailSubRes.ejs', { status: "Success!", description: "Successfully Subscribed To My Newsletter!" });
                }

            });
        }
    });



    // // saving data in a format that mailchimp accepts
    // const data = {
    //     update_existing: true, // allow updating data of user when he/she resubmits
    //     members: [{
    //         email_address: email,
    //         status: "subscribed",
    //         merge_fields: {
    //             FNAME: firstName,
    //             LNAME: lastName
    //         }
    //     }]
    // };

    // const jsonData = JSON.stringify(data);

    // // making url in a format that mailchimp accepts
    // url = process.env.MAILCHIMPURL;
    // options = {
    //     method: "POST",
    //     auth: process.env.MAILCHIMPAUTH
    // };

    // const addMember = https.request(url, options, function (response) {

    //     response.on("data", function (data) {
    //         const receivedData = JSON.parse(data);
    //         console.log(receivedData);
    //         if (response.statusCode == 200 && receivedData.total_created > 0) {
    //             console.log('Success Mailchimp');
    //         } else if (response.statusCode == 200 && receivedData.total_updated > 0) {
    //             console.log('Updated Mailchimp');
    //         } else {
    //             console.log('Failed Mailchimp');
    //         }
    //     })

    // })

    // addMember.write(jsonData);
    // addMember.end();

});


// -------------- /contact --------------

app.get('/contact', (req, res) => {
    res.render('contact.ejs');
})


// -------------- /terms --------------

app.get('/terms-of-service', (req, res) => {
    res.render('termsOfService.ejs');
});

app.get('/privacy-policy', (req, res) => {
    res.render('privacyPolicy.ejs');
});


// error

app.get('*', (req, res) => {
    res.render('404.ejs');
  });