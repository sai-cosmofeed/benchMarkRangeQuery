const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const chatGroupSchema = new mongoose.Schema(
  {
    Name: { type: String, index: true },
    Description: String,
    GroupType: String,
    freeOrPaid: String, //'Paid' , 'Free'
    freeCode: Number, ////Number of free days as trial
    roomType: { type: String, default: "group" }, // we will have type event for event group//
    eventId: { type: mongoose.Schema.Types.ObjectId, index: true },
    contentHostingId: {type: String, index: true},
    GroupCapacity: Number,
    genre: { type: String, index: true },
    meetingLink: String,
    visibility: String, // 'Public' , 'Private'
    invitationCodes: [String],
    lastMessage: {
      messageType: String,
      messageText: String,
      // originalFilename: String,
      createdAt: { type: Date, default: new Date() },
    },
    SubscriptionFees: {
      amount: Number,
      currency: String,
      subscriptionPeriodType: String,
    },
    GroupPicture: {
      location: Object,
    },
    rules: String,
    SuperAdmin: {
      userId: { type: mongoose.Schema.Types.ObjectId, index: true },
      unreadMessagesCount: { type: Number, default: 0 },
      pinnedRoom: { type: Boolean, default: false },
    },
    Admins: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, index: true },
        invitationCode: String,
        createdAt: Date,
        unreadMessagesCount: { type: Number, default: 0 },
        pinnedRoom: { type: Boolean, default: false },
      },
    ],
    Subscribers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, index: true },
        status: String, /// 'active' , 'inactive'
        subscriptionRenewedAt: Date,
        subscriptionExpiredAt: Date,
        createdAt: Date,
      },
    ],
    deletedFor: [mongoose.Schema.Types.ObjectId],
    chatHistory: String, // Show OR Hide to new users
    totalAmountEarned: Number,
    upvoteCount: { type: Number, default: 0 }, ///  For discover page 
    trending:{ type: Number, default: 0 }, /// This is temporary basis trending field ///
    upvotedUsers: [mongoose.Schema.Types.ObjectId],
    memberVisibility: {
      type: String,
      default: 'Show'
    }, //Can one member see other member //// Show , Hide
    hideSubscriberCount: Boolean, //Can one member see other member //// Show , Hide
    subscriptionPlans: [{ subscriptionPeriod: String, cost: Number }],
    gstRequired: { type: Boolean, default: false },
    tradingViewIdRequired: { type: Boolean, default: false },
    gstItemName: String,
    platformFee: { type: Number, default: 10 },
    deductFromCreator: { type: Boolean, default: false },
    subscribersCount: { type: Number, default: 0 },
    pinned: { type: Boolean, default: false },
    extendAvailable: { type: Boolean, default: true },
    connectedGroupIds:[mongoose.Schema.Types.ObjectId],
    discounts: Array,
    heading:String,
    enableDiscussion: {
      type: Boolean,
      default: false
    },
    showTotal:{ type: Boolean, default: false },
  },
  { timestamps: true }
);

chatGroupSchema.plugin(mongoosePaginate);

chatGroupSchema.statics.createChatGroup = async function ({
  user,
  Name,
  description,
  GroupType,
  GroupCapacity,
  currency,
  filename,
  profilePicture,
  freeCode,
  genre,
  rules,
  freeOrPaid,
  visibility,
  amount,
  subscriptionPeriodType,
  chatHistory,
  memberVisibility,
  subscriptionPlans,
  gstRequired,
  tradingViewIdRequired,
  hideSubscriberCount,
  gstItemName,
  discounts
}) {
  try {
    let data = {
      Name,
      Description: description,
      GroupType,
      Status: "active",
      CurrentSubscribers: 0,
      GroupCapacity: Number(GroupCapacity),
      TerminationRequest: false,
      GroupPicture: { default: true, location: profilePicture || "" },
      rules,
      lastMessage: {
        role: "superAdmin",
        postedBy: mongoose.Types.ObjectId(user._id),
        messageType: "chat",
        messageText: `Welcome to ${Name}`,
        originalFilename: "",
        messageStatus: "sent",
        createdAt: new Date(),
      },
      SubscriptionFees: {
        amount,
        currency,
        subscriptionPeriodType,
      },
      Rules: [{ rule: "placeholder", editable: false }],
      SuperAdmin: {
        userId: user._id,
        displayName: user.ProfileSettings.DisplayName,
        username: user.ProfileSettings.Username,
        //profilePicture: user.ProfileSettings.ProfilePicture,
      },
      Admins: [],
      Subscribers: [],
      Media: [],
      visibleToUserIds: [user._id],
      freeCode,
      genre,
      freeOrPaid,
      visibility,
      chatHistory,
      memberVisibility,
      subscriptionPlans,
      gstRequired,
      tradingViewIdRequired,
      gstItemName,
      hideSubscriberCount,
      platformFee: user.platformFee,
      deductFromCreator: user.deductFromCreator,
      discounts
    };
    if (filename) {
      data.GroupPicture.default = false;
      data.GroupPicture.location = filename;
    }
    if(freeOrPaid === 'Free' ){
      data.extendAvailable = false;
    }
    let chatGroup = await this.create(data);
    return chatGroup;
  } catch (e) {
    throw e;
  }
};

