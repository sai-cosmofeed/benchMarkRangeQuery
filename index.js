const mongoose = require('mongoose');
const readline = require('readline');
const benchMark = require('./benchMark');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout

})

console.log("Connecting to DB...");
mongoose.connect("mongodb+srv://1Dreamiscosmofeed:1Dreamiscosmofeed@staging.okwey.mongodb.net/myFirstDatabase?retryWrites=true&w=majority")
  .then((res) => {
    console.log("Connected to DB");
    rl.question("Enter max number of groups to select: ", (maxNumberOfGroups) => {
      rl.question("Enter max range size: ", (maxRangeSize) => {
        benchMark(maxNumberOfGroups, maxRangeSize);
      })
    })
  }).catch(() => {
    console.log("falied connecting DB please restart")
  })