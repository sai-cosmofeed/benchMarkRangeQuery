const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const _ = require("lodash");
const Schema = mongoose.Schema;
const { sendPushNotification } = require("../../services/NotificationService");
const moment = require('moment');

const messageSelect = (userId) => ({
  userDetails: 1,
  chatroomId: 1,
  messageType: 1,
  messageSource: 1, 
  joiningLink:1,
  contentType:1,
  scheduleStartTime: 1,
  scheduleEndTime: 1,
  scheduleDuration: 1,
  pinned: 1,
  originalFilename: 1,
  mediaText: 1,
  OriginalFileType: 1,
  messageText: 1,
  paymentAmount: 1,
  paymentDeclined: 1,
  paymentType: 1,
  starsAwarded: 1,
  otherTypeActivity: 1,
  options: 1,
  multipleAnswers: 1,
  botPath: 1,
  readByLength: 1,
  repliedOver: 1,
  reactionsOption: 1,
  description: 1,
  questions: 1,
  publishTime: 1,
  expirationTime: 1,
  discussionId: 1,
  isDiscussionResponse: 1,
  isPremium: 1,
  premiumCost: 1,
  unlockedByUserIds: 1,
  deletedFor: 1,
  heading: 1,
  showAfterExpiry: 1,
  platformFee: 1,
  deductFromCreator: 1,
  premiumServiceId: 1,
  reactionsOption: 1,
  createdAt: 1,
  answers: {$elemMatch: {userId:mongoose.Types.ObjectId(String(userId)) }},
  reactions: {$elemMatch: { userId: mongoose.Types.ObjectId(String(userId)) }},
})

const MessageSchema = new Schema(
  {
    userDetails: {
      senderDisplayName: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        ref: "User",
      },
    },
    chatroomId: { type: mongoose.Schema.Types.ObjectId, index: true },
    messageType: String,
    messageSource: {
      type: String,
      enum: ['broadcast', 'discussion', 'one-to-one'],
      default: 'broadcast',
      required: true
    }, 
    joiningLink: String,
    contentType: String,
    openForWork: Boolean,
    openForWorkStatus: String,
    scheduleStartTime: Date,
    scheduleEndTime: Date,
    scheduleDuration: Number,
    pinned: Boolean,
    originalFilename: String,
    mediaText: String,
    OriginalFileType: String,
    messageText: String,
    paymentAmount: Number,
    paymentDeclined: Boolean,
    paymentType: String, // {Pay / Request}
    starsAwarded: { type: Boolean, default: false },
    stars: [{ userId: mongoose.Schema.Types.ObjectId, count: Number, feedback: String }],
    otherTypeActivity: String, // ['question' , 'poll']
    answers: [{ userId: mongoose.Schema.Types.ObjectId, data: String, option: Number }],
    options: [{value:String, count:Number}],
    multipleAnswers: { type: Boolean, default: false },
    botPath: String, /// Path or Link where cosmo bot will take once clicked on messege
    readBy: [{ type: mongoose.Schema.Types.ObjectId, index: true }],
    readByLength: Number,
    visibleToUserIds: [{ type: mongoose.Schema.Types.ObjectId, index: true }],
    repliedOver: {
      senderName: String,
      messegeId: mongoose.Schema.Types.ObjectId,
      senderId: mongoose.Schema.Types.ObjectId,
      messageText: String,
      OriginalFileType: String,
      originalFilename: String,
      mediaText: String,
      premiumCost: Number,
    },
    // Emoji reactions on Message
    // [
    //   "fire",
    //   "clapping-hands",
    //   "thumbsUp",
    //   "money-mouth",
    // ]
    reactionsOption: {
        fire: {
          type: Number,
          default: 0
        },
        "clapping-hands": {
          type: Number,
          default: 0
        },
        thumbsUp: {
          type: Number,
          default: 0
        },
        "money-mouth": {
          type: Number,
          default: 0
        }

      },
    
    reactions: [{ 
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }, 
      reaction: {
        type: String,
        enum: [
          "fire",
          "clapping-hands",
          "thumbsUp",
          "money-mouth",
        ]
      }  
    }],

    // reactions: reactionsUsed.reduce((prevValue, currValue) => {
    //   prevValue[currValue] = _.cloneDeep(reaction);
    //   return prevValue
    // }, {}),
    ////survey params ///name will go in messegeText

    description: String,
    questions: [
      {
        question: String,
        answerType: String, ///Paragraph , MCQ
        options: [String],
        multipleOptions: Boolean,
        answers: [{ userId: mongoose.Schema.Types.ObjectId, data: String, option: Array }],
      },
    ],
    submittedByUsers: [mongoose.Schema.Types.ObjectId],
    publishTime: Date,
    expirationTime: Date, /// USED IN POLL as well as paid message
    discussionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discussion' },

    // true if it is a message belong to a discussion message
    isDiscussionResponse: {
      type: Boolean,
      default: false
    },

    ///For premium message////
    isPremium: Boolean,
    premiumCost: Number,
    unlockedByUserIds: [mongoose.Schema.Types.ObjectId],
    deletedFor: { type: Array, index: true },
    heading: String,
    showAfterExpiry: Boolean,
    platformFee: { type: Number, default: 10 },
    deductFromCreator: { type: Boolean, default: false },
    premiumServiceId:{type:mongoose.Schema.Types.ObjectId}
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);
MessageSchema.plugin(mongoosePaginate);

