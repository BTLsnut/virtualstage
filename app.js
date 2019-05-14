var formidable = require('formidable'),
    http = require('http'),
    util = require('util'),
    fs   = require('fs-extra');
var exif = require('exiftool');
var express = require('express');
var mkdirp=require('mkdirp');
var md5 = require('md5');
var jschardet = require('jschardet');

const MongoClient = require('mongodb').MongoClient, ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
var rows = {}; // indexed by y-position
var pages = "";

var app = express();
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));   
app.use(express.static('public'));
app.use('/files', express.static('files'));
app.post('/upload', function (req, res) {
    var form = new formidable.IncomingForm();
        console.log(form.multiples);
        form.multiples = true;
        form.maxFileSize = 1024 * 1024 * 1024;
        form.maxFieldsSize = 1024 * 1024 * 1024;
        form.hash = 'md5';
        form.parse(req, function(err, fields, files) {
            res.writeHead(200, {'content-type': 'text/plain'});
            res.write('received upload:\n\n');
            res.end(util.inspect({fields: fields, files: files}));
        });

        form.on('end', function(fields, files) {
            // console.log(this.openedFiles);
            console.log(" 총 업로드 파일 갯수 == ", this.openedFiles.length);
            for(var i = 0; i < this.openedFiles.length; i++) {
                /* Temporary location of our uploaded file */
                var temp_path = this.openedFiles[i].path;
                console.log(this.openedFiles[i])
                /* The file name of the uploaded file */
                var file_name = this.openedFiles[i].name;
                var split_file = file_name.split('.mp4')
                var hash = this.openedFiles[i].hash

                /* Location where we want to copy the uploaded file */
                var new_location = './files/';

                console.log("temp_path == ", temp_path);
                console.log("file_name == ", file_name);
                //console.log(this.openedFiles[i]);
                MongoClient.connect('mongodb://localhost:27017', function(err, client) {
                  assert.equal(null, err);
                  const db = client.db("virtualspace");
                  const collection = db.collection('concert');
                  console.log(temp_path);
                  
                    var final_location=new_location+split_file[0]+'/';
                    console.log(final_location+split_file[0]+".mp4")
                    //filename directory generate 
                    fs.move(temp_path,final_location+split_file[0]+".mp4", function(err){
                      if (err) {
                        console.error(err);
                      } else {
                        //file metadata get function
                        fs.readFile(final_location+split_file[0]+".mp4", function(err,data){
                          if(err)
                          throw err;
                          else{
                            exif.metadata(data, function(err, metadata){
                              console.log("memory"+JSON.stringify(process.memoryUsage()))
                              if(err)
                              throw err;
                              else{
                                var metadataObj={}
                                for(var index in metadata){
                                  metadataObj[index] = metadata[index]
                                }
                                var preparedJSON={
                                "filename":file_name,
                                "location":final_location,
                                "metadata": metadataObj
                                }
                                console.log(preparedJSON);
                                collection.insertOne(preparedJSON, function(error, response){
                                  console.log(response);
                                })
                              }
                            });
                          };
                        });
                        //mpd auto generator (powershell script execute)
                        var spawn = require("child_process").spawn,child;
                        child = spawn("powershell.exe",["./files/auto.ps1", split_file[0]]);
                        child.stdout.on("data",function(data){
                            console.log("Powershell Data: " + data);
                        });
                        child.stderr.on("data",function(data){
                            console.log("Powershell Script: " + data);
                        });
                        child.on("exit",function(){
                            console.log("Powershell Script finished"); 
                            
                        });
                        child.stdin.end(); 
                      }
                    })
                });
            }
        });
});
app.get('/list_metadata', function(req, res){
  var ret={};
  MongoClient.connect('mongodb://localhost:27017', function(err, client) {
    assert.equal(null, err);
    const db = client.db("virtualspace");
    const collection = db.collection('concert');
    collection.find(null,{}).sort({_id:-1}).toArray(function(err, docs){
      assert.equal(err, null);
      console.log(docs);

        res.write("<table border='solid 1px black' id='metadata'>")
        res.write("<tr>")
        res.write("<th>filename</th>")
        res.write("<th>metadata</th>")
        res.write("</tr>")
        for(var i=0; i<docs.length; i++){
          res.write("<tr>")
          res.write("<td>"+JSON.stringify(docs[i].filename)+"</td>")
          var new_string = JSON.stringify(docs[i].metadata).replace(/,/gi, "\n");
          console.log(new_string)
          res.write("<td><pre>"+new_string+"</pre></td>")
          res.write("</tr>")
        }
        
      // res.write(JSON.stringify(docs[0].filename))
      res.end("</table>")
      
      })
  });
})
// app.post('/edit_mp4', function(request, response){
  
//   if(request.body.oper == 'del'){
//     var o_id= new ObjectID(request.body.id)
//     MongoClient.connect('mongodb://localhost:27017', function(err, client) {
//       assert.equal(null, err);
//       const db = client.db("document_manage");
//       const collection = db.collection('mp4_lists');
//       collection.deleteOne({_id:o_id}, function(error, result){
//         assert.equal(null, error);
//         fs.remove(request.body.id+".mp4", err => {
//           if (err) return console.error(err)
//           console.log('.mp4 is deleted!')
//         })
//         fs.remove(request.body.id+".html", err => {
//           if (err) return console.error(err)
//           console.log('.html is deleted!')
//         })
//         response.end(request.body.id)
//         console.log(result)
//       });
//     });
//   } else if(request.body.oper == 'edit'){
//     var o_id= new ObjectID(request.body._id)
//     delete request.body.oper;
//     delete request.body._id;
    
//     var prepJson = {$set:request.body}
//     MongoClient.connect('mongodb://localhost:27017', function(err, client) {
//       assert.equal(null, err);
//       const db = client.db("document_manage");
//       const collection = db.collection('mp4_lists');
//       collection.updateOne({_id:o_id}, prepJson, function(err, res){
//         assert.equal(null, err);
//         //console.log(res);
//         response.end("!")
//       });
//     });
//   }  
// })
// app.get('/get_mp4_by_id', function(req, res){
//   var o_id= new ObjectID(req.query._id);
//   MongoClient.connect('mongodb://localhost:27017', function(err, client) {
//     assert.equal(null, err);
//     const db = client.db("document_manage");
//     const collection = db.collection('mp4_lists');
//     collection.find({_id:o_id},{projection:{Contents:1}}).toArray(function(err, docs){
//       assert.equal(err, null);
//       console.log(docs[0].Contents);
//       res.end("<p style='overflow: visible;'>"+docs[0].Contents+
//       "</p>")
//       //ret['rows'] = docs;
//       //res.json(ret);
//     })
//   });
// })

app.listen(3005, function () {
    console.log('Example app listening on port 3005!');
});
  
