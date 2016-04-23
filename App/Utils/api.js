var Firebase = require('firebase');

// Table Names: UserData, Friends, Groups, PeopleInGroups

var api = {

  // Add data to user, use after creating new user DONE
  setUserData(myData, name, phone) {
    var userId  = myData.uid;
    var userData = new Firebase(`https://project-ruby.firebaseio.com/UserData/${userId}`);

    userData.child('email').set(myData.password.email);
    userData.child('profileImageURL').set(myData.password.profileImageURL);
    userData.child('name').set(name);
    userData.child('phone').set(phone);
  },

  setUserLocation(myData, location) {
    var userId  = myData.uid;
    var userData = new Firebase(`https://project-ruby.firebaseio.com/UserData/${userId}`);

    userData.child('location').set(location);
  },

  updateUserData(myData, item, value) {
    var userId  = myData.uid;
    var userData = new Firebase(`https://project-ruby.firebaseio.com/UserData/${userId}`);

    if(value) {
      userData.child(item).set(value);
    }
  },

  // Add groups to Groups table DONE
  addGroup(groupName, groupDescription, userId) {
    // Add new group to Groups table
    var newGroup = new Firebase(`https://project-ruby.firebaseio.com/Groups/${groupName}`);
    // Set the description and add first member (the creator)
    newGroup.child('description').set(groupDescription);
    newGroup.child('members').push(userId);
    // Add group to creator's Groups table
    var myGroups = new Firebase(`https://project-ruby.firebaseio.com/UserData/${userId}/Groups`);
    myGroups.push(groupName);
  },

  // Add user to specific Group table DONE
  joinGroup(groupName, userId) {
    // Add user to group's Members table
    var groupToJoin = new Firebase(`https://project-ruby.firebaseio.com/Groups/${groupName}/members`);
    groupToJoin.push(userId);
    // Add group to user's Groups table
    var myGroups = new Firebase(`https://project-ruby.firebaseio.com/UserData/${userId}/Groups`);
    myGroups.push(groupName);
  },

  // Add user friends  to Friends table DONE
  addFriend(userId, friendId, reqId, cb) {
    // Adding friend to my userdata Friends table
    var myFriends = new Firebase(`https://project-ruby.firebaseio.com/UserData/${userId}/Friends`);
    myFriends.push(friendId);

    // Adding myself to my friend's userdata Friends table.
    var theirFriends = new Firebase(`https://project-ruby.firebaseio.com/UserData/${friendId}/Friends`);
    theirFriends.push(userId);

    this.removeFriendReq(userId, reqId, cb);
  },

  removeFriendReq(userId, reqId, cb) {
    var ref = new Firebase(`https://project-ruby.firebaseio.com/UserData/${userId}/FriendReqs`);
    ref.child(reqId).remove((error) => {
      if (error) {
        console.log(error);
      } else {
        console.log('Removed friend');
        cb();
      }
    });
  },

  sendFriendRequest(userId, friendId) {
    var theirReqs = new Firebase(`https://project-ruby.firebaseio.com/UserData/${friendId}/FriendReqs`);
    theirReqs.push(userId);
  },

  // Get user data DONE
  getUserData(userId) {
    var userData = `https://project-ruby.firebaseio.com/UserData/${userId}.json`;
    return fetch(userData).then((res) => res.json());
  },

  getGroupData(groupName) {
    var groupData = `https://project-ruby.firebaseio.com/Groups/${groupName}.json`;
    return fetch(groupData).then((res) => res.json());
  },

  // Get all friends in my Groups table DONE
  getUserGroups(userId) {
    var groups = `https://project-ruby.firebaseio.com/UserData/${userId}/Groups.json`;
    return fetch(groups)
    .then((res) => res.json())
    .then((groups) => {
        // Create an async function since we need to wait for the promises to return data
        async function getGroupInfo (callback){
          var result = [];
          for (var k in groups) {
            // Await waits for the promise chain to complete, then continues
            await callback(groups[k]).then((res) => {
              res.groupName = groups[k];
              result.push(res);
            });
          }
          // result is now populated with the friend's user data, and is returned to the user
          return result;
        };
        // Passing in the this.getUserData since the this binding is lost inside of the async function
        return getGroupInfo(this.getGroupData);
      });
  },

  // Get all friends in my Friends table DONE
  getUserFriends(userId) {
    var friends = `https://project-ruby.firebaseio.com/UserData/${userId}/Friends.json`;
    return fetch(friends)
    .then((res) => res.json())
    .then((friends) => {
        // Create an async function since we need to wait for the promises to return data
        async function getFriendData (callback){
          var result = [];
          for (var k in friends) {
            // Await waits for the promise chain to complete, then continues
            await callback(friends[k]).then((res) => {
              res.uid = friends[k];
              result.push(res);
            });
          }
          // result is now populated with the friend's user data, and is returned to the user
          return result;
        };
        // Passing in the this.getUserData since the this binding is lost inside of the async function
        return getFriendData(this.getUserData);
      });
  },

  getUserFriendReqs(userId) {
    var friendReqs = `https://project-ruby.firebaseio.com/UserData/${userId}/FriendReqs.json`;
    return fetch(friendReqs)
    .then((res) => res.json())
    .then((friendReqs) => {
        // Create an async function since we need to wait for the promises to return data
        async function getFriendData (callback){
          var result = [];
          for (var k in friendReqs) {
            // Await waits for the promise chain to complete, then continues
            await callback(friendReqs[k]).then((res) => {
              res.reqId = k;
              var uid = friendReqs[k];
              res.uid = uid;
              result.push(res);
            });
          }
          // result is now populated with the friend's user data, and is returned to the user
          return result;
        };
        // Passing in the this.getUserData since the this binding is lost inside of the async function
        return getFriendData(this.getUserData);
      });
  },

  findUserByEmail(emailInput) {
    var users = 'https://project-ruby.firebaseio.com/UserData.json';
    return fetch(users)
    .then((res) => res.json())
    .then((users) => {
      async function searchFriendData(callback) {
        var results = [];
        for (var k in users) {
          if (users[k].email) {
            if (users[k].email.toLowerCase().includes(emailInput.toLowerCase())) {
              console.log('find user by email', users[k]);
              await callback(users[k]).then((res) => {
                res.uid = k;
                res.info = users[k];
                results.push(res);
              });
            }
          }
        }
        return results;
      };
      return searchFriendData(this.getUserData);

    });
  },

  findGroupByName(nameInput) {
    var groups = 'https://project-ruby.firebaseio.com/Groups.json';
    return fetch(groups)
    .then(res => res.json())
    .then((groups) => {
      var results = [];
      for (var k in groups) {
        if (k.toLowerCase().includes(nameInput.toLowerCase())) {
          groups[k].groupName = k
          results.push(groups[k]);
        }
      };
      return results;
    })

  }
};

module.exports = api;