MessageSchema.statics.postMessage = async function ({
  senderId,
  receiverId,
  senderDisplayName,
  roomId,
  messageType,
  contentType,
  messageText,
  messagePic,
  originalFilename,
  messagePicThumbnail,
  vaRoomId,
  vaType,
  startTime,
  endTime,
  duration,
  paymentAmount,
  paymentType,
  openForWork,
  joiningLink,
  otherTypeActivity,
  options,
  multipleAnswers,
  botPath,
  visibleToUserIds,
  replyMessege = {},
  mediaText,
  OriginalFileType,
  description,
  questions,
  publishTime,
  expirationTime,
  isPremium,
  premiumCost,
  heading,
  showAfterExpiry,
  platformFee,
  deductFromCreator,
  premiumServiceId,
  messageSource='broadcast',
  discussionId=null,
  isDiscussionResponse=false
}) {
  try {
    let data = {
      userDetails: {
        senderDisplayName,
        sender: mongoose.Types.ObjectId(senderId),
        //receiver: mongoose.Types.ObjectId(receiverId),
      },
      options,
      otherTypeActivity,
      chatroomId: roomId,
      messageType,
      openForWork,
      contentType,
      paymentAmount,
      paymentType,
      messagePic,
      originalFilename,
      messagePicThumbnail,
      messageText,
      joiningLink,
      botPath,
      multipleAnswers,
      messageStatus: "sent",
      reactions: [],
      scheduleStartTime: startTime || new Date(),
      scheduleEndTime: endTime || new Date(),
      scheduleDuration: duration || 0,
      readBy: [mongoose.Types.ObjectId(senderId)],
      visibleToUserIds,
      mediaText,
      OriginalFileType,
      repliedOver: {
        messegeId: replyMessege?._id,
        senderId: replyMessege?.userDetails?.sender,
        messageText: replyMessege?.messageText,
        senderName: replyMessege?.userDetails?.senderDisplayName,
        OriginalFileType: replyMessege?.OriginalFileType,
        originalFilename: replyMessege?.originalFilename,
        mediaText: replyMessege?.mediaText,
        premiumCost: replyMessege?.premiumCost,
      },
      description,
      questions,
      publishTime,
      expirationTime,
      isPremium,
      unlockedByUserIds: [],
      premiumCost,
      heading,
      showAfterExpiry,
      readByLength: 1,
      platformFee,
      deductFromCreator,
      messageSource,
      discussionId,
      isDiscussionResponse
    };
    if (vaRoomId) {
      data.vaRoomId = vaRoomId;
    }
    if (vaType) {
      data.vaType = vaType;
    }
   if(premiumServiceId){
     data.premiumServiceId = premiumServiceId;
   }

   // TODO: post only if user is admin or super admin
  //  if(data.messageSource === 'broadcast') {}

   // TODO: post only if discussion is enabled by super admin
  //  if(data.messageSource === 'discussion') {}
    let message = await this.create(data);
    if (visibleToUserIds) {
      sendPushNotification({
        chatroomId:roomId,
        sender: senderDisplayName,
        userIds: _.filter(visibleToUserIds, (val) => String(senderId) !== String(val)),
        content: premiumCost ? heading : originalFilename ? originalFilename || mediaText : messageText,
        messageSource,
        isDiscussionResponse
      });
    }

    return message;
  } catch (error) {
    throw error;
  }
};