chatGroupSchema.statics.getMyChatGroups = async function (userId, mobile, ios, newMobile) {
  try {
    if (mobile) {
      if (newMobile) {
        const results = await this.find({ $or: [{ "SuperAdmin.userId": userId }, { "Admins.userId": userId }, { "Subscribers.userId": userId }] })
          .select({
            Name: 1,
            "GroupPicture.location.url": 1,
            lastMessage: 1,
            roomType: 1,
            updatedAt: 1,
            eventId: 1,
            'SuperAdmin.pinnedRoom':1
          })
          .lean();

        return results;
      }
      const results = await this.find({ $or: [{ "SuperAdmin.userId": userId }, { "Admins.userId": userId }, { "Subscribers.userId": userId }] })
        .select({
          Name: 1,
          "GroupPicture.location.url": 1,
          "SuperAdmin.userId": 1,
          "SuperAdmin.unreadMessagesCount": 1,
          Admins: 1,
          "SuperAdmin.pinnedRoom": 1,
          lastMessage: 1,
          roomType: 1,
          hideSubscriberCount: 1,
          GroupType: 1,
          updatedAt: 1,
          subscriptionPlans: 1,
          platformFee: 1,
          deductFromCreator: 1,
          SubscriptionFees: 1,
          gstRequired: 1,
          eventId: 1,
        })
        .populate({
          path: "SuperAdmin.userId",
          model: "User",
          select: {
            verified: 1,
          },
        })
        .lean();

      return results;
    }

    const results = await this.find({ $or: [{ "SuperAdmin.userId": userId }, { "Admins.userId": userId }, { "Subscribers.userId": userId }] })
      .select({
        Name: 1,
        "GroupPicture.location.url": 1,
        "SuperAdmin.userId": 1,
        "SuperAdmin.unreadMessagesCount": 1,
        Admins: 1,
        lastMessage: 1,
        roomType: 1,
        GroupType: 1,
        updatedAt: 1,
        hideSubscriberCount: 1,
        subscriptionPlans: 1,
        "SuperAdmin.pinnedRoom": 1,
        platformFee: 1,
        deductFromCreator: 1,
        SubscriptionFees: 1,
        gstRequired: 1,
        eventId: 1,
      })
      .lean();

    return results;
  } catch (e) {
    throw e;
  }
};

chatGroupSchema.statics.getChatRoom = async function (roomId) {
  try {
    let room = await this.findOne({ _id: roomId });
    return room;
  } catch (e) {
    throw e;
  }
};

chatGroupSchema.statics.updateLatestMessage = async function (roomId, role, postedBy, postedByName, messageType, contentType, messageText, originalFilename, messageStatus = "sent") {
  try {
    let chatRoom = await this.findOne({ _id: roomId });
    let data = {
      role,
      postedBy: mongoose.Types.ObjectId(postedBy),
      postedByName,
      messageType,
      contentType,
      messageText,
      originalFilename,
      messageStatus,
      createdAt: new Date(),
    };
    chatRoom.lastMessage = data;
    chatRoom.save();
  } catch (error) {
    throw error;
  }
};

const chatGroupModel = mongoose.model("ChatGroup", chatGroupSchema, "ChatGroups");

module.exports = chatGroupModel;
