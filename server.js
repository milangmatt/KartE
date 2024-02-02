const express = require('express');
const { createPool } = require('mysql2');

const session = require('express-session')
var cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');


const app = express();

const pool = createPool({

    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'pragthi',
    connectionLimit: 1
}).promise()

app.use(session({
    secret: 'fdlaksfjdk',
    cookie: { maxAge: 400000 },
    saveUninitialized: false

}))


app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


async function checkLogin(email, password) {

    if (email != undefined && password != undefined) {

        console.log("fetching result")
        var result = await pool.query('select password from users where email = ?', [email])



        if (result[0].length > 0) {
            if (result[0][0]['password'] == password) {


                return true;

            }
        }


    }

    return false;
}
async function checkSignup(email,password,confirm){
    //check if the user is already in the database
    var result = await pool.query('select password from users where email = ?', [email])



        if (result[0].length > 0) {
            if (result[0][0]['password'] == password) {


                return true;

            }
        }else{
       //Check if passwords match
       if(password!=confirm){
           return false;
       }
       
       await pool.query('INSERT INTO users values(default, ?, ?)',[],[email],[password]);
       return true;
   }
}




const port = 3000;

app.set("view engine", "ejs");

app.use('/static', express.static('static'));




app.get('/', (req, res) => {

    res.render('home')
})

app.get('/search', async (req, res) => {

    let query = req.query['product']

    console.log(query)

    let words = query.split(" ")

    console.log(words)

    let word_count_statement = ""

    for( i in words){
        
        if(words[i] === ''){
           
            words.splice(i , 1);
            i--;
        }
    }

    console.log(words)

    for( i in  words ){

        word_count_statement += `( concat( product_name , product_desc )  like "%${words[i]}%" )`;
        if(i < words.length-1){

            word_count_statement += " + "
        }

    }

    console.log(word_count_statement)

    query = `select product_id ,  product_name , product_desc ,  price , 
    ${word_count_statement}
    as word_match_count from products 
    where ${word_count_statement} != 0 
    order by word_match_count desc`
    console.log("done")

    let result = await pool.query(query)
    console.log(result[0])

    res.render('products_list2', { products: result[0] })





})


app.get('/details', async (req, res) => {

    let result = await pool.query('select * from products');
    

    
    console.log(result[0][0])
    res.render('Productdetails', { 'details': result[0] })



})

app.get('/purchase_details', (req, res) => {


    let email = req.cookies['email'];
    let password = req.cookies['password'];

    let productId = req.query['product']

    checkLogin(email, password).then((status) => {
        if (status) {
            res.render('purchase_details', { product: productId })
        } else {
            console.log(req.url)
            req.session.next = req.url;
            res.redirect('/login')
        }

    })

})

app.get('/login', (req, res) => {


    res.render("signin")

})
app.get('/signup', (req, res) => {


    res.render("signup")

})

app.post('/check_signup', (req, res) => {
    console.log("checking signup")
    console.log(req.body)
    let email = req.body['email'];
    let password = req.body['password'];
    let confirm = req.body['confirm-password'];

    console.log(email, password,confirm)

    checkSignup(email, password,confirm)
    res.redirect("/login")
//     checkSignup(email, password,confirm).then((status) => {




//         if (status) {
//             console.log('Signup success')
//             res.cookie("email", email);
//             res.cookie("password", password);

//             console.log(req.session.next);
//             if (req.session.next == undefined) {
//                 res.redirect("/")
//             } else {
//                 res.redirect(req.session.next)
//             }

//         } else {
//             res.redirect('/signup')
//         }
//     })

 })

app.post('/check_login', (req, res) => {
    console.log("checking login")
    console.log(req.body)
    let email = req.body['email'];
    let password = req.body['password'];

    console.log(email, password)


    checkLogin(email, password).then((status) => {




        if (status) {
            console.log('login success')
            res.cookie("email", email);
            res.cookie("password", password);

            console.log(req.session.next);
            if (req.session.next == undefined) {
                res.redirect("/")
            } else {
                res.redirect(req.session.next)
            }

        } else {
            res.redirect('/login')
        }
    })

})


app.post('/complete_purchase', async (req, res) => {

    console.log('completing purchase')

    let email = req.cookies['email']
    let password = req.cookies['password']


    let userId = await pool.query("select user_id from users where email = ?", [email]);

    let productId = req.body['product_id']
    let phone = req.body['phone']
    let address = req.body['address']
    let state = req.body['state']
    let city = req.body['city']
    let pin_code = req.body['pin_code']
    let land_mark = req.body['land_mark']




    await checkLogin(email, password).then(async (status) => {

        if (status) {

            console.log("here")

            pool.query("insert into orders values(default , ? , ?, ? , ? , ? , ? , ? , now())", [userId[0][0]['user_id'], productId, address, state, city, pin_code, land_mark])

            res.redirect('/my_orders')

        }else{

            res.redirect("/login")
        }
    })

})


app.get('/my_orders', async (req, res) => {

    let email = req.cookies['email']
    let password = req.cookies['password']

    checkLogin(email, password).then(async (status) => {

        if (status) {

            let data = await pool.query("select * from orders , products , users where users.user_id = orders.user_id and products.product_id = orders.product_id and users.email = ?", [email])
            console.log(data[0], typeof Array.from(data[0]))
            res.render("ordered_products", { products: data[0] })
        }
        else {
            req.cookies.next = req.url
            redirect('/login')
        }

    })





})


app.listen(port, () => {

    console.log('server listening at port 3000');
})