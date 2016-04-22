'use strict';

import React, {
  StyleSheet,
  Text,
  View,
  TabBarIOS
} from 'react-native';

import Main from './Main';
import Friends from './Friends';
import Profile from './Profile';
import Map from './Map';
import MapboxMap from './MapboxMap';

var api = require('../Utils/api');

class TabBar extends React.Component {
  constructor(){
    super();
    this.state = {
      selectedTab: 'tabOne',
      isLoading: true,
      updateAlert: '',
      friendData: [],
      friendReqData: []
    };
  }

  setTab(tabId){
    this.setState({selectedTab: tabId});
  }

  getAsyncData() {
    console.log('getting data');
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

  componentWillMount() {
    this.getAsyncData();
  }

  render(){
    return (
      <TabBarIOS
      tintColor='#498183'
      >
      <TabBarIOS.Item
      selected={this.state.selectedTab === 'tabOne'}
      onPress={() => {this.setTab('tabOne'); this.getAsyncData()}}
      title="Friends"
      icon={require("../Images/friends.png")}>
      <Friends {...this.props} friendData={this.state.friendData} friendReqData={this.state.friendReqData} isLoading={this.state.isLoading} updateAlert={this.state.updateAlert} reload={this.getAsyncData.bind(this)} />
      </TabBarIOS.Item>
      <TabBarIOS.Item
      selected={this.state.selectedTab === 'tabTwo'}
      onPress={() => this.setTab('tabTwo')}
      title="Profile"
      icon={require("../Images/profile.png")}>
      <View style={styles.tabContent}>
      <Profile {...this.props} />
      </View>
      </TabBarIOS.Item>
      <TabBarIOS.Item
      selected={this.state.selectedTab === 'tabThree'}
      onPress={() => this.setTab('tabThree')}
      title="Connection"
      icon={require("../Images/map.png")}>
      <View style={styles.tabContent}>
      <MapboxMap {...this.props} />
      </View>
      </TabBarIOS.Item>
      </TabBarIOS>
      );
  }
}

var styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    alignItems: 'center'
  },
  tabText: {
    color: 'white',
    margin: 50,
    fontSize: 45
  }
});


module.exports = TabBar;
