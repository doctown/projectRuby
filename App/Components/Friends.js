var Connections = require('./Connections');
var Separator = require('./Helpers/Separator');
var api = require('../Utils/api');
var ProfileFriend = require('./ProfileFriend');
var AddFriendButton = require('./AddFriendButton');
var FriendsAdd = require('./FriendsAdd');

import React, {
  View,
  Text,
  StyleSheet,
  Component,
  ScrollView,
  TouchableHighlight,
  Image,
  AlertIOS
} from 'react-native';


class Friends extends Component{

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      updateAlert: '',
      friendData: [],
      friendReqData: []
    };
  }

  handleFriendReqsRender(newFriend) {
    var friendData = this.state.friendData;
    friendData.push(newFriend.info);

    this.setState({
      friendData: friendData
    });
  }

  componentWillMount() {
    this.getAsyncData();
  }

  getAsyncData() {
    var that = this;
    api.getUserFriends(that.props.userInfo.uid)
    .then(function(res) {
      that.setState({
        friendData: res,
        isLoading: false
      });
    })
    .catch(function(err) {
      that.setState({
        updateAlert: 'Add some friends to get started!',
        isLoading: false
      });
    });

    api.getUserFriendReqs(that.props.userInfo.uid)
    .then(function(res) {
      that.setState({
        friendReqData: res,
        isLoading: false
      });
    })
    .catch(function(err) {
      that.setState({
        updateAlert: 'Add some friends to get started!',
        isLoading: false
      });
    });
  }

  startConnection(rowData) {
    var rowData = rowData;
    this.props.navigator.push({
      title: 'Connection',
      component: Connections,
      passProps: {friendData: rowData}
    });
  }

  viewFriend(rowData){
    var rowData = rowData;
    this.props.navigator.push({
      title: 'View Friend',
      component: ProfileFriend,
      passProps: {friendData: rowData}
    });
  }

  friendOptions(rowData){
    var rowData = rowData;
    AlertIOS.alert('Friend Time!', 'Do you want to start a connection?', [
      {text: 'No, View Profile', onPress: () => { this.viewFriend(rowData); }, style: 'default'},
      {text: 'No, Cancel', onPress: () => { console.log('back to page'); }, style: 'default'},
      {text: 'Yes, Start Connection', onPress: () => { this.startConnection(rowData); }, style: 'cancel'},
      ]
      );
  }

  friendReqOptions(rowData){
    var rowData = rowData;
    var that = this;
    AlertIOS.alert('Friend Request', 'Would you like to add this friend?', [
      {text: 'Yes, add friend', onPress: () => { this.acceptRequest(rowData); }, style: 'default'},
      {text: 'No, decline invite', onPress: () => { this.declineRequest(rowData); }, style: 'destructive'},
      {text: 'View Profile', onPress: () => { this.viewFriend(rowData); }, style: 'default'},
      {text: 'Cancel', onPress: () => { console.log('back to page'); }, style: 'cancel'},
      ]
      );
  }

  acceptRequest(friend) {
    api.addFriend(this.props.userInfo.uid, friend.uid, friend.reqId, this.getAsyncData.bind(this));
  }

  declineRequest(enemy) {
    api.removeFriendReq(this.props.userInfo.uid, enemy.reqId, this.getAsyncData.bind(this));
  }

  addFriends(){
    var that = this;
    that.props.navigator.push({
      title: 'Add Friends',
      component: FriendsAdd,
      passProps: {userInfo: that.props.userInfo, allFriends: that.state.friendData}
    });
  }

  render(){

    if (this.state.isLoading) {
      return (
        <View style={styles.isLoadingContainer}>
        <Image style={styles.loadingImage} source={require('../Images/loading.gif')} />
        </View>
        )
    } else {
      var user = this.props.userInfo;
      var friends = this.state.friendData;
      var friendReqs = this.state.friendReqData;

      if (friends.length > 0) {
        var friendsView = friends.map((item, index) => {
          return (
            <View key={index}>
            <TouchableHighlight
            style={styles.rowContainer}
            onPress={() => this.friendOptions(item)}
            underlayColor="#EEE">
            <View>
            <Image
            style={styles.image}
            source={{uri: item.profileImageURL}} />
            <Text style={styles.name}>{item.name}</Text>
            </View>
            </TouchableHighlight>
            <Separator />
            </View>
            )
        });
      } else {
        var friendsView = (
          <View>
          <Text style={styles.friendAlert}>Get started - add some friends!</Text>
          </View>
          )
      };

      if (friendReqs.length > 0) {
        var friendReqsHeader = (<Text style={styles.header}>Friend Requests</Text>);
        var friendsReqsView = friendReqs.map((item, index) => {
          return (
            <View key={index}>
            <TouchableHighlight
            style={styles.rowContainer}
            onPress={() => this.friendReqOptions(item)}
            underlayColor="#EEE">
            <View>
            <Image
            style={styles.image}
            source={{uri: item.profileImageURL}} />
            <Text style={styles.name}>{item.name}</Text>
            </View>
            </TouchableHighlight>
            <Separator />
            </View>
            );
        });
      }

      return (
        <View style={styles.container}>
        <Text style={styles.alertText}>{this.state.updateAlert}</Text>
        <TouchableHighlight onPress={() => this.addFriends()}>
        <Image style={styles.addFriendsImage} source={require('../Images/plus.png')} />
        </TouchableHighlight>
        <ScrollView
        showsVerticalScrollIndicator={true}
        >
        <Text style={styles.header}>Friends</Text>
        {friendsView}
        {friendReqsHeader}
        {friendsReqsView}
        </ScrollView>
        </View>
        )
    }
  }
}

var styles = {
  container: {
    flex: 1,
    marginTop: 0
  },
  isLoadingContainer: {
    flex: 1,
    marginTop: 150,
    alignSelf: 'center'
  },
  loadingImage: {
    height: 100,
    width: 100,
    alignSelf: 'center',
    marginTop: 100
  },
  alertText: {
    marginTop: 20,
    fontSize: 16,
    color: '#feb732'
  },
  friendAlert: {
    marginLeft: 20,
    marginTop: 20,
    fontSize: 16,
    color: 'red'
  },
  rowContainer: {
    padding: 30,
    height: 110,
    flexDirection: 'row',
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
  header: {
    paddingLeft: 10,
    fontSize: 20,
    marginTop: 25
  },
  addFriendsImage: {
    height: 30,
    width: 30,
    alignSelf: 'flex-end',
    marginRight: 20,
    marginTop: 40,
    flex: 1
  },
};

Friends.propTypes = {
  userInfo: React.PropTypes.object.isRequired
}

module.exports = Friends;
