var api = require('../Utils/api');
var Separator = require('./Helpers/Separator');
var Firebase = require('firebase');

import React, {
  View,
  Text,
  Image,
  StyleSheet,
  Component,
  ScrollView,
  TouchableHighlight,
  TextInput
} from 'react-native';

class FriendsAdd extends Component{

  constructor(props) {
    super(props);
    this.state = {
      updateAlert: '',
      isLoading: false,
      foundFriend: false,
      matches: []  // to store matches of search
    };
  }

  captureItemChange(event) {
    this.setState({
      friendEmail: event.nativeEvent.text
    });
  }

  searchUsers(event) {
    var context = this;
    this.setState({
      // query: event.nativeEvent.text
      isLoading: true
    });
    // console.log(this.state.query);
    var query = event.nativeEvent.text || '';
    var potentialMatches = [];
    var usersRef = new Firebase(`https://project-ruby.firebaseio.com/UserData`);
    usersRef.on('value', function(snap) {
      var users = snap.val();
      for (var uid in users) {
        var user = users[uid];
        var name = users[uid].name;
        user.uid = uid;
        // console.log('user is:', user);
        // console.log(typeof name);
        // console.log(name);
        if (name) {
          name = name.toLowerCase();
          if (name.indexOf(query.toLowerCase()) > -1) {
            console.log('found a potential match');
            potentialMatches.push(user);
          }
        }
        context.setState({matches: potentialMatches, isLoading: false});
        console.log('state match:', context.state.matches);
        // compare name to query
          // if match, push user object into results
        // update
      }
    });
    // console.log('Users:',users);
    // var aUser = api.getUserData('122d7551-2cc5-4a62-b8b8-408b7198cb9e')
    //   .then(function(user) {
    //     console.log('just one', user);
    // });
  }

  sendFriendRequest(event, match) {
    for (var prop in this.props) {
      console.log(prop, 'is', this.props[prop]);
    }
    var userId = this.props.userInfo.uid;
    console.log('match is', match);
    var matchId = match.uid;// TODO: need to pass the new friends id right here, maybe as a parameter???
    var that = this;

    api.sendFriendRequest(userId, matchId);

    that.setState({
      updateAlert: 'Friend Request Sent!',
      foundFriend: false
    });


    setTimeout(function() {
      that.setState({ updateAlert: '' });
    }, 3000);
  }

  searchForFriend(event) {
    var that = this;
    var friendEmail = that.state.friendEmail;
    var allFriends = that.props.allFriends;
    var foundFriend = false;

    that.setState({
      isLoading: true
    });

    if (allFriends.length > 0) {
      for (var i = 0; i < allFriends.length; i++) {
        if (allFriends[i].email === friendEmail) {
          that.setState({
            updateAlert: 'You are already friends with that person!',
            isLoading: false
          });
          foundFriend = true;
        }
      }
    }

    if (foundFriend === false) {
      console.log('friend email is ', that.state.friendEmail);
      api.findUserByEmail(friendEmail)
        .then(function(res) {
          that.setState({
            newFriend: res,
            isLoading: false,
            foundFriend: true
          });
        })
        .catch(function(err) {
          that.setState({
            updateAlert: 'That user was not found.',
            isLoading: false,
            foundFriend: false
          });
        });
    }

    setTimeout(function() {
      that.setState({ updateAlert: ''});
    }, 3000);
  }

  render(){
    //TODO: input logic for if state of matches
    // if matches is truthy, has length
    //   create friends elements and display
    // else
    //   no matches
    var context = this;
    var friendDisplay = this.state.matches ? this.state.matches.map((match, index) => {

      return (

        <View key={index}>
          <View style={styles.listContainer}>
          <Image
            style={styles.image}
            source={{uri: match.profileImageURL}} />
          <Text style={styles.name}> {match.name} </Text>
          <TouchableHighlight
            style={styles.button}
            onPress={(event)=>context.sendFriendRequest(event, match)}
            underlayColor='white' >
            <Text style={styles.buttonText}> ADD FRIEND </Text>
          </TouchableHighlight>
          </View>
          <Separator />
        </View>
      )
    }) : <View></View>;

    if (this.state.foundFriend) {

      // var friends = this.state.newFriend;
      // var allFriends = this.props.allFriends;
      // var friendList = [];
      // var that = this;

      // for (var i=0; i < friends.length; i++) {
      //   var currentFriend = false;
      //   for (var j=0; j < allFriends.length; j++) {
      //     if (friends[i].info.email === allFriends[j].email) {
      //       currentFriend = true;
      //     }
      //   }
      //   // adds anybody not already friends to friendList
      //   if (currentFriend === false) {
      //     friendList.push(friends[i]);
      //   }
      // }

    }

    if (this.state.isLoading) {
      var loadingFriend = (
        <View style={styles.isLoadingContainer}>
          <Image style={styles.loadingImage} source={require('../Images/loading.gif')} />
        </View>
      )
    }

    // var userData = this.props.userData;

    return (
      <View style={styles.container}>
        <Text style={styles.alertText}>{this.state.updateAlert}</Text>
        <View style={styles.rowContainer}>
            <Text style={styles.rowTitle}> Search by Email Address </Text>
            <TextInput
              autoCapitalize='none'
              style={styles.searchInput}
              onChange={(event)=>this.searchUsers(event)} />
            {/*<TouchableHighlight
              style={styles.button}
              onPress={()=>this.searchForFriend()}
              underlayColor='white' >
              <Text style={styles.buttonText}> SEARCH </Text>
            </TouchableHighlight> */}
            </View>
        <ScrollView
          showsVerticalScrollIndicator={true}
        >
        {loadingFriend}
        {friendDisplay}
        </ScrollView>
      </View>
    )
  }
}

var styles = {
  container: {
    flex: 1,
    marginLeft: 20,
    marginRight: 10,
    marginTop: 100
  },
  listContainer: {
    padding: 20
  },
  isLoadingContainer: {
    flex: 1,
    alignSelf: 'center'
  },
  loadingImage: {
    height: 100,
    width: 100,
    alignSelf: 'center'
  },
  button: {
    height: 25,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderColor: 'white',
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 15,
    alignSelf: 'flex-end',
    justifyContent: 'center'
  },
  buttonText: {
    padding: 10,
    fontSize: 10
  },
  alertText: {
    marginTop: 20,
    color: '#feb732'
  },
  rowContainer: {
    padding: 3
  },
  rowTitle: {
    color: '#498183',
    fontSize: 16
  },
  image: {
    height: 50,
    width: 50,
    borderRadius: 25,
    position: 'absolute'
  },
  name: {
    paddingLeft: 80,
    marginTop: 15,
    fontSize: 20,
    backgroundColor: 'rgba(0,0,0,0)'
  },
  searchInput: {
    height: 30,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 5,
    marginTop: 5,
    padding: 3
  }
};

module.exports = FriendsAdd;

