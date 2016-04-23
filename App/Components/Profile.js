var ProfileEdit = require('./ProfileEdit');
var api = require('../Utils/api');

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

class Profile extends Component{

  constructor(props) {
    super(props)
    this.state = {
      isLoading: true,
      status: ''
    };
  }

  getRowTitle(user, item) {
    item = item;
    return item[0] ? item[0].toUpperCase() + item.slice(1) : item;
  }

  handleProfileRender(item, value) {
    var userData = this.state.userData
    userData[item] = value;
    this.setState({
      userData: userData
    })
  }

  editProfile() {
    var that = this;
    this.props.navigator.push({
      title: 'Edit Profile',
      component: ProfileEdit,
      passProps: {userData: that.state.userData, authInfo: that.props.userInfo, handleProfileRender: this.handleProfileRender.bind(this)}
    });
  }

  componentWillMount() {
    this.getAsyncData();
  }

  getAsyncData() {
    var that = this;
    api.getUserData(that.props.userInfo.uid)
      .then(function(res) {
        console.log('user data:', res);
        that.setState({
          userData: res,
          isLoading: false
        })
      })
      .catch((err) => console.log(err))
  }

  handleSubmit() {
    var statusUpdate = this.state.status;
    console.log('status update: ', statusUpdate);
    this.setState({
      status: ''
    });
    // TODO: Refactor below
    // var item = item;
    var myData = this.props.userInfo;
    var that = this;
    console.log(myData);

    api.updateUserData(myData, 'status', statusUpdate);

    // that.setState({
    //   updateAlert: 'You have updated your info!'
    // })

    this.handleProfileRender('status', statusUpdate);

    // setTimeout(function() {
    //   that.setState({ updateAlert: '' })
    // }, 1000);
    // send status updat to firbase with api
  }

  handleChange(e) {
    this.setState({
      status: e.nativeEvent.text
    })
  }

  footer(){
    return (
      <View style={styles.footerContainer}>
        <TextInput
            style={styles.searchInput}
            value={this.state.status}
            onChange={this.handleChange.bind(this)} //TODO: implement handleChange
            placeholder="Update your status..."
            placeholderTextColor="#498183" />
        <TouchableHighlight
            style={styles.button}
            onPress={this.handleSubmit.bind(this)}
            underlayColor="#88D4F5">
              <Text style={styles.buttonText}>Submit</Text>
          </TouchableHighlight>
      </View>
    )
  }


  render(){
    if (this.state.isLoading) {
      return (
        <View style={styles.isLoadingContainer}>
          <Image style={styles.loadingImage} source={require('../Images/loading.gif')} />
        </View>
      )
    } else {
      var userData = this.state.userData;
      var topicArr = ['status', 'email', 'phone'];
      var context = this;

      var list = topicArr.map((item, index) => {
          return (
          <View key={index}>
            <View style={styles.rowContainer}>
              <Text style={styles.rowTitle}> {this.getRowTitle(userData, item)} </Text>
              <Text style={styles.rowContent}> {userData[item]} </Text>
            </View>
          </View>
        )
      })
      return (
        <View>
          <View style={styles.badgeContainer}>
            <TouchableHighlight onPress={() => this.editProfile()}>
              <Image style={styles.editImage} source={require('../Images/edit.png')} />
            </TouchableHighlight>
            <Image style={styles.badgeImage} source={{uri: userData.profileImageURL}} />
            <Text style={styles.badgeName}> {userData.name}</Text>
          </View>
          <View style={styles.container}>
            {list}
          </View>
          {this.footer()}
        </View>
      )
    }
  }
}

var styles = {
  isLoadingContainer: {
    flex: 1,
    marginTop: 150,
    alignSelf: 'center'
  },
  container: {
    flex: 1,
    marginLeft: 20,
    marginTop: 10,
    padding: 20
  },
  badgeContainer: {
    backgroundColor: '#498183',
    paddingBottom: 10,
    padding: 20,
    marginTop: 55,
    width: 400
  },
  badgeName: {
    alignSelf: 'center',
    fontSize: 21,
    marginTop: 10,
    marginBottom: 5,
    color: 'white'
  },
  badgeImage: {
    height: 126,
    width: 126,
    borderRadius: 63,
    alignSelf: 'center',
    borderWidth: 10,
    borderColor: '#9dc7c9'
  },
  editImage: {
    height: 30,
    width: 30,
    alignSelf: 'flex-end',
    marginRight: 20,
    marginTop: 20
  },
  loadingImage: {
    height: 100,
    width: 100,
    alignSelf: 'center',
    marginTop: 100
  },
  rowContainer: {
    padding: 10
  },
  rowTitle: {
    color: '#498183',
    fontSize: 16
  },
  rowContent: {
    color: '#022c3d',
    fontSize: 19
  },
  footerContainer: {
    backgroundColor: '#E3E3E3',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 0
    // flex: 1
  },
  searchInput: {
    height: 60,
    width: 300,
    // flexDirection: 'row',
    padding: 5,
    paddingLeft: 25,
    fontSize: 18,
    color: '#498183',
    backgroundColor: '#F0F4F5'
  },
  buttonText: {
    fontSize: 18,
    color: 'white'
  },
  button: {
    height: 60,
    width: 100,
    backgroundColor: '#498183',
    flex: 3,
    // flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

module.exports = Profile;