MessageSchema.statics.updateStars = async function (id, count, userId, feedback) {
  try {
    let message = await this.findOne({ _id: id });
    message.starsAwarded = true;
    if (_.filter(message.stars, (val) => String(val.userId) === String(userId))?.[0]) {
      _.map(message.stars, (val) => {
        if (String(val.userId) === String(userId)) {
          val.count = count;
        }
      });
    } else {
      message.stars.push({ userId, count, feedback });
    }

    await message.save();
    return message;
  } catch (e) {
    throw e;
  }
};

MessageSchema.statics.getChatroomMessages = async function (roomId, page = 1, userId, pageSize) {
  try {
    let options = {
      page: page,
      limit: pageSize || 100,
      sort: { createdAt: -1 },
      lean: true,
      select: messageSelect(userId),
    };
    let results = await this.paginate({ chatroomId: roomId }, options);
    return results;
  } catch (error) {
    throw error;
  }
};

MessageSchema.statics.getBroadcastMessages = async function (roomId, page = 1, userId, pageSize = 100) {

  try {
    let options = {
      page,
      limit: pageSize,
      sort: { createdAt: -1 },
      lean: true,
      populate: 'discussionId',
      select: messageSelect(userId),
    };
    let results = await this.paginate({
      messageSource:'broadcast',
      // $and: [
      //   { messageSource: { $ne: 'discussion' } },
      //   { messageSource: { $ne: 'one-to-one' } }
      // ],
      chatroomId: roomId,
      isDiscussionResponse: false
    }, options);

    return results;
  } catch(error) {
    throw error;
  }
}

//isDiscussionResponse: false
// messageWithDiscussionId || messageSource === ‘discussion’
MessageSchema.statics.getDiscussionMessages = async function (roomId, page, userId, pageSize = 100) {
  try {
    let options = {
      page,
      limit: pageSize,
      sort: { createdAt: -1 },
      lean: true,
      populate: 'discussionId',
      select: messageSelect(userId),
    };
    let results = await this.paginate({
      chatroomId: roomId,
      messageSource: 'discussion',
      isDiscussionResponse:false
    },
      options
    );

    return results;
  } catch(error) {
    console.log(error);
    throw error;
  }
}

MessageSchema.statics.getDiscussionReply = async function(roomId, discussionId, page, userId,pageSize=100) {
  try {
    let options = {
      page,
      limit: pageSize,
      sort: { createdAt: 1 },
      populate: 'discussionId',
      lean: true,
      select: messageSelect(userId)
    };
    let results = await this.paginate({ 
      chatroomId: roomId, 
      discussionId,
      messageSource: 'discussion',
      isDiscussionResponse: true,
    },options);
    return results;
  } catch(error) {
    throw error;
  }
}

MessageSchema.statics.getMessageWithNMessagesAboveAndBelow = async function(roomId, messageId, messageSource, userId, isDiscussionResponse=false, discussionId=null, n=10) {
  try {
    // TODO get message date from front end
    const message = await this.findById(messageId).select(messageSelect(userId)); // findOneById
    // TODO use composit indexing here - Done
    let query = { chatroomId: roomId, messageSource };
    if(isDiscussionResponse) {
      query[discussionId] = discussionId
      query[isDiscussionResponse] = isDiscussionResponse;
    }

    // TODO composite indexing and promise.all to run conconnrently - Done
    const [abovemsg, belowMsg] = await Promise.all([this.find({...query, createdAt: { $gt: moment(message.createdAt).toISOString() } }, messageSelect(userId)).sort({ createdAt: 1 }).limit(n), this.find({...query, createdAt: { $lt: moment(message.createdAt).toISOString() }}, messageSelect(userId)).sort({ createdAt: -1 }).limit(n)])

    console.log(abovemsg.length,belowMsg.length,"Lengths" );
    return [...abovemsg.reverse(), message, ...belowMsg]
  } catch(error) {
    throw error;
  }
}

