import React, {
  View,
  Component,
  Text,
  Image,
  TouchableHighlight,
  StyleSheet,
  StatusBar,
  Dimensions,
  AlertIOS,
  Switch
} from 'react-native';
import Mapbox from 'react-native-mapbox-gl';
window.navigator.userAgent = "react-native";
let io = require('socket.io-client/socket.io');

var api = require('../Utils/api');
var turf = require('turf');
var mapRef = 'mapRef';
var _ = require('lodash');

var MapboxMap = React.createClass({
  mixins: [Mapbox.Mixin],
  getInitialState() {
    return {
      showLocation: false,
      zoom: 17,
      boundSet: false,
      currentLoc: undefined,
      annotations: [{
        coordinates: [40.72052634, -73.97686958312988],
        'type': 'point',
        title: 'This is marker 1',
        subtitle: 'It has a rightCalloutAccessory too',
        rightCalloutAccessory: {
          url: 'https://cldup.com/9Lp0EaBw5s.png',
          height: 25,
          width: 25
        },
        annotationImage: {
          url: 'https://cldup.com/CnRLZem9k9.png',
          height: 25,
          width: 25
        },
        id: 'marker1'
      }],
      socket: io('http://159.203.222.32:4568', {jsonp: false, transports: ['websocket']})
    };
  },
  onRegionChange(location) {
    this.setState({ currentZoom: location.zoom });
  },
  onRegionWillChange(location) {
    // console.log(location);
  },
  emitLocation(location) {
    this.socket.emit('change location', location);
    console.log('updating location');
  },
  onUpdateUserLocation(location) {
    this.emitLocationThrottled(location);
    this.setState({currentLoc: location});

    if (this.destination) {
      if (this.atSameLocation(location, this.destination, {distance: 1500, unit: 'meters'})) {
        this.removeAnnotation(mapRef, 'destination');
        delete this.destination;
        this.socket.emit('remove destination');
      }
    }
  },
  onOpenAnnotation(annotation) {
    console.log(annotation);
  },
  onRightAnnotationTapped(e) {
    console.log(e);
  },
  /*
   * Determines if two locations are at the same location.
   * @params: option.distance - distance between coordinates
   *          option.unit - unit of measurement for distance
   */
   atSameLocation(location1, location2, option = {distance: 1, unit: 'miles'}) {
    // Create a polygon around location1 and location2 and see if they intercept
    var point1 = turf.point([location1['longitude'], location1['latitude']], {name: 'loc-1'});
    var point2 = turf.point([location2['longitude'], location2['latitude']], {name: 'loc-2'});
    var point2Vicinity = turf.buffer(point2, option.distance, option.unit);

    return turf.inside(point1, point2Vicinity.features[0]);
  },
  onLongPress(location) {
    var addDestination = function() {
      this.destination = location;
      this.updateAnnotation(mapRef, {
        coordinates: [location.latitude, location.longitude],
        'type': 'point',
        title: 'Current Destination',
        annotationImage: {
          url: 'https://www.uniteller.com/images/Destination_Icon.png',
          height: 40,
          width: 50
        },
        id: 'destination'
      });

      this.socket.emit('set destination', location);
    };

    var removeDestination = function() {
      delete this.destination;
      this.removeAnnotation(mapRef, 'destination');
      this.socket.emit('remove destination')
    };

    if (!this.destination) {
      AlertIOS.alert('Destination', 'Add Destination?', [
        {text: 'Yes, set destination', onPress: addDestination.bind(this), style: 'default'},
        {text: 'No, Cancel', onPress: () => { console.log('cancelled'); }, style: 'cancel'}
        ]
        );
    } else {
      AlertIOS.alert('Destination', 'Update Destination?', [
        {text: 'Yes, update destination', onPress: addDestination.bind(this), style: 'default'},
        {text: 'Remove Destination', onPress: removeDestination.bind(this), style: 'default'},
        {text: 'No, Cancel', onPress: () => { console.log('cancelled'); }, style: 'cancel'}
        ]
        );
    }
  },
  onTap(location) {
    console.log('tapped', location);
  },
  componentDidMount(){
    this.sendShowLocation();
    this.setUserTrackingMode(mapRef, this.userTrackingMode.follow);
    this.socket = io.connect('http://159.203.222.32:4568', {jsonp: false, transports: ['websocket']});
    this.socket.emit('registerID', this.props.userInfo.uid);
    this.emitLocationThrottled = _.throttle(this.emitLocation, 15000);
    var smsNotificationFrequency = 60 * 1000;
    this.debouncedSendNotification = _.debounce(this.sendUserSMSNotification, smsNotificationFrequency, true);

    // Fetches the friends from the database, creates a list of friends,
    // and sends the list to the server to be added on the socket.friends for this user.
    api.getUserFriends(this.props.userInfo.uid).then((friendData) => {
      this.friends = friendData;
      var friendIDs = friendData.map((friend) => {
        return friend.uid;
      });
      this.socket.emit('registerFriends', friendIDs);
    });

    // Response to chat messages sent on socket
    this.socket.on('chat message', (msg) => {
      console.log('Woohoo it worked! ', msg);
    });

    /*
     * A friend is within your radius. Handle a notification and renders the update.
     * @params: notification.message - message to be communicated
     *          notification.senderID - id of the sender
     *          notification.recipientID - id of the person to be notified
     */
     this.socket.on('notification', (notification) => {
      // TODO: Add a notification event like a push notification.
      console.log('notification received');
    });

    var connectedIDs = []; // all friend ids that are currently connected

    /*
     * Indicates that user has changed locations.
     * @params: changeInfo.id - users id
     *          changeInfo.loc.longitude - longitude
     *          changeInfo.loc.latitude - latitude
     *          this.fiends.uid - user id of the friend
     */
     this.socket.on('change location', (changeInfo) => {
      var id = changeInfo.id;
      var loc = changeInfo.loc;

      // Compare my location radius to my end point's and if they intersect emit a notification
      this.checkProximityToFriend(this.state.currentLoc, loc, this.props.userInfo.uid, id, this.socket, {distance: 1, unit: 'miles'});

      // Find the appropriate friend that triggered the change and update the map with friend's new location.
      var friends = this.friends;
      var friend;
      for (var i = 0; i < friends.length; i++) {
        if (friends[i].uid === id) {
          friend = friends[i];
          // NOTE: Consideration, breaking out of the loop once the friend is found.
        }
      }

      // Update connected friend's list with this friends id and send the user's current location
      if (connectedIDs.indexOf(id) < 0) {
        connectedIDs.push(id);
        this.emitLocation(this.state.currentLoc);
      }

      var myLat = this.state.currentLoc.latitude;
      var myLong = this.state.currentLoc.longitude;
      var lat = loc.latitude;
      var long = loc.longitude;

      this.updateAnnotation(mapRef, {
        coordinates: [lat, long],
        'type': 'point',
        title: friend.name,
        subtitle: friend.status,
        annotationImage: {
          url: friend.profileImageURL,
          height: 25,
          width: 25
        },
        id: id
      });

      if (!this.state.boundSet) {
        this.setVisibleCoordinateBoundsAnimated(mapRef, lat, long, myLat, myLong, 50, 50, 50, 50);
        this.state.boundSet = true;
      }
    });

     this.socket.on('set destination', (destinationInfo) => {
      var id = destinationInfo.id;
      var loc = destinationInfo.loc;

      /* Find appropriate friend to update map info */
      var friends = this.friends;
      var friend;
      for (var i = 0; i < friends.length; i++) {
        if (friends[i].uid === id) {
          friend = friends[i];
        }
      }

      var myLat = this.state.currentLoc.latitude;
      var myLong = this.state.currentLoc.longitude;
      var lat = loc.latitude;
      var long = loc.longitude;
      this.updateAnnotation(mapRef, {
        coordinates: [lat, long],
        'type': 'point',
        title: friend.name + '\'s destination',
        annotationImage: {
          url: 'http://www.xn--9dbccjlkfq.com/route-planner-widget/img/destination-icon.png',
          height: 25,
          width: 25
        },
        id: id + 'dest'
      });

      if (!this.state.boundSet) {
        this.setVisibleCoordinateBoundsAnimated(mapRef, lat, long, myLat, myLong, 50, 50, 50, 50);
        this.state.boundSet = true;
      }
    });

     this.socket.on('remove destination', (id) => {
      this.removeAnnotation(mapRef, id + 'dest');
    });

    /*
     * When a friend logs off, remove the friend from this user's list of connected users.
     */
     this.socket.on('logoff', (id) => {
      this.removeAnnotation(mapRef, id);
      this.removeAnnotation(mapRef, id + 'dest');
      connectedIDs.splice(connectedIDs.indexOf(id), 1);
    });

     this.socket.on('found location', (loc) => {
      console.log('This is the loc from website: ', loc);
      // loc comes in as [longitude, latitude] which is what the webapp version wants,
      // but the react native version wants the [latitude, longitude], so we flip them.
      var locFlip = [loc[1], loc[0]];
      this.setVisibleCoordinateBoundsAnimated(mapRef, locFlip[0], locFlip[1], this.state.currentLoc.latitude, this.state.currentLoc.longitude, 100, 0, 0, 0);
      // fetch(`https://api.mapbox.com/v4/directions/mapbox.driving/${this.state.currentLoc.longitude},${this.state.currentLoc.latitude};${loc[0]},${loc[1]}.json?access_token=${loc[2]}`,
      //   {method: 'get'})
      //   .then((res) => {console.log(res)});
    });
   },
  /*
   * Determines if a user and a friends' location intersect. If so,
   * notifies the friend that the user is within the vicinity.
   * @params: myCoordinates - {longitude, latitude} of the user
   *          friendCoordinates - {longitude, latitude} of friend
   *          friendID - id of the friend
   *          socket - socket used to communicate to notification
   *          option.distance - distance between coordinates
   *          option.unit - unit of measurement for distance
   */
   checkProximityToFriend: function(myCoordinates, friendCoordinates, myID, friendID, socket, option) {
    if (this.atSameLocation(myCoordinates, friendCoordinates, option)) {
      // push notification that my location is near my friend
      // get phone number for user and friend. Send notification to friend
      // prevent message from being sent continually
      this.debouncedSendNotification(socket, myID, friendID);
    }
  },
  sendShowLocation() {
    this.setState({showLocation: !this.state.showLocation});
    console.log('sending showLocation to DB:', this.state.showLocation);
    var user = this.props.userInfo;
    console.log('user is:', user);
    api.updateUserData(user, 'showLocation', ''+this.state.showLocation);
  },
  /* Send a message to the server to send a SMS notification */
  sendUserSMSNotification(socket, myID, friendID) {
    api.getUserData(myID)
      .then(function(sender) {
        var senderNumber = sender.phone;
        api.getUserData(friendID)
          .then(function(friend) {
            var friendNumber = friend.phone;
            socket.emit('notification', {
              senderID: myID,
              recipientID: friendID,
              recipientNumber: senderNumber,
              senderNumber: friendNumber,
              message: friend.name + ' has just arrived in your area.'
            });
          })
          .catch((err) => {
            console.log(err);
          })
      })
      .catch((err) => console.log(err));
  },
  render: function() {
    StatusBar.setHidden(true);
    return (
      <View style={styles.main}>
      <Mapbox
      style={styles.container}
      direction={0}
      rotateEnabled={true}
      scrollEnabled={true}
      zoomEnabled={true}
      showsUserLocation={true}
      ref={mapRef}
      accessToken={'pk.eyJ1IjoiaW5qZXllbyIsImEiOiJHYUJMWGV3In0.-9Wcu6yJNQmem2IXWaRuIg'}
      styleURL={this.mapStyles.emerald}
      userTrackingMode={this.userTrackingMode.none}
      centerCoordinate={this.state.center}
      zoomLevel={this.state.zoom}
      onRegionChange={this.onRegionChange}
      onRegionWillChange={this.onRegionWillChange}
      annotations={this.state.annotations}
      onOpenAnnotation={this.onOpenAnnotation}
      onRightAnnotationTapped={this.onRightAnnotationTapped}
      onUpdateUserLocation={this.onUpdateUserLocation}
      onLongPress={this.onLongPress}
      onTap={this.onTap} />
      <Text style={styles.overlayText}>Share Location</Text>
      <Switch
      onValueChange={() => this.sendShowLocation()}
      style={styles.overlayLocationSwitch}
      value={this.state.showLocation}
      onTintColor="black"
      thumbTintColor="white"
      tintColor="white" />
      <TouchableHighlight onPress={() => this.setCenterCoordinateAnimated(mapRef, this.state.currentLoc.latitude, this.state.currentLoc.longitude)}style={styles.compassContainer}>
      <Image style={styles.compass} source={require('../Images/compass.png')} />
      </TouchableHighlight>
      </View>
      );
  }
});

var width = Dimensions.get('window').width;
var styles = StyleSheet.create({
  button: {
    width: 150,
    height: 200,
    backgroundColor: '#DDD'
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    marginTop: -10,
    alignSelf: 'stretch',
    width: width
  },
  main: {
    flex: 1,
    alignItems: 'stretch',
    marginTop: 50
  },
  overlayLocationSwitch: {
   flex: 1,
   position: 'absolute',
   top: 18,
   left: 305,
   opacity: 0.5,
   width: width,
   height: 45
 },
 overlayText: {
  position: 'absolute',
  width: 355,
  height: 45,
  top: 10,
  left: 10,
  opacity: 0.8,
  fontSize: 20,
  padding: 8,
  textAlign: 'center',
  backgroundColor: '#498183',
  borderRadius: 8,
  color: 'white',
  fontWeight: 'bold'
},
compassContainer: {
  position: 'absolute',
  bottom: 55,
  right: 7,
  backgroundColor: '#498183',
  height: 45,
  width: 45,
  borderRadius: 5,
  borderColor: '#333',
  borderWidth: 1
},
compass: {
  height: 35,
  width: 35,
  position: 'relative',
  top: 5,
  left: 4,
  backgroundColor: 'transparent'
}
});

module.exports = MapboxMap;
