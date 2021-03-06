// server/appjs - communicates with the client (expressjs using app...) 
//   via req and res,  ===>>
//   and the MongoDB database (Mongoose?) with collection and db <<===

// mongodb needs to be defined before MongoClient and ObjectID, 
// so we can refer to mongodb.MongoClient and mongodb.ObjectID
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;  // ??? Why not "ObjectId" - with lowercase "d" ???

// var mongoose = require('mongoose');

var bodyParser = require('body-parser');

// expressjs: listens for client requests on route /items and processes them
var express = require('express');
var app = express();

var config = require('../config.json');
var USERNAME = config.USERNAME;
var PASSWORD = config.PASSWORD;

// DRY and easy to make change as declared
// ??? how do we know to use "docker:27017" ???
// var CONNECTION_STRING = 'mongodb://localhost:27017/todosdb';
var CONNECTION_STRING = 'mongodb://'+USERNAME+':'+PASSWORD+'@ds027741.mongolab.com:27741/tudosdb';

// MongoDB connection test goes here

// middleware

// expressjs: serve static pages from the public dir
app.use(express.static('public'));

// expressjs: ??? not clear about this ???
app.use(bodyParser.urlencoded({ extended: true }));


// MongoDB connect
// DRY - lines of code duplicated in 4 expressjs HTTP Request Methods
// accepts a callback function "cb", which, when called,  
// provides arguments database "db", from .connect and 
// and "collection" of the specified "db"
function connect_to_db(cb) {  // cb = callback function
  // establishes a connection to the MongoDB and provides any error message "err"
  // and the database object "db" ("todosdb")
  MongoClient.connect(CONNECTION_STRING, function(err, db) {
    if (err) {
      throw err;
    }
    // "collection" holds the "todos" collection from the 
    // "todosdb" database we defined directly in MongoDB    
    var collection = db.collection('todos');

    // cb() calls the function argument, "cb", which is a callback function, 
    // and provides: 
    // -- the "db" argument from the .connect function 
    // (which will be used to close the database connection)
    // -- and the "collection" "todos" of the "db" "todosdb"
    cb(db,collection);

  });
}

// ***** Service HTTP Requests (routes) *****

/* RETRIEVE - GET /items */
// expressjs: listens for GET request via todos.js on route /items
// "/" is part of the reg ex syntax, not a dir!
app.get('/items', function(req, res) {
  connect_to_db(function(db, collection) {
    // {} indicates deliberate selection of all docs in the "todos" collection
    collection.find({}).toArray(function(err, docs) {
      console.log("Found the following records");
      console.dir(docs);
      // close the database connection, to prevent runaway resource
      db.close();
      // send db query result to, and close comms with todo.js, via res response argument object
      res.send(docs);
    });
  }); // End of function(err, docs) callback
});  // end app.get()


/* CREATE - POST /items */

// expressjs: listens for POST request from todos.js on route /items
// then saves new list item specified in req request argument object to the database
app.post('/items', function(req, res) {

  console.log('user sent post request');
  console.log( req.body );                // prints body of http request

  connect_to_db(function(db,collection) {

    // 
    var new_todo_item_to_be_inserted = req.body.new_item;

    // Insert a document into the database collection
    collection.insert(new_todo_item_to_be_inserted, function(err, doc) {
      // Show the item that was just inserted; contains the _id field
      // Note that it is an array containing a single object
      console.log('err', err);
      console.log('doc', doc[0]._id);
      // Close the db connection - required!
      db.close();
      // confirmation response sent to todos.js with the doc id's
      res.send(doc[0]._id);
    });
  }); // End of function(err, docs) callback
});  // end app.post()


/* UPDATE - PUT /items/:id/:status */

// expressjs: listens for PUT request from todo.js on route /items/:id/:status
// then updates status for item in database with specified id, per req request argument
app.put('/items/:id/:status',function (req, res) {
  
  connect_to_db( function ( db, collection ) {
    // extract the id from the request paramaeter argument
    var todo_id = req.params.id;
    // extract the status from the request paramaeter argument
    var todo_completed_status = req.params.status;

    // collection.update(criteria, objNew, options, [callback]);
    collection.update(
      // in MongoDB speak, create update object item
      { '_id' : new ObjectID(todo_id) },    // criteria, ??? but need to properly format to _id to find doc in db ???
      {
        $set: {
          completed : todo_completed_status // ??? $set modifies, does not overwrite ???
        }
      },                                    // objNew
      {w:1},                                // options, ??? huh? ???
      function(err) {                       // callback, reports operation status
        var success;
        if (err){
          success = false;
          console.warn(err.message);
        }else{
          success = true;
          console.log('successfully updated');
        }

        db.close();
        // send response to todos.js
        res.json( { success : success } );
      }
    );
  });
});




/* DELETE /items/:id  */

// expressjs: listen for DELETE request from todo.js on route /items/:id
// then removed the item specified in the req request argument from the database
app.delete('/items/:id', function (req, res) {
  console.log('DELETING', req.params.id);
  connect_to_db( function (db, collection) {
    // retrieve the id parameter from the req request argument object
    var _id = req.params.id;
    // removed the item with specified id (converted to _id)
    collection.remove({"_id": new ObjectID( _id )}, function (err, result) {
      if( err ) throw err;
      
      db.close();
      // ??? do we need to do something with result? ???
      // respond to todo.js with status via res response argument object
      res.json({ success : "success" });
    });
  });  // end of connect_to_db()
});  // end app.delete()



// expressjs: assign port 3000 to listen for requests from web page and todo.js
// assumes host address is self?
// var server = app.listen(process.env.PORT, process.env.IP, function () {
var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;
  // see command line where nodemon was initiated for stdout messages
  console.log('Example app listening at http://%s:%s', host, port);

});
