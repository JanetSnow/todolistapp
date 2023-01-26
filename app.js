// jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
// const date = require(__dirname + "/date.js");
const _ = require('lodash');
const dotenv = require("dotenv");

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.set("view engine", "ejs");

dotenv.config();

const dbURL = process.env.MONGO_URL;

//这里我们保存本地版本，因为这里MONGO_URL直接放上去会报错，所以暂时将数据库链接放在.env中
mongoose
  .connect(dbURL, {useNewUrlParser: true,useUnifiedTopology: true})
  .then(console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

const itemsSchema = {
  name: String
}

const Item = mongoose.model("Item", itemsSchema);

const apple = new Item({
  name: "apple"
});
const banana = new Item({
  name: "banana"
});
const pear = new Item({
  name: "pear"
});
const defaultItems = [apple,banana,pear];

const listSchema = {
  name: String,
  items: [itemsSchema]
}

const List = mongoose.model("List", listSchema);


app.get("/", function(req,res){
  Item.find({},function(err, foundItems){
    if (foundItems.length === 0){
      Item.insertMany(defaultItems, function(err){
        if(err){
          console.log(err);
        }else{
          console.log("successfully inserted items into Item");
        }
      });
      res.redirect("/");
    } else{
      res.render("list", {listTitle: "Today", newListItems: foundItems});
    }
  });
});

app.post("/",function(req,res){
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if (listName === "Today"){
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err, foundList){
      if (err){
        console.log(err);
      } else {
        foundList.items.push(item);
        foundList.save();
        res.redirect("/" + listName);
      }
    });
  }
});

app.post("/delete", function(req,res){
  const checkedItemId = req.body.checkBox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId,function(err){
      if (!err) {
        console.log("successfully deleted checked item.");
        res.redirect("/");
      }
    });
  } else {
    // mongoose findOneAndUpdate 可以pull array elements,意思是通过 $pull, we can remove the item from array
    // 有了条件限制，对不同的route呈现的结果都会是不同的
    List.findOneAndUpdate({name: listName},{$pull: {items:{_id: checkedItemId}}},function(err,foundList){
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }
});


app.get("/:customListName", function(req,res){
  const customListName = _.capitalize(req.params.customListName);
  List.findOne({name: customListName}, function(err, foundList){
    if (!err){
      if (!foundList){
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    } else {
      console.log(err);
    }
  });
});

app.get("/about", function(req, res) {
  res.render("about");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port, function(){
  console.log("Server has started successfully.");
});
