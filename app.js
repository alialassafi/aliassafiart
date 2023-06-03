require('dotenv').config();

const express = require('express');
const app = express();

const _ = require('lodash');

const ejs = require('ejs');
app.set('view engine', 'ejs');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

const https = require("https");

const nodemailer = require('nodemailer');


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

    let transport = nodemailer.createTransport({
        host: process.env.SMTPHOST,
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.NEWSLETTEREMAIL,
            pass: process.env.NEWSLETTERPASSWORD,
        },
    });

    const sendEmail = (receiver, subject, content) => {
        ejs.renderFile(__dirname + '/views/emailTemplates/welcomeEmail.ejs', { receiver, content }, (err, data) => {
            if (err) {
                console.log(err);
            } else {
                var mailOptions = {
                    from: `"ALI ALASSAFI" <${process.env.NEWSLETTEREMAIL}>`,
                    to: receiver,
                    subject: subject,
                    html: data,
                    attachments: [{   // stream as an attachment
                        filename: 'logo.png',
                        path: `${__dirname}/public/images/favicon.png`,
                        cid: 'logo' //same cid value as in the html 
                    }]
                };

                transport.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                    console.log('Message sent: %s', info.messageId);
                });
            }
        });
    };


    var sql = "SELECT id FROM newsletter WHERE email = " + mysql.escape(email);
    con.query(sql, (err, result) => {
        if (err) throw err;
        if (result.length !== 0) {
            let subscriberID = result[0].id;
            let sql = "UPDATE newsletter SET firstName= " + mysql.escape(firstName) + ", lastName= " + mysql.escape(lastName) + ", email= " + mysql.escape(email) + ", confirmation='Not Confirmed' WHERE id = " + result[0].id;
            con.query(sql, (err, result) => {
                if (err) throw err;
                if (err) {
                    res.render('emailSubRes.ejs', { status: "Failure!", description: "If you think this should not happen, please contact us and report this issue." });
                } else {
                    console.log('1 record updated');
                    sendEmail(email, "Welcome", `https://aliassafiart.com/newsletter/confirm/${subscriberID}`);
                    res.render('emailSubRes.ejs', { status: "Updated Your Info!", description: "Please Check Your Email To Confirm Subscription" });
                }
            });
        } else {
            let sql = "INSERT INTO newsletter (firstName, lastName, email, confirmation) VALUES (" + mysql.escape(firstName) + "," + mysql.escape(lastName) + "," + mysql.escape(email) + ", 'Not Confirmed')";
            con.query(sql, function (err, result) {
                if (err) throw err;
                if (err) {
                    res.render('emailSubRes.ejs', { status: "Failure!", description: "If you think this should not happen, please contact us and report this issue." });
                } else {
                    console.log("1 record inserted");
                    let sql = "SELECT id FROM newsletter WHERE email = " + mysql.escape(email);
                    con.query(sql, (err, resultID) => {
                        let subscriberID = resultID[0].id;
                        if (err) throw err;
                        if (err) {
                            res.render('emailSubRes.ejs', { status: "Failure!", description: "If you think this should not happen, please contact us and report this issue." });
                        } else {
                            sendEmail(email, "Welcome", `https://aliassafiart.com/newsletter/confirm/${subscriberID}`);
                            res.render('emailSubRes.ejs', { status: "Successfully Subscribed!", description: "Please Check Your Email To Confirm Subscription" });

                        }
                    })

                }

            });
        }
    });

});

// --- confirm subscription ---

app.get('/newsletter/confirm/:subscriberID', (req, res) => {
    const subscriberID = req.params.subscriberID;
    console.log(subscriberID);
    let sql = "UPDATE newsletter SET confirmation='Confirmed' WHERE id =" + subscriberID;
    con.query(sql, (err, result) => {
        if (err) throw err;
        if (err) {
            res.render('emailSubRes.ejs', { status: "Failure!", description: "Failed To confirm your email. If you think this should not happen, please contact us and report this issue." });
        } else {
            res.render('emailSubRes.ejs', { status: "Success!", description: "Successfully Confirmed Your Email!" });
        }
    })
});

// --- unsubscribe ---

app.route('/newsletter/unsubscribe/imsureiwanttosubscribe')
    .get((req, res) => {
        res.render('newsletterUnsubscribe.ejs');
    })
    .post((req, res) => {
        const email = _.toLower(req.body.email);
        let sql = "DELETE FROM newsletter WHERE email = " + mysql.escape(email);
        con.query(sql, (err, result) => {
            if (err) throw err;
            if (err) {
                res.render('emailSubRes.ejs', { status: "Failure!", description: "Failed To Unsubscribe From Newsletter. If you think this should not happen, please contact us and report this issue." });
            } else {
                res.render('emailSubRes.ejs', { status: "Success!", description: "Successfully Unsubscribed From Newsletter" });
            }
        })
    })



// -------------- /contact --------------

app.get('/contact', (req, res) => {
    res.render('contact.ejs');
})

app.post('/contact/support', (req, res) => {
    const firstName = _.upperCase(req.body.firstName);
    const lastName = _.upperCase(req.body.lastName);
    const email = _.toLower(req.body.email);
    const subject = req.body.subject;
    const message = req.body.message;

    let transport = nodemailer.createTransport({
        host: process.env.SMTPHOST,
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.SUPPORTEMAIL,
            pass: process.env.SUPPORTPASSWORD,
        },
    });

    const sendEmail = () => {

        var mailOptions = {
            from: `"${firstName} ${lastName}" <${email}>`,
            to: process.env.SUPPORTEMAIL,
            subject: subject,
            text: message,
        };

        transport.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                res.render('emailSubRes.ejs', { status: "Failure!", description: "Failed To Send Message. If you think this should not happen, please contact us and report this issue." });
            }
            console.log('Message sent: %s', info.messageId);
        });

    };

    sendEmail();

    res.render('emailSubRes.ejs', { status: "Success!", description: "Message Sent Successfully" });

});

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