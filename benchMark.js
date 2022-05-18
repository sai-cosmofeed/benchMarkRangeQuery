const ChatGroup = require("./models/ChatGroup");
const MessageModel = require("./models/ChatGroup");
const {performance} = require('perf_hooks');
const fs = require("fs");

const benchMark = async (maxNumberOfGroups = 1, maxRangeSize = 1) => {

  console.log("⭕️ Fetching groupIds....");
  const groupIds = await ChatGroup.find({}, { _id: 1 }).limit(
    maxNumberOfGroups
  );
  console.log("✅ Fetched group ids");


  let msg = {};
  console.log("⭕️ Fetching msgs....");
  const promises = groupIds.map(({ _id }) => (
    MessageModel.find(
      { chatroomId: _id },
    ).select({ createdAt: 1, chatroomId: 1}).limit(maxRangeSize).exec()
  ));

  const msgsArray = await Promise.all(promises);
  console.log("✅ Fetched msgs");


  const dateRanges = msgsArray.map((msgs, index) => {
    const dates = msgs.map(msg => msg.createdAt)
    return {
      chatroomId: groupIds[index]._id, // order is preserved
      start: new Date(Math.min.apply(null, dates)),
      end: new Date(Math.max.apply(null, dates))
    }
  })
  
  console.log("⭕️ Performing range queries concurrently");
  
  const start = performance.now();
  const rangePromises = dateRanges.map(dateRange => 
    MessageModel
      .find({ chatroomId: dateRange.chatroomId, createdAt: { $gt: dateRange.start, $lte: dateRange.end } })
      .explain({ verbosity: "executionStats" })
  )  

  const stats = await Promise.all(rangePromises);
  console.log("Execution time of range query: ",performance.now() - start, "ms")
  
  const filteredStats = stats.map(({executionStats, serverInfo, clusterTime, operationTime}) => 
  ({executionStats, serverInfo, clusterTime, operationTime}))
  const statsString = JSON.stringify(filteredStats, null, 2);
  
  console.log("saving stats to explainLogs.json...");
  fs
    .writeFile('explainLogs.json', statsString, (err => {
      if(err) {
        console.log("❌ Falied saving stats");
        return process.exit(1);
      }
      console.log("✅ saved")
      return process.exit(0);
    }))
  
    // executionStats, serverInfo, clusterTime, operationTime
};

module.exports = benchMark;