/**
 * Toggle reaction to the Message 
 * @param {ObjectId} messageId
 * @param {"fire" | "rocket" | "thumbsUp" | "money-mouth"} reaction 
 * @param {ObjectId} userId 
 * @param {{default: { type: Boolean, default: true }, location: Object, center: { X: Number, Y: Number }}} ProfilePicture 
 * @param {String} DisplayName 
 */
MessageSchema.statics.toggleReaction = async function(messageId, reaction, userId) {
  try {
    let message = await this.findOne(
      {
        _id: messageId,
      },
      messageSelect(userId)
    ).populate('discussionId');

    let updatedMessage = {};
    // if reaction already exit
    if (message.reactions.length) {
      const prevReaction = message.reactions[0].reaction;
      let incObj = {};
      let incA = {};
      let incS = {};
      incS[`reactionsOption.${prevReaction}`] = -1;
      incA[`reactionsOption.${reaction}`] = 1;
      incObj = { ...incA, ...incS };

      // if prevReaction === current Reaction
      if(prevReaction == reaction) {
        updatedMessage = await this.findByIdAndUpdate(
          messageId,
          {
            $pull: { reactions: { userId, reaction: prevReaction } },
            $inc: incS,
          },
          { 
            fields: messageSelect(userId),
            new: true 
          }
        ).populate('discussionId');

        return updatedMessage;
      }

      // if prev reaction !== current reaction
      // await message.update({ $pull: { reactions: { userId, reaction: prevReaction } } });
      await message.update({ $push: { reactions: { userId, reaction } } })

      updatedMessage = await this.findByIdAndUpdate(
        messageId,
        {
          $inc: incObj,
          $pull: { reactions: { userId, reaction: prevReaction } }
        },
        { 
          fields: messageSelect(userId),
          new: true 
        }
      ).populate('discussionId');

    } else {
      // if its a new reaction
      let incObj = {};
      incObj[`reactionsOption.${reaction}`] = 1;
      updatedMessage = await this.findByIdAndUpdate(
        messageId,
        {
          $push: { reactions: { userId, reaction } },
          $inc: incObj,
        },
        { 
          fields: messageSelect(userId),
          new: true 
        }
      ).populate('discussionId');
    }
    //}

    return updatedMessage;
  } catch(e) {
    throw e;
  }
};

MessageSchema.statics.getReactedUser = async function(messageId, reaction, startIndex = 0) {
  const messageReactions = await this.findOne({_id: messageId}, {
    reactions: {
      $elemMatch: { reaction },
      $slice: [startIndex, startIndex + 10]
    },
    reactions: 1
  }).populate('reactions.userId')

  return messageReactions;
}

MessageSchema.statics.startDiscussion = async function(messageId, discussionId) {
  try {
    const message = await this.findOne({ _id: messageId });
    message.discussionId = discussionId;
    message.save();
    return message;
  } catch (error) {
    throw error;
  }

}

MessageSchema.index({ chatroomId: 1, messageText: -1,messageSource:1 }); //

MessageSchema.index({ chatroomId: 1, mediaText: -1,messageSource:1 }); //

MessageSchema.index({ chatroomId: 1,createdAt: -1 }); //

MessageSchema.index({ chatroomId: 1, messageSource: 1, discussionId: 1 })

MessageSchema.index({ chatroomId: 1, messageSource: 1, isDiscussionResponse: 1, createdAt: -1 })

MessageSchema.index({ 
  chatroomId: 1,
  messageSource: 1,
  discussionId: 1,
  isDiscussionResponse: 1,
  createdAt: 1
})

//MessageSchema.index({ chatroomId: 1, readBy: 1 }); //

MessageSchema.index({ chatroomId: 1, pinned: 1 }); //

const MessageModel = mongoose.model("Message", MessageSchema);
module.exports = MessageModel;